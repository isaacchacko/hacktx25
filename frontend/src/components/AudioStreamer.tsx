'use client';

import React, { useState, useRef, useEffect } from 'react';

interface AudioStreamerProps {
  socket: any;
  joinCode: string;
  isActive: boolean;
  onError?: (error: string) => void;
}

const AudioStreamer: React.FC<AudioStreamerProps> = ({
  socket,
  joinCode,
  isActive,
  onError
}) => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isActive && !isStreaming) {
      startAudioStreaming();
    } else if (!isActive && isStreaming) {
      stopAudioStreaming();
    }

    return () => {
      stopAudioStreaming();
    };
  }, [isActive]);

  const startAudioStreaming = async () => {
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      audioStreamRef.current = stream;

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorderRef.current = mediaRecorder;

      // Handle data available
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && socket) {
          // Convert blob to base64
          const reader = new FileReader();
          reader.onload = () => {
            const base64Audio = (reader.result as string).split(',')[1];
            console.log('🎤 Sending audio data:', {
              joinCode,
              audioDataLength: base64Audio?.length || 0,
              deviceType: 'computer'
            });
            socket.emit('audio-data', {
              joinCode,
              audioData: base64Audio,
              deviceType: 'computer'
            });
          };
          reader.readAsDataURL(event.data);
        }
      };

      // Start recording with small chunks for real-time streaming
      mediaRecorder.start(1000); // 1 second chunks
      setIsStreaming(true);
      setError(null);

      console.log('🎤 Audio streaming started');

    } catch (error) {
      console.error('Error starting audio streaming:', error);
      setError('Failed to access microphone');
      onError?.('Failed to access microphone');
    }
  };

  const stopAudioStreaming = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    setIsStreaming(false);
    console.log('🎤 Audio streaming stopped');
  };

  if (!isActive) {
    return null;
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${isStreaming ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
        <span className="text-sm text-blue-700">
          {isStreaming ? '🎤 Recording audio...' : '🎤 Audio ready'}
        </span>
      </div>
      {error && (
        <div className="text-red-600 text-sm mt-1">
          Error: {error}
        </div>
      )}
    </div>
  );
};

export default AudioStreamer;
