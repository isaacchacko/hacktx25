'use client';

import { useState, useEffect, useCallback } from 'react';
import { TranscriptEntry } from '../services/audioRecorderService';

interface TranscriptionSession {
  isActive: boolean;
  deviceType: 'computer' | 'phone';
  startTime?: Date;
  endTime?: Date;
  transcript: TranscriptEntry[];
  currentSlide: number;
}

interface UseTranscriptOptions {
  joinCode: string;
  isPresenter: boolean;
  socket?: any; // Socket.IO instance
}

interface UseTranscriptReturn {
  // State
  transcript: TranscriptEntry[];
  isTranscribing: boolean;
  currentSlide: number;
  delay: number;
  sessionInfo: TranscriptionSession | null;
  error: string | null;
  
  // Actions
  startTranscription: (deviceType: 'computer' | 'phone') => Promise<void>;
  stopTranscription: () => Promise<void>;
  updateSlide: (slideNumber: number) => void;
  getTranscriptForSlide: (slideNumber: number) => TranscriptEntry[];
  downloadTranscript: () => void;
  
  // Status
  isLoading: boolean;
}

export const useTranscript = ({ joinCode, isPresenter, socket }: UseTranscriptOptions): UseTranscriptReturn => {
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(1);
  const [delay, setDelay] = useState(0);
  const [sessionInfo, setSessionInfo] = useState<TranscriptionSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Socket event handlers
  const handleTranscriptUpdate = useCallback((data: any) => {
    console.log('📥 Frontend received transcript update:', data);
    const { transcript: newEntry } = data;
    
    // Ensure timestamp is properly converted to Date
    const processedEntry = {
      ...newEntry,
      timestamp: newEntry.timestamp instanceof Date ? newEntry.timestamp : new Date(newEntry.timestamp)
    };
    
    console.log('📝 Processed transcript entry:', processedEntry);
    setTranscript(prev => [...prev, processedEntry]);
    
    // Update delay calculation
    const now = new Date();
    const transcriptTime = processedEntry.timestamp instanceof Date ? processedEntry.timestamp : new Date(processedEntry.timestamp);
    setDelay(now.getTime() - transcriptTime.getTime());
  }, []);

  const handleTranscriptionStatus = useCallback((data: any) => {
    setIsTranscribing(data.isActive);
    if (data.isActive) {
      setSessionInfo(prev => ({
        ...prev,
        isActive: true,
        deviceType: data.deviceType,
        startTime: new Date()
      }));
    } else {
      setSessionInfo(prev => ({
        ...prev,
        isActive: false,
        endTime: new Date()
      }));
    }
  }, []);

  const handleSlideUpdate = useCallback((data: any) => {
    setCurrentSlide(data.slideNumber);
  }, []);

  const handleTranscriptionError = useCallback((data: any) => {
    setError(data.error);
    setIsTranscribing(false);
  }, []);

  const handleTranscriptionEnded = useCallback((data: any) => {
    setIsTranscribing(false);
    setSessionInfo(prev => ({
      ...prev,
      isActive: false,
      endTime: new Date()
    }));
  }, []);

  const handleTranscriptData = useCallback((data: any) => {
    setTranscript(data.transcript || []);
    setSessionInfo(data.sessionInfo);
  }, []);

  const handleTranscriptionStatusResponse = useCallback((data: any) => {
    setIsTranscribing(data.isActive);
    setSessionInfo(data.sessionInfo);
    setDelay(data.delay || 0);
  }, []);

  // Set up socket event listeners
  useEffect(() => {
    if (!socket) {
      console.log('❌ No socket available for transcript events');
      return;
    }

    console.log('🔌 Setting up transcript event listeners');
    socket.on('transcript-update', handleTranscriptUpdate);
    socket.on('transcription-status', handleTranscriptionStatus);
    socket.on('slide-updated', handleSlideUpdate);
    socket.on('transcription-error', handleTranscriptionError);
    socket.on('transcription-ended', handleTranscriptionEnded);
    socket.on('transcript-data', handleTranscriptData);
    socket.on('transcription-status-response', handleTranscriptionStatusResponse);
    socket.on('error', (errorMessage: string) => {
      setError(errorMessage);
    });

    // Request current transcription status
    socket.emit('get-transcription-status', { joinCode });

    return () => {
      socket.off('transcript-update', handleTranscriptUpdate);
      socket.off('transcription-status', handleTranscriptionStatus);
      socket.off('slide-updated', handleSlideUpdate);
      socket.off('transcription-error', handleTranscriptionError);
      socket.off('transcription-ended', handleTranscriptionEnded);
      socket.off('transcript-data', handleTranscriptData);
      socket.off('transcription-status-response', handleTranscriptionStatusResponse);
      socket.off('error');
    };
  }, [socket, joinCode, handleTranscriptUpdate, handleTranscriptionStatus, handleSlideUpdate, handleTranscriptionError, handleTranscriptionEnded, handleTranscriptData, handleTranscriptionStatusResponse]);

  // Actions
  const startTranscription = useCallback(async (deviceType: 'computer' | 'phone') => {
    if (!socket || !isPresenter) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      socket.emit('start-transcription', { joinCode, deviceType });
    } catch (error) {
      setError('Failed to start transcription');
      console.error('Error starting transcription:', error);
    } finally {
      setIsLoading(false);
    }
  }, [socket, joinCode, isPresenter]);

  const stopTranscription = useCallback(async () => {
    if (!socket || !isPresenter) return;

    setIsLoading(true);
    setError(null);

    try {
      socket.emit('stop-transcription', { joinCode });
    } catch (error) {
      setError('Failed to stop transcription');
      console.error('Error stopping transcription:', error);
    } finally {
      setIsLoading(false);
    }
  }, [socket, joinCode, isPresenter]);

  const updateSlide = useCallback((slideNumber: number) => {
    if (!socket || !isPresenter) return;

    try {
      socket.emit('slide-changed', { joinCode, slideNumber });
      setCurrentSlide(slideNumber);
    } catch (error) {
      setError('Failed to update slide');
      console.error('Error updating slide:', error);
    }
  }, [socket, joinCode, isPresenter]);

  const getTranscriptForSlide = useCallback((slideNumber: number): TranscriptEntry[] => {
    return transcript.filter(entry => entry.slideNumber === slideNumber);
  }, [transcript]);

  const downloadTranscript = useCallback(() => {
    if (transcript.length === 0) {
      setError('No transcript data to download');
      return;
    }

    try {
      // Create a formatted transcript
      const formattedTranscript = transcript.map(entry => ({
        text: entry.text,
        slide: entry.slideNumber,
        timestamp: entry.timestamp.toISOString(),
        confidence: entry.confidence
      }));

      // Create downloadable content
      const content = JSON.stringify(formattedTranscript, null, 2);
      const blob = new Blob([content], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      // Create download link
      const link = document.createElement('a');
      link.href = url;
      link.download = `transcript-${joinCode}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      console.log('Transcript downloaded successfully');
    } catch (error) {
      setError('Failed to download transcript');
      console.error('Error downloading transcript:', error);
    }
  }, [transcript, joinCode]);

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  return {
    // State
    transcript,
    isTranscribing,
    currentSlide,
    delay,
    sessionInfo,
    error,
    
    // Actions
    startTranscription,
    stopTranscription,
    updateSlide,
    getTranscriptForSlide,
    downloadTranscript,
    
    // Status
    isLoading
  };
};

export default useTranscript;
