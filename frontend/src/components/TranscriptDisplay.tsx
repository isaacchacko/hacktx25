'use client';

import React, { useState, useEffect, useRef } from 'react';
import { TranscriptEntry } from '../services/audioRecorderService';

interface TranscriptDisplayProps {
  transcript: TranscriptEntry[];
  isActive: boolean;
  delay?: number;
  currentSlide?: number;
  onToggleCaptions?: (enabled: boolean) => void;
  className?: string;
}

const TranscriptDisplay: React.FC<TranscriptDisplayProps> = ({
  transcript,
  isActive,
  delay = 0,
  currentSlide = 1,
  onToggleCaptions,
  className = ''
}) => {
  const [captionsEnabled, setCaptionsEnabled] = useState(true);
  const [showDelayWarning, setShowDelayWarning] = useState(false);
  const transcriptEndRef = useRef<HTMLDivElement>(null);


  // Auto-scroll to bottom when new transcript entries arrive
  useEffect(() => {
    if (transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcript]);

  // Monitor delay and show warning if it's too high
  useEffect(() => {
    const delayThreshold = 5000; // 5 seconds
    setShowDelayWarning(delay > delayThreshold);
  }, [delay]);

  const handleToggleCaptions = () => {
    const newState = !captionsEnabled;
    setCaptionsEnabled(newState);
    onToggleCaptions?.(newState);
  };

  const formatTimestamp = (timestamp: Date | string): string => {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceText = (confidence: number): string => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    return 'Low';
  };

  return (
    <div className={`bg-white rounded-lg shadow-md ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-gray-800">Live Transcript</h3>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
            <span className="text-sm text-gray-600">
              {isActive ? 'Live' : 'Inactive'}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Delay Warning */}
          {showDelayWarning && (
            <div className="flex items-center gap-2 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
              <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
              Delay: {Math.round(delay / 1000)}s
            </div>
          )}
          
          {/* Captions Toggle */}
          <button
            onClick={handleToggleCaptions}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              captionsEnabled
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {captionsEnabled ? '📺 Captions On' : '📺 Captions Off'}
          </button>
        </div>
      </div>

      {/* Transcript Content */}
      <div className="p-4">
        {!isActive && transcript.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">🎤</div>
            <p>Waiting for presenter to start transcription...</p>
          </div>
        ) : !captionsEnabled ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">📺</div>
            <p>Captions are disabled</p>
            <p className="text-sm mt-2">Click "Captions On" to view the transcript</p>
          </div>
        ) : transcript.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">⏳</div>
            <p>Transcription is active but no content yet...</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {transcript.map((entry, index) => (
              <div
                key={entry.id}
                className={`p-3 rounded-lg border ${
                  entry.slideNumber === currentSlide
                    ? 'bg-blue-50 border-blue-200'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="text-gray-800 leading-relaxed">
                      {entry.text}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <span className={`text-xs px-2 py-1 rounded ${getConfidenceColor(entry.confidence)}`}>
                      {getConfidenceText(entry.confidence)}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center gap-3">
                    <span>Slide {entry.slideNumber}</span>
                    <span>{formatTimestamp(entry.timestamp)}</span>
                  </div>
                  <span className="text-gray-400">
                    {Math.round(entry.confidence * 100)}% confidence
                  </span>
                </div>
              </div>
            ))}
            <div ref={transcriptEndRef} />
          </div>
        )}
      </div>

      {/* Footer with current slide info */}
      {isActive && (
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-sm text-gray-600">
          <div className="flex items-center justify-between">
            <span>Current slide: {currentSlide}</span>
            <span>{transcript.length} entries</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default TranscriptDisplay;
