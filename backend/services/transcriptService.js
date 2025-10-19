const AssemblyAI = require('assemblyai');
const WebSocket = require('ws');

class TranscriptService {
  constructor() {
    this.client = null; // Initialize client lazily
    this.activeTranscriptions = new Map(); // roomId -> transcription session
    this.transcriptData = new Map(); // roomId -> transcript history
  }

  /**
   * Initialize the Assembly AI client if not already done
   */
  initializeClient() {
    if (!this.client) {
      this.client = new AssemblyAI({
        apiKey: process.env.ASSEMBLYAI_API_KEY || 'your-api-key-here'
      });
    }
    return this.client;
  }

  /**
   * Start a new transcription session for a room
   * @param {string} roomId - The room identifier
   * @param {string} userId - The presenter's user ID
   * @param {string} deviceType - 'computer' or 'phone'
   * @returns {Promise<Object>} - Transcription session info
   */
  async startTranscription(roomId, userId, deviceType = 'computer') {
    try {
      // Check if Assembly AI API key is configured
      if (!process.env.ASSEMBLYAI_API_KEY || process.env.ASSEMBLYAI_API_KEY === 'your-api-key-here') {
        console.log('⚠️ Assembly AI API key not configured, using simulation mode');
        return this.startSimulatedTranscription(roomId, userId, deviceType);
      }

      // Initialize client and create a real Assembly AI streaming session
      const client = this.initializeClient();
      const session = await client.realtime.createService({
        sample_rate: 16000,
        word_boost: ['presentation', 'slide', 'question', 'answer'],
        encoding: 'pcm_s16le'
      });

      console.log('🔗 Connecting to Assembly AI...');
      try {
        // Get the connection URL
        const connectionUrl = session.connectionUrl();
        console.log('Connection URL:', connectionUrl);
        
        // Try to connect with a shorter timeout
        await Promise.race([
          session.connect(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Connection timeout')), 5000)
          )
        ]);
        console.log('✅ Connected to Assembly AI successfully');
      } catch (error) {
        console.error('❌ Failed to connect to Assembly AI:', error);
        // Fall back to simulation mode if connection fails
        console.log('⚠️ Falling back to simulation mode due to connection failure');
        return this.startSimulatedTranscription(roomId, userId, deviceType);
      }

      // Store session info
      const sessionData = {
        session,
        roomId,
        userId,
        deviceType,
        startTime: new Date(),
        isActive: true,
        transcript: [],
        currentSlide: 1,
        slideTranscripts: new Map() // slide number -> transcript segments
      };

      this.activeTranscriptions.set(roomId, sessionData);
      this.transcriptData.set(roomId, []);

      // Set up real Assembly AI event handlers
      session.on('transcript', (data) => {
        this.handleTranscript(roomId, data);
      });

      session.on('error', (error) => {
        console.error(`Assembly AI transcription error for room ${roomId}:`, error);
        this.handleTranscriptionError(roomId, error);
      });

      session.on('close', () => {
        console.log(`Assembly AI session closed for room ${roomId}`);
        this.endTranscription(roomId);
      });

      return {
        success: true,
        sessionId: session.id,
        roomId,
        deviceType,
        message: 'Real-time transcription started with Assembly AI'
      };

    } catch (error) {
      console.error('Error starting transcription:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Handle incoming transcript data
   * @param {string} roomId - The room identifier
   * @param {Object} data - Transcript data from AssemblyAI
   */
  handleTranscript(roomId, data) {
    const sessionData = this.activeTranscriptions.get(roomId);
    if (!sessionData) {
      return;
    }

    const transcriptEntry = {
      id: this.generateId(),
      text: data.text,
      confidence: data.confidence,
      timestamp: new Date().toISOString(), // Send as ISO string for better compatibility
      slideNumber: sessionData.currentSlide,
      wordTimings: data.words || []
    };

    // Add to transcript history
    sessionData.transcript.push(transcriptEntry);
    
    // Add to slide-specific transcript
    if (!sessionData.slideTranscripts.has(sessionData.currentSlide)) {
      sessionData.slideTranscripts.set(sessionData.currentSlide, []);
    }
    sessionData.slideTranscripts.get(sessionData.currentSlide).push(transcriptEntry);

    // Store in global transcript data
    const roomTranscripts = this.transcriptData.get(roomId) || [];
    roomTranscripts.push(transcriptEntry);
    this.transcriptData.set(roomId, roomTranscripts);

    // Emit to all clients in the room via Socket.IO
    console.log('📤 Emitting transcript update:', transcriptEntry);
    this.emitTranscriptUpdate(roomId, transcriptEntry);
  }

  /**
   * Update the current slide for transcript association
   * @param {string} roomId - The room identifier
   * @param {number} slideNumber - The current slide number
   */
  updateCurrentSlide(roomId, slideNumber) {
    const sessionData = this.activeTranscriptions.get(roomId);
    if (sessionData) {
      sessionData.currentSlide = slideNumber;
      console.log(`Updated current slide to ${slideNumber} for room ${roomId}`);
    }
  }

  /**
   * Simulate transcript updates for testing
   * @param {string} roomId - The room identifier
   */
  simulateTranscriptUpdates(roomId) {
    console.log('🎭 Starting simulation for room:', roomId);
    const sessionData = this.activeTranscriptions.get(roomId);
    if (!sessionData) {
      console.log('❌ No session data found for simulation');
      return;
    }
    console.log('✅ Session data found, starting simulation interval');

    const sampleTranscripts = [
      "Welcome to today's presentation.",
      "Let's start with the first slide.",
      "This shows our quarterly results.",
      "As you can see, we've made significant progress.",
      "Any questions so far?",
      "Let's move to the next slide.",
      "This demonstrates our market position.",
      "We're seeing strong growth in this area.",
      "Thank you for your attention."
    ];

    let index = 0;
    const interval = setInterval(() => {
      console.log('🎭 Simulation interval tick:', { index, isActive: sessionData.isActive, totalTranscripts: sampleTranscripts.length });
      if (!sessionData.isActive || index >= sampleTranscripts.length) {
        console.log('🎭 Stopping simulation:', { isActive: sessionData.isActive, index, totalTranscripts: sampleTranscripts.length });
        clearInterval(interval);
        return;
      }

      const transcriptEntry = {
        id: this.generateId(),
        text: sampleTranscripts[index],
        confidence: 0.85 + Math.random() * 0.1, // Random confidence between 0.85-0.95
        timestamp: new Date().toISOString(), // Send as ISO string for better compatibility
        slideNumber: sessionData.currentSlide,
        wordTimings: []
      };

      this.handleTranscript(roomId, transcriptEntry);
      index++;
    }, 3000); // Add a new transcript entry every 3 seconds
  }

  /**
   * Start simulated transcription (fallback when Assembly AI is not configured)
   * @param {string} roomId - The room identifier
   * @param {string} userId - The presenter's user ID
   * @param {string} deviceType - 'computer' or 'phone'
   * @returns {Promise<Object>} - Transcription session info
   */
  async startSimulatedTranscription(roomId, userId, deviceType = 'computer') {
    const session = {
      id: `sim-session-${roomId}-${Date.now()}`,
      roomId,
      userId,
      deviceType,
      isActive: true,
      startTime: new Date()
    };

    // Store session info
    const sessionData = {
      session,
      roomId,
      userId,
      deviceType,
      startTime: new Date(),
      isActive: true,
      transcript: [],
      currentSlide: 1,
      slideTranscripts: new Map(),
      isSimulation: true  // Mark this as a simulation session
    };

    this.activeTranscriptions.set(roomId, sessionData);
    this.transcriptData.set(roomId, []);

    // Start simulation
    this.simulateTranscriptUpdates(roomId);

    return {
      success: true,
      sessionId: session.id,
      roomId,
      deviceType,
      message: 'Simulated transcription started (Assembly AI not configured)'
    };
  }

  /**
   * End transcription for a room
   * @param {string} roomId - The room identifier
   */
  async endTranscription(roomId) {
    const sessionData = this.activeTranscriptions.get(roomId);
    if (sessionData) {
      try {
        // Close Assembly AI session if it exists
        if (sessionData.session && typeof sessionData.session.close === 'function') {
          await sessionData.session.close();
        }
        
        sessionData.isActive = false;
        sessionData.endTime = new Date();
        
        console.log(`Transcription ended for room ${roomId}`);
        
        // Emit end event to clients
        this.emitTranscriptionEnd(roomId);
        
      } catch (error) {
        console.error(`Error ending transcription for room ${roomId}:`, error);
      }
    }
  }

  /**
   * Get transcript data for a room
   * @param {string} roomId - The room identifier
   * @param {number} slideNumber - Optional slide number filter
   * @returns {Array} - Transcript entries
   */
  getTranscript(roomId, slideNumber = null) {
    const transcripts = this.transcriptData.get(roomId) || [];
    
    if (slideNumber !== null) {
      return transcripts.filter(entry => entry.slideNumber === slideNumber);
    }
    
    return transcripts;
  }

  /**
   * Get slide-specific transcripts
   * @param {string} roomId - The room identifier
   * @returns {Map} - Map of slide number to transcript segments
   */
  getSlideTranscripts(roomId) {
    const sessionData = this.activeTranscriptions.get(roomId);
    return sessionData ? sessionData.slideTranscripts : new Map();
  }

  /**
   * Check if transcription is active for a room
   * @param {string} roomId - The room identifier
   * @returns {boolean} - Whether transcription is active
   */
  isTranscriptionActive(roomId) {
    const sessionData = this.activeTranscriptions.get(roomId);
    return sessionData ? sessionData.isActive : false;
  }

  /**
   * Get transcription session info
   * @param {string} roomId - The room identifier
   * @returns {Object|null} - Session information
   */
  getSessionInfo(roomId) {
    const sessionData = this.activeTranscriptions.get(roomId);
    if (!sessionData) return null;

    return {
      roomId: sessionData.roomId,
      userId: sessionData.userId,
      deviceType: sessionData.deviceType,
      isActive: sessionData.isActive,
      startTime: sessionData.startTime,
      endTime: sessionData.endTime,
      currentSlide: sessionData.currentSlide,
      transcriptCount: sessionData.transcript.length
    };
  }

  /**
   * Emit transcript update to Socket.IO clients
   * @param {string} roomId - The room identifier
   * @param {Object} transcriptEntry - The transcript entry
   */
  emitTranscriptUpdate(roomId, transcriptEntry) {
    // This will be called by the main server to emit to clients
    console.log('📡 emitTranscriptUpdate called:', { roomId, hasIO: !!this.io });
    if (this.io) {
      console.log('📡 Emitting to room:', roomId);
      
      // Get room info for debugging
      const room = this.io.sockets.adapter.rooms.get(roomId);
      console.log('📡 Room membership:', { 
        roomId, 
        memberCount: room ? room.size : 0,
        members: room ? Array.from(room) : []
      });
      
      this.io.to(roomId).emit('transcript-update', {
        roomId,
        transcript: transcriptEntry,
        timestamp: new Date().toISOString()
      });
      
      console.log('📡 Transcript event emitted successfully');
    } else {
      console.log('❌ No Socket.IO instance available');
    }
  }

  /**
   * Emit transcription end event
   * @param {string} roomId - The room identifier
   */
  emitTranscriptionEnd(roomId) {
    if (this.io) {
      this.io.to(roomId).emit('transcription-ended', {
        roomId,
        timestamp: new Date()
      });
    }
  }

  /**
   * Handle transcription errors
   * @param {string} roomId - The room identifier
   * @param {Error} error - The error object
   */
  handleTranscriptionError(roomId, error) {
    if (this.io) {
      this.io.to(roomId).emit('transcription-error', {
        roomId,
        error: error.message,
        timestamp: new Date()
      });
    }
  }

  /**
   * Set Socket.IO instance for emitting events
   * @param {Object} io - Socket.IO instance
   */
  setSocketIO(io) {
    this.io = io;
  }

  /**
   * Generate unique ID for transcript entries
   * @returns {string} - Unique identifier
   */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Process audio data from frontend
   * @param {string} roomId - The room identifier
   * @param {string} audioData - Base64 encoded audio data
   */
  processAudioData(roomId, audioData) {
    console.log('🎤 processAudioData called:', {
      roomId,
      audioDataLength: audioData?.length || 0,
      hasSession: this.activeTranscriptions.has(roomId)
    });
    
    const sessionData = this.activeTranscriptions.get(roomId);
    if (!sessionData || !sessionData.session) {
      console.log('❌ No active session for room:', roomId);
      return;
    }

    try {
      // Convert base64 to buffer
      const audioBuffer = Buffer.from(audioData, 'base64');
      console.log('🎤 Converted audio buffer size:', audioBuffer.length);
      
      // Check if this is a simulation session or real Assembly AI session
      if (sessionData.isSimulation) {
        console.log('🎭 Processing audio in simulation mode');
        // In simulation mode, we don't need to send audio anywhere
        // The simulation will generate fake transcripts automatically
        return;
      }
      
      // Send to Assembly AI if it's a real session
      if (sessionData.session && typeof sessionData.session.sendAudio === 'function') {
        console.log('✅ Sending audio to Assembly AI');
        sessionData.session.sendAudio(audioBuffer);
      } else {
        console.log('❌ Session does not have sendAudio method - this might be a simulation session');
      }
    } catch (error) {
      console.error(`Error processing audio data for room ${roomId}:`, error);
    }
  }

  /**
   * Calculate transcription delay
   * @param {string} roomId - The room identifier
   * @returns {number} - Delay in milliseconds
   */
  getTranscriptionDelay(roomId) {
    const sessionData = this.activeTranscriptions.get(roomId);
    if (!sessionData || !sessionData.transcript.length) return 0;

    const latestTranscript = sessionData.transcript[sessionData.transcript.length - 1];
    const now = new Date();
    const transcriptTime = new Date(latestTranscript.timestamp);
    return now.getTime() - transcriptTime.getTime();
  }
}

module.exports = TranscriptService;
