'use client';

import { useState, useRef, useCallback } from 'react';

interface TranscriptionResult {
  text: string;
  confidence: number;
  timestamp: number;
}

interface UseAssemblyAITranscriptionReturn {
  isTranscribing: boolean;
  transcription: string;
  transcriptionHistory: TranscriptionResult[];
  startTranscription: (audioStream: MediaStream) => Promise<void>;
  stopTranscription: () => void;
  error: string | null;
}

export const useAssemblyAITranscription = (): UseAssemblyAITranscriptionReturn => {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [transcriptionHistory, setTranscriptionHistory] = useState<TranscriptionResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const websocketRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  const startTranscription = useCallback(async (audioStream: MediaStream) => {
    try {
      setError(null);
      setIsTranscribing(true);
      
      // Note: AssemblyAI WebSocket streaming requires client-side API key
      // This is acceptable as it's a streaming service, not a one-time API call
      const apiKey = process.env.NEXT_PUBLIC_ASSEMBLY_API_KEY;
      if (!apiKey) {
        throw new Error('AssemblyAI API key not found. Please add NEXT_PUBLIC_ASSEMBLY_API_KEY to your environment.');
      }

      console.log('Starting AssemblyAI transcription with API key:', apiKey ? 'Present' : 'Missing');
      
      // Test basic WebSocket connectivity first
      console.log('Testing WebSocket connectivity...');
      
      // Create WebSocket connection to AssemblyAI with configuration in URL
      const wsUrl = `wss://streaming.assemblyai.com/v3/ws?token=${apiKey}&sample_rate=16000&encoding=pcm_s16le`;
      console.log('Connecting to:', wsUrl.replace(apiKey, '[API_KEY]'));
      const ws = new WebSocket(wsUrl);

      websocketRef.current = ws;

      ws.onopen = () => {
        console.log('Connected to AssemblyAI WebSocket');
        console.log('Ready to send audio data...');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('AssemblyAI message:', data);
          
          if (data.error === "Not authorized") {
            console.error('AssemblyAI authentication failed. Check your API key.');
            setError('AssemblyAI authentication failed. Please check your API key.');
            setIsTranscribing(false);
            return;
          }
          
          if (data.type === 'SessionBegins') {
            sessionIdRef.current = data.session_id;
            console.log('AssemblyAI session started:', data.session_id);
          } else if (data.type === 'Turn') {
            // Handle Turn messages from AssemblyAI v3
            if (data.end_of_turn) {
              // Final transcript
              const result: TranscriptionResult = {
                text: data.transcript || '',
                confidence: data.end_of_turn_confidence || 0.8,
                timestamp: Date.now()
              };
              
              setTranscriptionHistory(prev => [...prev, result]);
              setTranscription(''); // Clear partial transcription
              console.log('Final transcript added:', result.text);
            } else {
              // Partial transcript
              setTranscription(data.transcript || '');
              console.log('Partial transcript:', data.transcript);
            }
          }
        } catch (parseError) {
          console.error('Error parsing AssemblyAI message:', parseError);
        }
      };

      ws.onerror = (error) => {
        console.error('AssemblyAI WebSocket error:', error);
        console.error('WebSocket readyState:', ws.readyState);
        console.error('WebSocket URL attempted:', wsUrl.replace(apiKey, '[API_KEY]'));
        setError('Failed to connect to AssemblyAI transcription service. Check your API key and network connection.');
        setIsTranscribing(false);
      };

      ws.onclose = (event) => {
        console.log('AssemblyAI WebSocket connection closed:', event.code, event.reason);
        console.log('Close code:', event.code, 'Reason:', event.reason);
        setIsTranscribing(false);
      };

      // Set up audio processing
      audioContextRef.current = new AudioContext();
      console.log('AudioContext sample rate:', audioContextRef.current.sampleRate);
      
      const source = audioContextRef.current.createMediaStreamSource(audioStream);
      
      // Create a script processor to convert audio to PCM
      processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);
      
      processorRef.current.onaudioprocess = (event) => {
        if (ws.readyState === WebSocket.OPEN) {
          const inputData = event.inputBuffer.getChannelData(0);
          
          // Resample to 16kHz if needed
          const targetSampleRate = 16000;
          const sourceSampleRate = audioContextRef.current?.sampleRate || 44100;
          
          let pcmData;
          if (sourceSampleRate === targetSampleRate) {
            // No resampling needed
            pcmData = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) {
              pcmData[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
            }
          } else {
            // Simple resampling (linear interpolation)
            const ratio = sourceSampleRate / targetSampleRate;
            const targetLength = Math.floor(inputData.length / ratio);
            pcmData = new Int16Array(targetLength);
            
            for (let i = 0; i < targetLength; i++) {
              const sourceIndex = i * ratio;
              const index = Math.floor(sourceIndex);
              const fraction = sourceIndex - index;
              
              let sample;
              if (index + 1 < inputData.length) {
                // Linear interpolation
                sample = inputData[index] * (1 - fraction) + inputData[index + 1] * fraction;
              } else {
                sample = inputData[index];
              }
              
              pcmData[i] = Math.max(-32768, Math.min(32767, sample * 32768));
            }
          }
          
          ws.send(pcmData);
        }
      };
      
      source.connect(processorRef.current);
      processorRef.current.connect(audioContextRef.current.destination);

      console.log("AssemblyAI transcription started successfully");

    } catch (err) {
      console.error('Error starting AssemblyAI transcription:', err);
      setError(`Failed to start transcription: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setIsTranscribing(false);
    }
  }, []);

  const stopTranscription = useCallback(() => {
    console.log('Stopping AssemblyAI transcription...');
    
    if (websocketRef.current) {
      websocketRef.current.close();
      websocketRef.current = null;
    }
    
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    setIsTranscribing(false);
  }, []);

  return {
    isTranscribing,
    transcription,
    transcriptionHistory,
    startTranscription,
    stopTranscription,
    error
  };
};
