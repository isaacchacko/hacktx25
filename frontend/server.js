// frontend/server.js
const next = require('next');
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const axios = require('axios');
const admin = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');

// Next app bootstrap
const dev = process.env.NODE_ENV !== 'production';
const nextApp = next({ dev });
const handle = nextApp.getRequestHandler();

function decodeJwtPayload(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = Buffer.from(base64, 'base64').toString('utf8');
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

async function bootstrap() {
  await nextApp.prepare();

  const app = express();
  const server = createServer(app);

  // CORS configuration - restrict to Railway domain
  const allowedOrigin = process.env.FRONTEND_URL || '*';
  app.use(cors({ origin: allowedOrigin }));

  // Firebase Admin init (server-side only)
  const serviceAccount = {
    type: 'service_account',
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    token_uri: 'https://oauth2.googleapis.com/token',
    auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
    client_x509_cert_url: process.env.FIREBASE_CLIENT_EMAIL
      ? `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`
      : undefined
  };

  if (process.env.FIREBASE_PROJECT_ID) {
    try {
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
      console.log('Firebase Admin initialized');
    } catch (e) {
      console.log('Firebase Admin init skipped:', e?.message || e);
    }
  } else {
    console.log('Firebase Admin not initialized - mock auth mode');
  }

  // PDF proxy endpoint (same-origin)
  app.get('/api/pdf-proxy', async (req, res) => {
    try {
      const url = req.query.url;
      if (!url) {
        return res.status(400).json({ error: 'PDF URL is required' });
      }

      const response = await axios.get(url, {
        responseType: 'stream',
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PDF-Proxy/1.0)' }
      });

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'public, max-age=3600'
      });

      response.data.pipe(res);
    } catch (error) {
      console.error('Error proxying PDF:', error?.message || error);
      res.status(500).json({ error: 'Failed to load PDF' });
    }
  });

  // Attach Socket.IO to this HTTP server
  const io = new Server(server, {
    cors: { origin: allowedOrigin, methods: ['GET', 'POST'] }
  });

  // In-memory stores (migrated from backend)
  const rooms = new Map();
  const userSessions = new Map();

  async function verifyFirebaseToken(token) {
    try {
      if (!admin.apps.length) {
        // Mock decode
        const payload = decodeJwtPayload(token);
        if (payload?.email) {
          return {
            uid: payload.sub || payload.user_id || `mock-user-${Date.now()}`,
            email: payload.email,
            name: payload.name || payload.email.split('@')[0]
          };
        }
        const crypto = require('crypto');
        const tokenHash = crypto.createHash('md5').update(token).digest('hex').slice(0, 12);
        return { uid: `mock-user-${tokenHash}`, email: 'mock@example.com', name: 'Mock User' };
      }
      const decodedToken = await admin.auth().verifyIdToken(token);
      return decodedToken;
    } catch (error) {
      // Fallback: best-effort decode
      const payload = decodeJwtPayload(token);
      if (payload?.email) {
        return {
          uid: payload.sub || payload.user_id || `fallback-${Date.now()}`,
          email: payload.email,
          name: payload.name || payload.email.split('@')[0]
        };
      }
      return null;
    }
  }

  // Optional: backend helper to call Next API (kept and gated by FRONTEND_URL)
  async function analyzeQuestionInsights(joinCode, questions, pdfText, totalPages, summary) {
    const frontendBase =
      process.env.FRONTEND_URL || `http://127.0.0.1:${process.env.PORT || 3000}`;
    const aiInsightsUrl = `${frontendBase}/api/ai-insights`;

    const response = await axios.post(
      aiInsightsUrl,
      { questions, pdfText, totalPages, overallSummary: summary },
      { timeout: 30000, headers: { 'Content-Type': 'application/json' } }
    );
    if (response.data?.success) return response.data;
    throw new Error(response.data?.error || 'AI insights analysis failed');
  }

  // Socket handlers (migrated from backend/server.js)
  io.on('connection', (socket) => {
    console.log('New connection:', socket.id);

    socket.on('authenticate', async ({ token } = {}) => {
      if (!token) {
        const anonymousId = `anonymous-${socket.id}`;
        socket.userId = anonymousId;
        socket.userEmail = 'anonymous@example.com';
        socket.userToken = null;
        socket.isAnonymous = true;

        userSessions.set(anonymousId, {
          userId: anonymousId,
          email: 'anonymous@example.com',
          createdAt: new Date(),
          rooms: new Set(),
          lastSeen: new Date(),
          isAnonymous: true
        });

        socket.emit('authenticated', {
          userId: anonymousId,
          email: 'anonymous@example.com',
          message: 'Anonymous authentication successful',
          isAnonymous: true
        });
        return;
      }

      const decoded = await verifyFirebaseToken(token);
      if (!decoded) {
        socket.emit('error', 'Invalid token');
        return;
      }

      const userId = decoded.uid;
      const userEmail = decoded.email;

      if (userSessions.has(userId)) {
        const userData = userSessions.get(userId);
        socket.userId = userId;
        socket.userEmail = userEmail;
        socket.userToken = token;
        socket.isAnonymous = false;
      } else {
        socket.userId = userId;
        socket.userEmail = userEmail;
        socket.userToken = token;
        socket.isAnonymous = false;

        userSessions.set(userId, {
          userId,
          email: userEmail,
          createdAt: new Date(),
          rooms: new Set(),
          lastSeen: new Date(),
          isAnonymous: false
        });
      }

      const userData = userSessions.get(userId);
      if (userData) userData.lastSeen = new Date();

      socket.emit('authenticated', {
        userId,
        email: userEmail,
        message: 'Authentication successful',
        isAnonymous: false
      });
    });

    socket.on('create-room', () => {
      if (!socket.userId) return socket.emit('error', 'User not authenticated');
      if (socket.isAnonymous) {
        return socket.emit('error', 'Anonymous users cannot create rooms. Please sign in.');
      }

      const joinCode = uuidv4().slice(0, 8);
      rooms.set(joinCode, {
        members: new Set(),
        createdAt: new Date(),
        questions: [],
        presenterId: socket.userId,
        presenterEmail: socket.userEmail,
        liveTranscription: '',
        transcriptionHistory: [],
        transcriptionsByPage: {}
      });

      socket.join(joinCode);
      const room = rooms.get(joinCode);
      room.members.add(socket.userId);

      const userData = userSessions.get(socket.userId);
      if (userData) userData.rooms.add(joinCode);

      socket.emit('room-created', { joinCode, message: `Room ${joinCode} created successfully` });

      const joinedRoomData = {
        joinCode,
        memberCount: room.members.size,
        message: `Successfully joined room ${joinCode}`,
        isPresenter: true,
        questions: room.questions || [],
        pdfText: room.pdfText || '',
        totalPages: room.totalPages || 0
      };
      socket.emit('joined-room', joinedRoomData);
    });

    socket.on('create-room-with-pdf', (data) => {
      if (!socket.userId) return socket.emit('error', 'User not authenticated');
      if (socket.isAnonymous) {
        return socket.emit('error', 'Anonymous users cannot create rooms. Please sign in.');
      }

      const { pdfUrl, summary, pageTexts } = data || {};
      if (!pdfUrl) return socket.emit('error', 'PDF URL is required');

      const joinCode = uuidv4().slice(0, 8);
      rooms.set(joinCode, {
        members: new Set(),
        createdAt: new Date(),
        questions: [],
        presenterId: socket.userId,
        presenterEmail: socket.userEmail,
        pdfUrl,
        summary: summary || '',
        pageTexts: pageTexts || [],
        currentPage: 1,
        liveTranscription: '',
        transcriptionHistory: [],
        transcriptionsByPage: {}
      });

      socket.join(joinCode);
      const room = rooms.get(joinCode);
      room.members.add(socket.userId);
      const userData = userSessions.get(socket.userId);
      if (userData) userData.rooms.add(joinCode);

      socket.emit('room-created', {
        joinCode,
        message: `Room ${joinCode} created successfully with PDF`,
        pdfUrl,
        summary: summary || '',
        pageTexts: pageTexts || []
      });

      const joinedRoomData = {
        joinCode,
        memberCount: room.members.size,
        message: `Successfully joined room ${joinCode}`,
        isPresenter: true,
        pdfUrl,
        summary: summary || '',
        pageTexts: pageTexts || [],
        currentPage: room.currentPage || 1,
        questions: room.questions || [],
        pdfText: room.pdfText || '',
        totalPages: room.totalPages || 0
      };
      socket.emit('joined-room', joinedRoomData);
    });

    socket.on('join-room', (joinCode) => {
      if (!joinCode) return socket.emit('error', 'Join code is required');
      if (!rooms.has(joinCode)) return socket.emit('error', 'Room not found');

      socket.rooms.forEach((room) => {
        if (room !== socket.id) socket.leave(room);
      });

      socket.join(joinCode);

      const room = rooms.get(joinCode);
      if (room.members.has(socket.userId)) room.members.delete(socket.userId);
      room.members.add(socket.userId);

      const joinedRoomData = {
        joinCode,
        memberCount: room.members.size,
        message: `Successfully joined room ${joinCode}`,
        isPresenter: room.presenterId === socket.userId,
        pdfUrl: room.pdfUrl || null,
        summary: room.summary || '',
        pageTexts: room.pageTexts || [],
        currentPage: room.currentPage || 1,
        questions: room.questions || [],
        pdfText: room.pdfText || '',
        totalPages: room.totalPages || 0
      };
      socket.emit('joined-room', joinedRoomData);

      if (room.liveTranscription || (room.transcriptionHistory && room.transcriptionHistory.length > 0)) {
        socket.emit('transcription-update', {
          joinCode,
          transcription: room.liveTranscription || '',
          history: room.transcriptionHistory || [],
          currentPage: room.currentPage || 1,
          transcriptionsByPage: room.transcriptionsByPage || {}
        });
      }

      socket.to(joinCode).emit('user-joined', {
        userId: socket.userId,
        memberCount: room.members.size,
        message: `New user joined room ${joinCode}`
      });
    });

    socket.on('post-question', (data) => {
      if (!socket.userId) return socket.emit('error', 'User not authenticated');
      const { question, joinCode } = data || {};
      if (!question || !joinCode) return socket.emit('error', 'Question and join code are required');
      if (!rooms.has(joinCode)) return socket.emit('error', 'Room not found');

      const room = rooms.get(joinCode);
      const newQuestion = {
        id: uuidv4(),
        text: String(question || '').trim(),
        authorId: socket.userId,
        authorEmail: socket.userEmail,
        authorSocketId: socket.id,
        upvotes: 0,
        downvotes: 0,
        votes: {},
        createdAt: new Date().toISOString(),
        answered: false
      };
      room.questions.push(newQuestion);
      io.to(joinCode).emit('new-question', newQuestion);
    });

    socket.on('vote-question', ({ questionId, voteType, joinCode } = {}) => {
      if (!questionId || !voteType || !joinCode) {
        return socket.emit('error', 'Question ID, vote type, and join code are required');
      }
      if (!rooms.has(joinCode)) return socket.emit('error', 'Room not found');

      const room = rooms.get(joinCode);
      const question = room.questions.find((q) => q.id === questionId);
      if (!question) return socket.emit('error', 'Question not found');

      const currentVote = question.votes[socket.userId] || null;
      if (currentVote === 'upvote') question.upvotes--;
      else if (currentVote === 'downvote') question.downvotes--;

      if (voteType === 'upvote') {
        question.upvotes++;
        question.votes[socket.userId] = 'upvote';
      } else if (voteType === 'downvote') {
        question.downvotes++;
        question.votes[socket.userId] = 'downvote';
      } else if (voteType === 'remove') {
        delete question.votes[socket.userId];
      } else {
        return socket.emit('error', 'Invalid vote type');
      }

      io.to(joinCode).emit('question-updated', question);
    });

    socket.on('get-questions', (joinCode) => {
      if (!joinCode) return socket.emit('error', 'Join code is required');
      if (!rooms.has(joinCode)) return socket.emit('error', 'Room not found');
      const room = rooms.get(joinCode);
      socket.emit('questions-list', room.questions);
    });

    socket.on('mark-answered', ({ questionId, joinCode } = {}) => {
      if (!questionId || !joinCode) return socket.emit('error', 'Question ID and join code are required');
      if (!rooms.has(joinCode)) return socket.emit('error', 'Room not found');
      const room = rooms.get(joinCode);
      if (room.presenterId !== socket.userId) {
        return socket.emit('error', 'Only the presenter can mark questions as answered');
      }
      const question = room.questions.find((q) => q.id === questionId);
      if (!question) return socket.emit('error', 'Question not found');
      question.answered = !question.answered;
      io.to(joinCode).emit('question-updated', question);
    });

    socket.on('transcription-update', (data = {}) => {
      const { joinCode, transcription, history, currentPage, transcriptionsByPage } = data;
      if (!joinCode) return socket.emit('error', 'Join code is required');
      if (!rooms.has(joinCode)) return socket.emit('error', 'Room not found');

      const room = rooms.get(joinCode);
      room.liveTranscription = transcription || '';
      room.transcriptionHistory = history || [];
      room.transcriptionsByPage = transcriptionsByPage || {};

      io.to(joinCode).emit('transcription-update', {
        joinCode,
        transcription: transcription || '',
        history: history || [],
        currentPage,
        transcriptionsByPage: transcriptionsByPage || {}
      });
    });

    socket.on('pdf-page-change', ({ page, joinCode } = {}) => {
      if (!page || !joinCode) return socket.emit('error', 'Page number and join code are required');
      if (!rooms.has(joinCode)) return socket.emit('error', 'Room not found');

      const room = rooms.get(joinCode);
      if (room.presenterId !== socket.userId) {
        return socket.emit('error', 'Only the presenter can change PDF pages');
      }
      room.currentPage = page;
      io.to(joinCode).emit('pdf-page-updated', { joinCode, currentPage: page, updatedBy: socket.userId });
    });

    socket.on('disconnect', () => {
      socket.rooms.forEach((room) => {
        if (room !== socket.id && rooms.has(room)) {
          const roomData = rooms.get(room);
          if (socket.userId) roomData.members.delete(socket.userId);
          if (roomData.members.size === 0) {
            rooms.delete(room);
          } else {
            socket.to(room).emit('user-left', {
              userId: socket.userId || socket.id,
              memberCount: roomData.members.size,
              message: `User left room ${room}`
            });
          }
        }
      });
    });
  });

  // Let Next handle everything else
  app.all('*', (req, res) => handle(req, res));

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on ${PORT}`);
  });
}

bootstrap().catch((e) => {
  console.error('Fatal server error:', e);
  process.exit(1);
});
