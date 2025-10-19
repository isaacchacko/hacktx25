'use client';

import React, { useState } from 'react';
import { useVoiceRecording } from '../hooks/useVoiceRecording';
import { useAssemblyAITranscription } from '../hooks/useAssemblyAITranscription';

interface VoiceRecordingControlsProps {
  onTranscriptionUpdate: (transcription: string, history: Array<{
    text: string;
    confidence: number;
    timestamp: number;
  }>) => void;
  onRecordingStart?: () => void;
  onRecordingStop?: () => void;
}

export const VoiceRecordingControls: React.FC<VoiceRecordingControlsProps> = ({
  onTranscriptionUpdate,
  onRecordingStart,
  onRecordingStop
}) => {
  const [hasStartedTranscription, setHasStartedTranscription] = useState(false);

  const {
    isRecording,
    isPaused,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    requestPermission,
    error: recordingError,
    hasPermission,
    audioStream
  } = useVoiceRecording();

  const { isTranscribing, transcription, transcriptionHistory, startTranscription, stopTranscription, error: transcriptionError } = useAssemblyAITranscription();

  // Update parent component when transcription changes
  React.useEffect(() => {
    onTranscriptionUpdate(transcription, transcriptionHistory);
  }, [transcription, transcriptionHistory, onTranscriptionUpdate]);

  // Start transcription when audio stream becomes available
  React.useEffect(() => {
    if (isRecording && !isTranscribing && !hasStartedTranscription && audioStream) {
      console.log('Audio stream available, starting AssemblyAI transcription...');
      setHasStartedTranscription(true);
      startTranscription(audioStream).catch(error => {
        console.error('Failed to start AssemblyAI transcription:', error);
        setHasStartedTranscription(false);
      });
    }
  }, [isRecording, audioStream, isTranscribing, startTranscription, hasStartedTranscription]);

  const handleStartRecording = async () => {
    try {
      await startRecording();
      console.log('Recording started, transcription will start automatically when audio stream is ready...');
      // Notify parent that recording has started
      onRecordingStart?.();
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  const handleStopRecording = () => {
    stopRecording();
    stopTranscription();
    setHasStartedTranscription(false); // Reset the flag
    // Notify parent that recording has stopped
    onRecordingStop?.();
  };

  const handlePauseResume = () => {
    if (isPaused) {
      resumeRecording();
      // Resume transcription if it was paused
      if (!isTranscribing) {
        startTranscription();
      }
    } else {
      pauseRecording();
      // Pause transcription
      stopTranscription();
    }
  };

  const error = recordingError || transcriptionError;

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(147, 112, 219, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%)',
      backdropFilter: 'blur(15px)',
      borderRadius: '16px',
      padding: '20px',
      marginBottom: '24px',
      border: '1px solid rgba(147, 112, 219, 0.3)',
      boxShadow: '0 6px 24px rgba(0,0,0,0.3)'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '16px'
      }}>
        <h3 style={{
          fontSize: '18px',
          fontWeight: '600',
          color: 'white',
          margin: 0,
          textShadow: '0 2px 10px rgba(147, 112, 219, 0.6)'
        }}>
          🎤 Voice Recording
        </h3>
        
        {isRecording && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '4px 12px',
            borderRadius: '20px',
            background: 'rgba(220, 53, 69, 0.2)',
            border: '1px solid rgba(220, 53, 69, 0.3)'
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#dc3545',
              animation: 'pulse 1.5s ease-in-out infinite'
            }} />
            <span style={{
              fontSize: '12px',
              color: '#dc3545',
              fontWeight: '500'
            }}>
              {isPaused ? 'Paused' : 'Recording'}
            </span>
          </div>
        )}
        
        {isTranscribing && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '4px 12px',
            borderRadius: '20px',
            background: 'rgba(40, 167, 69, 0.2)',
            border: '1px solid rgba(40, 167, 69, 0.3)'
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#28a745',
              animation: 'pulse 1.5s ease-in-out infinite'
            }} />
            <span style={{
              fontSize: '12px',
              color: '#28a745',
              fontWeight: '500'
            }}>
              Transcribing
            </span>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div style={{
          background: 'rgba(220, 53, 69, 0.2)',
          border: '1px solid rgba(220, 53, 69, 0.4)',
          color: '#ff6b6b',
          padding: '12px',
          borderRadius: '8px',
          marginBottom: '16px',
          fontSize: '14px'
        }}>
          {error}
        </div>
      )}

      {/* Permission Notice */}
      {!hasPermission && !isRecording && (
        <div style={{
          background: 'rgba(255, 193, 7, 0.2)',
          border: '1px solid rgba(255, 193, 7, 0.4)',
          color: '#ffc107',
          padding: '12px',
          borderRadius: '8px',
          marginBottom: '16px',
          fontSize: '14px'
        }}>
          ⚠️ Microphone permission required for voice recording
          <button
            onClick={requestPermission}
            style={{
              marginLeft: '12px',
              padding: '6px 12px',
              background: 'rgba(255, 193, 7, 0.3)',
              border: '1px solid rgba(255, 193, 7, 0.6)',
              borderRadius: '6px',
              color: '#ffc107',
              fontSize: '12px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.3s'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'rgba(255, 193, 7, 0.5)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'rgba(255, 193, 7, 0.3)';
            }}
          >
            Grant Permission
          </button>
        </div>
      )}

      {/* Controls */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexWrap: 'wrap'
      }}>
        {!isRecording ? (
          <button
            onClick={handleStartRecording}
            disabled={!hasPermission}
            style={{
              padding: '12px 24px',
              background: hasPermission 
                ? 'linear-gradient(135deg, #28a745 0%, #20c997 100%)'
                : 'rgba(100,100,100,0.3)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: hasPermission ? 'pointer' : 'not-allowed',
              transition: 'all 0.3s',
              boxShadow: hasPermission ? '0 4px 15px rgba(40, 167, 69, 0.4)' : 'none',
              opacity: hasPermission ? 1 : 0.5
            }}
            onMouseOver={(e) => {
              if (hasPermission) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(40, 167, 69, 0.6)';
              }
            }}
            onMouseOut={(e) => {
              if (hasPermission) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(40, 167, 69, 0.4)';
              }
            }}
          >
            🎤 Start Recording
          </button>
        ) : (
          <>
            <button
              onClick={handlePauseResume}
              style={{
                padding: '12px 20px',
                background: isPaused 
                  ? 'linear-gradient(135deg, #28a745 0%, #20c997 100%)'
                  : 'linear-gradient(135deg, #ffc107 0%, #ff8c00 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s',
                boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.4)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.3)';
              }}
            >
              {isPaused ? '▶️ Resume' : '⏸️ Pause'}
            </button>
            
            <button
              onClick={handleStopRecording}
              style={{
                padding: '12px 20px',
                background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s',
                boxShadow: '0 4px 15px rgba(220, 53, 69, 0.4)'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(220, 53, 69, 0.6)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(220, 53, 69, 0.4)';
              }}
            >
              ⏹️ Stop Recording
            </button>
          </>
        )}
      </div>

      {/* Instructions */}
      <p style={{
        fontSize: '14px',
        margin: '16px 0 0 0',
        color: 'rgba(255,255,255,0.8)',
        textShadow: '0 2px 4px rgba(0,0,0,0.5)'
      }}>
        {isRecording 
          ? 'Your voice is being recorded and transcribed in real-time using AssemblyAI. Attendees can see the live transcription.'
          : 'Click "Start Recording" to begin voice recording and real-time transcription for your presentation.'
        }
      </p>

      <style jsx global>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};
