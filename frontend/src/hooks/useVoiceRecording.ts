'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface UseVoiceRecordingReturn {
  isRecording: boolean;
  isPaused: boolean;
  audioBlob: Blob | null;
  audioUrl: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  requestPermission: () => Promise<void>;
  error: string | null;
  hasPermission: boolean;
  audioChunks: Blob[];
  audioStream: MediaStream | null;
}

export const useVoiceRecording = (): UseVoiceRecordingReturn => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // Check microphone permission on mount
  const checkPermission = useCallback(async () => {
    try {
      console.log('Checking microphone permission...');
      console.log('navigator.mediaDevices:', !!navigator.mediaDevices);
      console.log('getUserMedia available:', !!navigator.mediaDevices?.getUserMedia);
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Microphone access not supported in this browser');
        return false;
      }

      // Try to query permission status (may not work in all browsers)
      try {
        const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        console.log('Microphone permission status:', permissionStatus.state);
        
        if (permissionStatus.state === 'granted') {
          setHasPermission(true);
          return true;
        } else if (permissionStatus.state === 'denied') {
          setError('Microphone access denied. Please enable microphone permissions in your browser settings.');
          setHasPermission(false);
          return false;
        }
      } catch (permErr) {
        console.log('Permission query not supported, will request on user action:', permErr);
      }
      
      return false;
    } catch (err) {
      console.log('Permission check failed:', err);
      return false;
    }
  }, []);

  // Check permission on mount
  useEffect(() => {
    checkPermission();
  }, [checkPermission]);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      console.log('Starting recording...');
      
      // Check if we already have permission
      if (!hasPermission) {
        console.log('Requesting microphone permission...');
      }
      
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000, // Optimal for speech recognition
        } 
      });
      
      console.log('Microphone access granted, stream created:', stream);
      streamRef.current = stream;
      setAudioStream(stream);
      setHasPermission(true);

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          setAudioChunks(prev => [...prev, event.data]);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        setAudioUrl(URL.createObjectURL(audioBlob));
        
        // Clean up stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        setAudioStream(null);
      };

      mediaRecorder.start(1000); // Collect data every second for real-time processing
      setIsRecording(true);
      setIsPaused(false);

    } catch (err) {
      console.error('Error starting recording:', err);
      
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError('Microphone access denied. Please allow microphone access and try again.');
        } else if (err.name === 'NotFoundError') {
          setError('No microphone found. Please connect a microphone and try again.');
        } else if (err.name === 'NotSupportedError') {
          setError('Microphone recording not supported in this browser.');
        } else {
          setError(`Failed to start recording: ${err.message}`);
        }
      } else {
        setError('Failed to start recording. Please check microphone permissions.');
      }
      
      setHasPermission(false);
    }
  }, [hasPermission]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
    }
  }, [isRecording]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
    }
  }, [isRecording, isPaused]);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording && isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
    }
  }, [isRecording, isPaused]);

  const requestPermission = useCallback(async () => {
    try {
      setError(null);
      console.log('Manually requesting microphone permission...');
      console.log('Browser supports getUserMedia:', !!navigator.mediaDevices?.getUserMedia);
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        } 
      });
      
      console.log('Permission granted, stream created:', stream);
      console.log('Audio tracks:', stream.getAudioTracks());
      
      // Stop the test stream immediately
      stream.getTracks().forEach(track => {
        console.log('Stopping track:', track.label);
        track.stop();
      });
      setHasPermission(true);
      
    } catch (err) {
      console.error('Error requesting permission:', err);
      console.error('Error details:', {
        name: err instanceof Error ? err.name : 'Unknown',
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : 'No stack trace'
      });
      
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError('Microphone access denied. Please allow microphone access and try again.');
        } else if (err.name === 'NotFoundError') {
          setError('No microphone found. Please connect a microphone and try again.');
        } else if (err.name === 'NotSupportedError') {
          setError('Microphone recording not supported in this browser.');
        } else {
          setError(`Failed to get microphone permission: ${err.message}`);
        }
      } else {
        setError('Failed to get microphone permission.');
      }
      
      setHasPermission(false);
    }
  }, []);

  return {
    isRecording,
    isPaused,
    audioBlob,
    audioUrl,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    requestPermission,
    error,
    hasPermission,
    audioChunks,
    audioStream
  };
};
