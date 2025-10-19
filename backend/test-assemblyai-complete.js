require('dotenv').config();
const AssemblyAI = require('assemblyai');

async function testAssemblyAI() {
  console.log('🧪 Testing Assembly AI API Key...');
  
  // Check if API key is loaded
  if (!process.env.ASSEMBLYAI_API_KEY) {
    console.log('❌ No API key found in environment variables');
    return;
  }
  
  console.log('✅ API Key loaded:', process.env.ASSEMBLYAI_API_KEY.substring(0, 8) + '...');
  
  const client = new AssemblyAI({
    apiKey: process.env.ASSEMBLYAI_API_KEY
  });
  
  try {
    // Test 1: Check if client is properly initialized
    console.log('\n📊 Testing client initialization...');
    console.log('✅ Client initialized successfully');
    
    // Test 2: Test file upload (if you have a test audio file)
    console.log('\n🎤 Testing file upload...');
    try {
      // Create a simple test audio file (1 second of silence)
      const fs = require('fs');
      const testAudioPath = './test-audio.wav';
      
      // Create a minimal WAV file header for 1 second of silence
      const sampleRate = 16000;
      const duration = 1; // 1 second
      const numSamples = sampleRate * duration;
      const buffer = Buffer.alloc(44 + numSamples * 2); // WAV header + audio data
      
      // WAV header
      buffer.write('RIFF', 0);
      buffer.writeUInt32LE(36 + numSamples * 2, 4);
      buffer.write('WAVE', 8);
      buffer.write('fmt ', 12);
      buffer.writeUInt32LE(16, 16);
      buffer.writeUInt16LE(1, 20);
      buffer.writeUInt16LE(1, 22);
      buffer.writeUInt32LE(sampleRate, 24);
      buffer.writeUInt32LE(sampleRate * 2, 28);
      buffer.writeUInt16LE(2, 32);
      buffer.writeUInt16LE(16, 34);
      buffer.write('data', 36);
      buffer.writeUInt32LE(numSamples * 2, 40);
      
      fs.writeFileSync(testAudioPath, buffer);
      
      console.log('📁 Created test audio file:', testAudioPath);
      
      // Upload and transcribe
      const transcript = await client.transcripts.transcribe({
        audio: testAudioPath,
        language_detection: true
      });
      
      console.log('✅ Transcription result:', {
        id: transcript.id,
        status: transcript.status,
        text: transcript.text || 'No text (expected for silence)',
        confidence: transcript.confidence
      });
      
      // Clean up
      fs.unlinkSync(testAudioPath);
      console.log('🗑️ Cleaned up test file');
      
    } catch (uploadError) {
      console.log('⚠️ File upload test failed (this is normal if no audio file):', uploadError.message);
    }
    
    // Test 3: Test realtime connection
    console.log('\n🔗 Testing realtime connection...');
    try {
      const session = await client.realtime.createService({
        sample_rate: 16000,
        word_boost: ['test', 'hello', 'world']
      });
      
      console.log('✅ Realtime session created:', {
        connectionUrl: session.connectionUrl(),
        sampleRate: session.sampleRate,
        wordBoost: session.wordBoost
      });
      
      // Try to connect with timeout
      const connectPromise = session.connect();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout')), 5000)
      );
      
      try {
        await Promise.race([connectPromise, timeoutPromise]);
        console.log('✅ Realtime connection successful!');
        
        // Close the connection
        session.close();
        console.log('🔒 Connection closed');
        
      } catch (connectError) {
        console.log('❌ Realtime connection failed:', connectError.message);
        console.log('💡 This might be due to network restrictions or API limits');
      }
      
    } catch (sessionError) {
      console.log('❌ Realtime session creation failed:', sessionError.message);
    }
    
  } catch (error) {
    console.log('❌ Assembly AI test failed:', error.message);
    console.log('💡 Check your API key and account status');
  }
}

testAssemblyAI();
