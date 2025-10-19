'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface TranscriptionResult {
  text: string;
  confidence: number;
  timestamp: number;
}

interface UseMockTranscriptionReturn {
  isTranscribing: boolean;
  transcription: string;
  transcriptionHistory: TranscriptionResult[];
  startTranscription: () => void;
  stopTranscription: () => void;
  error: string | null;
}

export const useMockTranscription = (): UseMockTranscriptionReturn => {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [transcriptionHistory, setTranscriptionHistory] = useState<TranscriptionResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const wordIndexRef = useRef(0);

  const mockWords = [
    "Welcome", "to", "our", "presentation", "today", "we", "will", "be", "discussing",
    "the", "latest", "developments", "in", "technology", "and", "how", "they", "impact",
    "our", "daily", "lives", "let", "me", "start", "by", "showing", "you", "some",
    "interesting", "statistics", "about", "user", "engagement", "and", "productivity"
  ];

  const startTranscription = useCallback(() => {
    console.log('Starting mock transcription...');
    setIsTranscribing(true);
    setError(null);
    setTranscription('');
    wordIndexRef.current = 0;

    // Simulate real-time transcription by adding words gradually
    intervalRef.current = setInterval(() => {
      if (wordIndexRef.current < mockWords.length) {
        const currentWord = mockWords[wordIndexRef.current];
        setTranscription(prev => prev + (prev ? ' ' : '') + currentWord);
        wordIndexRef.current++;
      } else {
        // Complete the current sentence and add to history
        const finalText = transcription + (transcription ? ' ' : '') + mockWords[wordIndexRef.current - 1];
        const result: TranscriptionResult = {
          text: finalText,
          confidence: Math.random() * 0.3 + 0.7, // Random confidence between 0.7-1.0
          timestamp: Date.now()
        };
        
        setTranscriptionHistory(prev => [...prev, result]);
        setTranscription('');
        wordIndexRef.current = 0;
      }
    }, 800); // Add a word every 800ms
  }, [transcription]);

  const stopTranscription = useCallback(() => {
    console.log('Stopping mock transcription...');
    setIsTranscribing(false);
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Add any remaining transcription to history
    if (transcription.trim()) {
      const result: TranscriptionResult = {
        text: transcription.trim(),
        confidence: Math.random() * 0.3 + 0.7,
        timestamp: Date.now()
      };
      
      setTranscriptionHistory(prev => [...prev, result]);
      setTranscription('');
    }
  }, [transcription]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
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
