
const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");
const admin = require("firebase-admin");

const app = express();
const server = createServer(app);

// Initialize Firebase Admin SDK
// You'll need to replace this with your actual service account key
const serviceAccount = {
  // Add your Firebase service account configuration here
  // You can get this from Firebase Console > Project Settings > Service Accounts
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`
};

if (process.env.FIREBASE_PROJECT_ID) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} else {
  console.log("Firebase Admin SDK not initialized - using mock authentication");
}

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

// Store user sessions and their associated data
const userSessions = new Map();

// Helper function to verify Firebase token
async function verifyFirebaseToken(token) {
  try {
    if (!admin.apps.length) {
        // Firebase Admin SDK not initialized, use mock verification
        console.log('Firebase Admin SDK not initialized - using mock authentication');
        console.log('Token received:', token.substring(0, 20) + '...');
        // Create a more unique mock user ID based on the entire token hash
        const crypto = require('crypto');
        const tokenHash = crypto.createHash('md5').update(token).digest('hex').slice(0, 12);
        const mockUserId = `mock-user-${tokenHash}`;
        console.log('Generated mock user ID:', mockUserId);
        return { 
          uid: mockUserId, 
          email: 'mock@example.com',
          name: 'Mock User'
        };
    }
    
    const decodedToken = await admin.auth().verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    console.error('Error verifying Firebase token:', error);
    return null;
  }
}

io.on("connection", (socket) => {
  console.log("New connection:", socket.id);
  
  // Authenticate with Firebase token (optional for anonymous users)
  socket.on("authenticate", async (data) => {
    const { token } = data;
    
    if (!token) {
      // Anonymous user - create a temporary session
      const anonymousId = `anonymous-${socket.id}`;
      socket.userId = anonymousId;
      socket.userEmail = 'anonymous@example.com';
      socket.userToken = null;
      socket.isAnonymous = true;
      
      // Store anonymous user data
      userSessions.set(anonymousId, {
        userId: anonymousId,
        email: 'anonymous@example.com',
        createdAt: new Date(),
        rooms: new Set(),
        lastSeen: new Date(),
        isAnonymous: true
      });
      
      console.log(`Anonymous user connected: ${anonymousId}`);
      
      // Send authentication success for anonymous user
      socket.emit("authenticated", { 
        userId: anonymousId,
        email: 'anonymous@example.com',
        message: "Anonymous authentication successful",
        isAnonymous: true
      });
      return;
    }
    
    // Verify Firebase token
    const decodedToken = await verifyFirebaseToken(token);
    
    if (!decodedToken) {
      socket.emit("error", "Invalid token");
      return;
    }
    
    const userId = decodedToken.uid;
    const userEmail = decodedToken.email;
    
    // Check if user already has a session
    if (userSessions.has(userId)) {
      // Existing user - restore their data
      const userData = userSessions.get(userId);
      socket.userId = userId;
      socket.userEmail = userEmail;
      socket.userToken = token;
      socket.isAnonymous = false;
      
      console.log(`User reconnected: ${userEmail} (${userId})`);
    } else {
      // New user - create new session
      socket.userId = userId;
      socket.userEmail = userEmail;
      socket.userToken = token;
      socket.isAnonymous = false;
      
      // Store user data
      userSessions.set(userId, {
        userId: userId,
        email: userEmail,
        createdAt: new Date(),
        rooms: new Set(),
        lastSeen: new Date(),
        isAnonymous: false
      });
      
      console.log(`New user authenticated: ${userEmail} (${userId})`);
    }
    
    // Update last seen
    const userData = userSessions.get(userId);
    if (userData) {
      userData.lastSeen = new Date();
    }
    
    // Send authentication success
    socket.emit("authenticated", { 
      userId: userId,
      email: userEmail,
      message: "Authentication successful",
      isAnonymous: false
    });
  });

  // Handle creating a new room
  socket.on("create-room", () => {
    if (!socket.userId) {
      socket.emit("error", "User not authenticated");
      return;
    }
    
    if (socket.isAnonymous) {
      socket.emit("error", "Anonymous users cannot create rooms. Please sign in to create a room.");
      return;
    }
    
    const joinCode = uuidv4().slice(0, 8); // Generate 8-character room code
    
    // Create the room
    rooms.set(joinCode, {
      members: new Set(),
      createdAt: new Date(),
      questions: [],
      presenterId: socket.userId,
      presenterEmail: socket.userEmail
    });

    // Join the room
    socket.join(joinCode);
    const room = rooms.get(joinCode);
    room.members.add(socket.userId);
    
    // Update user's room list
    const userData = userSessions.get(socket.userId);
    if (userData) {
      userData.rooms.add(joinCode);
    }
    
    console.log(`Room ${joinCode} created by presenter ${socket.userEmail} (${socket.userId})`);
    console.log(`Room ${joinCode} now has ${room.members.size} members`);
    
    // Notify the creator
    socket.emit("room-created", {
      joinCode,
      message: `Room ${joinCode} created successfully`
    });

    // Also send joined-room event to set presenter status
    const joinedRoomData = {
      joinCode,
      memberCount: room.members.size,
      message: `Successfully joined room ${joinCode}`,
      isPresenter: true
    };
    console.log('Sending joined-room event with isPresenter:', joinedRoomData.isPresenter);
    socket.emit("joined-room", joinedRoomData);
  });

  // Handle joining a room
  socket.on("join-room", (joinCode) => {
    if (!joinCode) {
      socket.emit("error", "Join code is required");
      return;
    }

    // Check if room exists
    if (!rooms.has(joinCode)) {
      socket.emit("error", "Room not found");
      return;
    }

    // Leave any existing rooms
    socket.rooms.forEach(room => {
      if (room !== socket.id) {
        socket.leave(room);
      }
    });

    // Join the room
    socket.join(joinCode);
    
    // Add user to room
    const room = rooms.get(joinCode);
    
    // Remove user from room if they're already in it (to handle reconnections)
    if (room.members.has(socket.userId)) {
      room.members.delete(socket.userId);
    }
    
    room.members.add(socket.userId);
    
    console.log(`User ${socket.userId} (${socket.userEmail}) joined room ${joinCode}`);
    console.log(`Room ${joinCode} now has ${room.members.size} members`);

    // Notify the user they joined successfully
    const joinedRoomData = {
      joinCode,
      memberCount: room.members.size,
      message: `Successfully joined room ${joinCode}`,
      isPresenter: room.presenterId === socket.userId
    };
    console.log(`Room ${joinCode} presenterId:`, room.presenterId);
    console.log(`User ${socket.userId} isPresenter:`, joinedRoomData.isPresenter);
    socket.emit("joined-room", joinedRoomData);

    // Notify other members in the room
    socket.to(joinCode).emit("user-joined", {
      userId: socket.userId,
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
    if (room.presenterId !== socket.userId) {
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
