
const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");
const admin = require("firebase-admin");
const axios = require("axios");

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

// PDF proxy endpoint to bypass CORS issues
app.get('/api/pdf-proxy', async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'PDF URL is required' });
    }
    
    console.log('📄 Proxying PDF request for URL:', url);
    
    // Fetch the PDF from Firebase Storage
    const response = await axios.get(url, {
      responseType: 'stream',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PDF-Proxy/1.0)'
      }
    });
    
    // Set appropriate headers
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Cache-Control': 'public, max-age=3600'
    });
    
    // Pipe the PDF data to the response
    response.data.pipe(res);
    
  } catch (error) {
    console.error('❌ Error proxying PDF:', error.message);
    res.status(500).json({ error: 'Failed to load PDF' });
  }
});

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
        // Firebase Admin SDK not initialized, decode JWT token manually
        console.log('Firebase Admin SDK not initialized - decoding JWT token manually');
        console.log('Token received:', token.substring(0, 20) + '...');
        
        try {
          // Decode the JWT token without verification
          const base64Url = token.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          }).join(''));
          
          const payload = JSON.parse(jsonPayload);
          console.log('Extracted payload from token:', payload);
          
          if (payload.email) {
            console.log('Using email from token payload:', payload.email);
            return {
              uid: payload.sub || payload.user_id || `mock-user-${Date.now()}`,
              email: payload.email,
              name: payload.name || payload.email.split('@')[0]
            };
          } else {
            // Fallback if no email in token
            const crypto = require('crypto');
            const tokenHash = crypto.createHash('md5').update(token).digest('hex').slice(0, 12);
            const mockUserId = `mock-user-${tokenHash}`;
            console.log('No email in token, using mock user ID:', mockUserId);
            return { 
              uid: mockUserId, 
              email: 'mock@example.com',
              name: 'Mock User'
            };
          }
        } catch (decodeError) {
          console.error('Error decoding token payload:', decodeError);
          // Fallback to mock user if decoding fails
          const crypto = require('crypto');
          const tokenHash = crypto.createHash('md5').update(token).digest('hex').slice(0, 12);
          const mockUserId = `mock-user-${tokenHash}`;
          console.log('Token decode failed, using mock user ID:', mockUserId);
          return { 
            uid: mockUserId, 
            email: 'mock@example.com',
            name: 'Mock User'
          };
        }
    }
    
    const decodedToken = await admin.auth().verifyIdToken(token);
    console.log('Successfully verified Firebase token for user:', decodedToken.email);
    return decodedToken;
  } catch (error) {
    console.error('Error verifying Firebase token:', error);
    
    // Fallback: try to extract user info from the token without verification
    try {
      // Decode the JWT token without verification (for debugging/fallback)
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      
      const payload = JSON.parse(jsonPayload);
      console.log('Extracted payload from token:', payload);
      
      if (payload.email) {
        console.log('Using email from token payload:', payload.email);
        return {
          uid: payload.sub || payload.user_id || `fallback-${Date.now()}`,
          email: payload.email,
          name: payload.name || payload.email.split('@')[0]
        };
      }
    } catch (decodeError) {
      console.error('Error decoding token payload:', decodeError);
    }
    
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

  // Handle creating a new room with PDF
  socket.on("create-room-with-pdf", (data) => {
    console.log('🏠 Received create-room-with-pdf request:', data);
    
    if (!socket.userId) {
      socket.emit("error", "User not authenticated");
      return;
    }
    
    if (socket.isAnonymous) {
      socket.emit("error", "Anonymous users cannot create rooms. Please sign in to create a room.");
      return;
    }

    const { pdfUrl, summary, pageTexts } = data;
    if (!pdfUrl) {
      socket.emit("error", "PDF URL is required");
      return;
    }
    
    const joinCode = uuidv4().slice(0, 8); // Generate 8-character room code
    
    // Create the room with PDF data
    rooms.set(joinCode, {
      members: new Set(),
      createdAt: new Date(),
      questions: [],
      presenterId: socket.userId,
      presenterEmail: socket.userEmail,
      pdfUrl: pdfUrl, // Store PDF URL in room data
      summary: summary || '', // Store PDF summary in room data
      pageTexts: pageTexts || [], // Store PDF page texts in room data
      currentPage: 1 // Track current PDF page
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
    
    console.log(`Room ${joinCode} created by presenter ${socket.userEmail} (${socket.userId}) with PDF: ${pdfUrl}`);
    console.log(`Room ${joinCode} summary: ${summary ? 'Provided' : 'Not provided'}`);
    console.log(`Room ${joinCode} page texts: ${pageTexts ? `Provided (${pageTexts.length} pages)` : 'Not provided'}`);
    console.log(`Room ${joinCode} now has ${room.members.size} members`);
    
    // Notify the creator
    socket.emit("room-created", {
      joinCode,
      message: `Room ${joinCode} created successfully with PDF`,
      pdfUrl: pdfUrl,
      summary: summary || '',
      pageTexts: pageTexts || []
    });

    // Also send joined-room event to set presenter status
    const joinedRoomData = {
      joinCode,
      memberCount: room.members.size,
      message: `Successfully joined room ${joinCode}`,
      isPresenter: true,
      pdfUrl: pdfUrl,
      summary: summary || '',
      pageTexts: pageTexts || [],
      currentPage: room.currentPage || 1
    };
    console.log('Sending joined-room event with isPresenter, PDF URL, summary, and page texts:', joinedRoomData);
    socket.emit("joined-room", joinedRoomData);
  });

  // Handle joining a room
  socket.on("join-room", (joinCode) => {
    console.log(`User ${socket.userId} (${socket.userEmail}) attempting to join room: ${joinCode}`);
    console.log(`Available rooms:`, Array.from(rooms.keys()));
    
    if (!joinCode) {
      socket.emit("error", "Join code is required");
      return;
    }

    // Check if room exists
    if (!rooms.has(joinCode)) {
      console.log(`Room ${joinCode} not found. Available rooms:`, Array.from(rooms.keys()));
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
      isPresenter: room.presenterId === socket.userId,
      pdfUrl: room.pdfUrl || null, // Include PDF URL if room has one
      summary: room.summary || '', // Include PDF summary if room has one
      pageTexts: room.pageTexts || [], // Include PDF page texts if room has them
      currentPage: room.currentPage || 1 // Include current PDF page
    };
    console.log(`Room ${joinCode} presenterId:`, room.presenterId);
    console.log(`User ${socket.userId} isPresenter:`, joinedRoomData.isPresenter);
    console.log(`Room ${joinCode} has PDF URL:`, joinedRoomData.pdfUrl);
    console.log(`Room ${joinCode} has summary:`, joinedRoomData.summary ? 'Yes' : 'No');
    console.log(`Room ${joinCode} has page texts:`, joinedRoomData.pageTexts.length > 0 ? `Yes (${joinedRoomData.pageTexts.length} pages)` : 'No');
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
    console.log("🔍 Received post-question event:", data);
    console.log("🔍 Socket userId:", socket.userId);
    console.log("🔍 Socket userEmail:", socket.userEmail);
    
    // Check if user is authenticated
    if (!socket.userId) {
      console.log("❌ User not authenticated");
      socket.emit("error", "User not authenticated");
      return;
    }
    
    const { question, joinCode } = data;
    if (!question || !joinCode) {
      console.log("❌ Missing question or joinCode");
      socket.emit("error", "Question and join code are required");
      return;
    }

    if (!rooms.has(joinCode)) {
      console.log("❌ Room not found:", joinCode);
      socket.emit("error", "Room not found");
      return;
    }

    const room = rooms.get(joinCode);
    console.log("🔍 Room found, current questions count:", room.questions.length);
    
    const newQuestion = {
      id: uuidv4(),
      text: question.trim(),
      authorId: socket.userId,
      authorEmail: socket.userEmail,
      authorSocketId: socket.id,
      upvotes: 0,
      downvotes: 0,
      votes: {}, // Track individual votes: userId -> voteType ('upvote', 'downvote', or null)
      createdAt: new Date().toISOString(),
      answered: false
    };

    console.log("🔍 Created new question:", newQuestion);
    room.questions.push(newQuestion);
    console.log("🔍 Added question to room, new count:", room.questions.length);

    // Broadcast new question to all members in the room
    console.log("📤 Broadcasting new-question to room:", joinCode);
    io.to(joinCode).emit("new-question", newQuestion);
    console.log("✅ Question broadcasted successfully");
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
    const currentVote = question.votes[socket.userId] || null;
    
    // Remove current vote if it exists
    if (currentVote === "upvote") {
      question.upvotes--;
    } else if (currentVote === "downvote") {
      question.downvotes--;
    }
    
    // Add new vote if voteType is not "remove"
    if (voteType === "upvote") {
      question.upvotes++;
      question.votes[socket.userId] = "upvote";
    } else if (voteType === "downvote") {
      question.downvotes++;
      question.votes[socket.userId] = "downvote";
    } else if (voteType === "remove") {
      delete question.votes[socket.userId];
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

  // Handle PDF page changes (presenter only)
  socket.on("pdf-page-change", (data) => {
    const { page, joinCode } = data;
    if (!page || !joinCode) {
      socket.emit("error", "Page number and join code are required");
      return;
    }

    if (!rooms.has(joinCode)) {
      socket.emit("error", "Room not found");
      return;
    }

    const room = rooms.get(joinCode);
    
    // Check if user is the presenter
    if (room.presenterId !== socket.userId) {
      socket.emit("error", "Only the presenter can change PDF pages");
      return;
    }

    // Update the current page in the room
    room.currentPage = page;
    console.log(`📄 Presenter ${socket.userId} changed PDF page to ${page} in room ${joinCode}`);

    // Broadcast page change to all members in the room
    io.to(joinCode).emit("pdf-page-updated", {
      joinCode,
      currentPage: page,
      updatedBy: socket.userId
    });
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id, "userId:", socket.userId);
    
    // Remove user from all rooms
    socket.rooms.forEach(room => {
      if (room !== socket.id && rooms.has(room)) {
        const roomData = rooms.get(room);
        // Use socket.userId instead of socket.id for consistency
        if (socket.userId) {
          roomData.members.delete(socket.userId);
        }
        
        // Clean up empty rooms
        if (roomData.members.size === 0) {
          rooms.delete(room);
          console.log(`Room ${room} deleted (empty)`);
        } else {
          // Notify remaining members
          socket.to(room).emit("user-left", {
            userId: socket.userId || socket.id,
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
