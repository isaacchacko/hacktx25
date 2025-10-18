
const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");

const app = express();
const server = createServer(app);

// Enable CORS for all origins
app.use(cors());

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Store room information
const rooms = new Map();

// Store user tokens and their associated data
const userTokens = new Map();

io.on("connection", (socket) => {
  console.log("New connection:", socket.id);
  
  // Get or generate persistent user token
  socket.on("authenticate", (data) => {
    const { token } = data;
    
    if (token && userTokens.has(token)) {
      // Existing user - restore their data
      const userData = userTokens.get(token);
      socket.userId = userData.userId;
      socket.userToken = token;
      console.log(`User reconnected with token: ${token}`);
    } else {
      // New user - generate new token and data
      const newToken = uuidv4();
      const newUserId = uuidv4();
      socket.userId = newUserId;
      socket.userToken = newToken;
      
      // Store user data
      userTokens.set(newToken, {
        userId: newUserId,
        createdAt: new Date(),
        rooms: new Set()
      });
      
      console.log(`New user created with token: ${newToken}`);
    }
    
    // Send the token back to the client
    socket.emit("authenticated", { token: socket.userToken });
  });

  // Handle creating a new room
  socket.on("create-room", () => {
    if (!socket.userId) {
      socket.emit("error", "User not authenticated");
      return;
    }
    
    const joinCode = uuidv4().slice(0, 8); // Generate 8-character room code
    
    // Create the room
    rooms.set(joinCode, {
      members: new Set(),
      createdAt: new Date(),
      questions: [],
      presenterToken: socket.userToken,
      presenterId: socket.userId
    });

    // Join the room
    socket.join(joinCode);
    const room = rooms.get(joinCode);
    room.members.add(socket.id);
    
    // Update user's room list
    const userData = userTokens.get(socket.userToken);
    if (userData) {
      userData.rooms.add(joinCode);
    }
    
    console.log(`Room ${joinCode} created by presenter ${socket.userId} (token: ${socket.userToken})`);
    
    // Notify the creator
    socket.emit("room-created", {
      joinCode,
      message: `Room ${joinCode} created successfully`
    });
  });

  // Handle joining a room
  socket.on("join-room", (joinCode) => {
    if (!joinCode) {
      socket.emit("error", "Join code is required");
      return;
    }

    // Leave any existing rooms
    socket.rooms.forEach(room => {
      if (room !== socket.id) {
        socket.leave(room);
      }
    });

    // Join the new room
    socket.join(joinCode);
    
    // Initialize room if it doesn't exist
    if (!rooms.has(joinCode)) {
      rooms.set(joinCode, {
        members: new Set(),
        createdAt: new Date(),
        questions: [],
        presenterId: null
      });
    }

    // Add user to room
    const room = rooms.get(joinCode);
    room.members.add(socket.id);
    
    console.log(`User ${socket.id} joined room ${joinCode}`);
    console.log(`Room ${joinCode} now has ${room.members.size} members`);

    // Notify the user they joined successfully
    socket.emit("joined-room", {
      joinCode,
      memberCount: room.members.size,
      message: `Successfully joined room ${joinCode}`,
      isPresenter: room.presenterToken === socket.userToken
    });

    // Notify other members in the room
    socket.to(joinCode).emit("user-joined", {
      userId: socket.id,
      memberCount: room.members.size,
      message: `New user joined room ${joinCode}`
    });
  });


  // Handle posting a new question
  socket.on("post-question", (data) => {
    const { question, joinCode } = data;
    if (!question || !joinCode) {
      socket.emit("error", "Question and join code are required");
      return;
    }

    if (!rooms.has(joinCode)) {
      socket.emit("error", "Room not found");
      return;
    }

    const room = rooms.get(joinCode);
    const newQuestion = {
      id: uuidv4(),
      text: question.trim(),
      authorId: socket.userId,
      authorSocketId: socket.id,
      upvotes: 0,
      downvotes: 0,
      votes: new Map(), // Track individual votes: userId -> voteType ('upvote', 'downvote', or null)
      createdAt: new Date().toISOString(),
      answered: false
    };

    room.questions.push(newQuestion);

    // Broadcast new question to all members in the room
    io.to(joinCode).emit("new-question", newQuestion);
  });

  // Handle voting on questions
  socket.on("vote-question", (data) => {
    const { questionId, voteType, joinCode } = data;
    if (!questionId || !voteType || !joinCode) {
      socket.emit("error", "Question ID, vote type, and join code are required");
      return;
    }

    if (!rooms.has(joinCode)) {
      socket.emit("error", "Room not found");
      return;
    }

    const room = rooms.get(joinCode);
    const question = room.questions.find(q => q.id === questionId);
    
    if (!question) {
      socket.emit("error", "Question not found");
      return;
    }

    // Get current vote for this user
    const currentVote = question.votes.get(socket.userId) || null;
    
    // Remove current vote if it exists
    if (currentVote === "upvote") {
      question.upvotes--;
    } else if (currentVote === "downvote") {
      question.downvotes--;
    }
    
    // Add new vote if voteType is not "remove"
    if (voteType === "upvote") {
      question.upvotes++;
      question.votes.set(socket.userId, "upvote");
    } else if (voteType === "downvote") {
      question.downvotes++;
      question.votes.set(socket.userId, "downvote");
    } else if (voteType === "remove") {
      question.votes.delete(socket.userId);
    } else {
      socket.emit("error", "Invalid vote type");
      return;
    }

    // Broadcast updated question to all members in the room
    io.to(joinCode).emit("question-updated", question);
  });

  // Handle fetching existing questions
  socket.on("get-questions", (joinCode) => {
    if (!joinCode) {
      socket.emit("error", "Join code is required");
      return;
    }

    if (!rooms.has(joinCode)) {
      socket.emit("error", "Room not found");
      return;
    }

    const room = rooms.get(joinCode);
    socket.emit("questions-list", room.questions);
  });

  // Handle marking questions as answered (presenter only)
  socket.on("mark-answered", (data) => {
    const { questionId, joinCode } = data;
    if (!questionId || !joinCode) {
      socket.emit("error", "Question ID and join code are required");
      return;
    }

    if (!rooms.has(joinCode)) {
      socket.emit("error", "Room not found");
      return;
    }

    const room = rooms.get(joinCode);
    
    // Check if user is the presenter
    if (room.presenterToken !== socket.userToken) {
      socket.emit("error", "Only the presenter can mark questions as answered");
      return;
    }

    const question = room.questions.find(q => q.id === questionId);
    
    if (!question) {
      socket.emit("error", "Question not found");
      return;
    }

    question.answered = !question.answered; // Toggle answered status

    // Broadcast updated question to all members in the room
    io.to(joinCode).emit("question-updated", question);
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    
    // Remove user from all rooms
    socket.rooms.forEach(room => {
      if (room !== socket.id && rooms.has(room)) {
        const roomData = rooms.get(room);
        roomData.members.delete(socket.id);
        
        // Clean up empty rooms
        if (roomData.members.size === 0) {
          rooms.delete(room);
          console.log(`Room ${room} deleted (empty)`);
        } else {
          // Notify remaining members
          socket.to(room).emit("user-left", {
            userId: socket.id,
            memberCount: roomData.members.size,
            message: `User left room ${room}`
          });
        }
      }
    });
  });
});

const PORT = 3001;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Socket.IO server running on port ${PORT}`);
});
