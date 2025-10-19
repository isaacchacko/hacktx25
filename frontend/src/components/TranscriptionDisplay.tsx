'use client';

import React, { useState } from 'react';

interface TranscriptionResult {
  text: string;
  confidence: number;
  timestamp: number;
}

interface PageTranscription {
  pageNumber: number;
  transcriptions: TranscriptionResult[];
  startTime: number;
  endTime?: number;
}

interface TranscriptionDisplayProps {
  transcription: string;
  transcriptionHistory: Array<TranscriptionResult>;
  isTranscribing: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  transcriptionsByPage?: { [pageNumber: number]: PageTranscription };
  currentPage?: number;
  totalPages?: number;
  viewByPage?: boolean;
  onToggleView?: () => void;
}

export const TranscriptionDisplay: React.FC<TranscriptionDisplayProps> = ({
  transcription,
  transcriptionHistory,
  isTranscribing,
  isCollapsed,
  onToggleCollapse,
  transcriptionsByPage,
  currentPage,
  totalPages,
  viewByPage,
  onToggleView
}) => {
  const [showHistory, setShowHistory] = useState(false);

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'rgba(40, 167, 69, 0.8)';
    if (confidence >= 0.6) return 'rgba(255, 193, 7, 0.8)';
    return 'rgba(220, 53, 69, 0.8)';
  };

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%)',
      backdropFilter: 'blur(15px)',
      borderRadius: '16px',
      padding: '20px',
      marginBottom: '24px',
      border: '1px solid rgba(255,255,255,0.2)',
      boxShadow: '0 6px 24px rgba(0,0,0,0.3)'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h3 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: 'white',
            margin: 0,
            textShadow: '0 2px 10px rgba(147, 112, 219, 0.6)'
          }}>
            🎤 Live Transcription
          </h3>
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
                Recording
              </span>
            </div>
          )}
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {onToggleView && (
            <button
              onClick={onToggleView}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: '500',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.3)',
                background: viewByPage ? 'rgba(147, 112, 219, 0.3)' : 'rgba(255,255,255,0.1)',
                color: 'white',
                cursor: 'pointer',
                transition: 'all 0.3s'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = viewByPage ? 'rgba(147, 112, 219, 0.4)' : 'rgba(255,255,255,0.2)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = viewByPage ? 'rgba(147, 112, 219, 0.3)' : 'rgba(255,255,255,0.1)';
              }}
            >
              {viewByPage ? 'View All' : 'View by Page'}
            </button>
          )}
          
          {transcriptionHistory.length > 0 && (
            <button
              onClick={() => setShowHistory(!showHistory)}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: '500',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.3)',
                background: 'rgba(255,255,255,0.1)',
                color: 'white',
                cursor: 'pointer',
                transition: 'all 0.3s'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
              }}
            >
              {showHistory ? 'Hide History' : `Show History (${transcriptionHistory.length})`}
            </button>
          )}
          
          <button
            onClick={onToggleCollapse}
            style={{
              padding: '8px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.3)',
              background: 'rgba(255,255,255,0.1)',
              color: 'white',
              cursor: 'pointer',
              transition: 'all 0.3s',
              fontSize: '16px'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
            }}
          >
            {isCollapsed ? '▼' : '▲'}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <>
          {viewByPage && transcriptionsByPage ? (
            /* Page-based view */
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}>
              {Object.values(transcriptionsByPage)
                .sort((a, b) => a.pageNumber - b.pageNumber)
                .map((pageData) => (
                  <div
                    key={pageData.pageNumber}
                    style={{
                      background: pageData.pageNumber === currentPage 
                        ? 'rgba(147, 112, 219, 0.15)' 
                        : 'rgba(255,255,255,0.05)',
                      borderRadius: '12px',
                      padding: '16px',
                      border: pageData.pageNumber === currentPage
                        ? '2px solid rgba(147, 112, 219, 0.5)'
                        : '1px solid rgba(255,255,255,0.1)',
                      transition: 'all 0.3s'
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '12px'
                    }}>
                      <h4 style={{
                        fontSize: '16px',
                        fontWeight: '600',
                        color: pageData.pageNumber === currentPage ? '#9370db' : 'white',
                        margin: 0,
                        textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                      }}>
                        Slide {pageData.pageNumber}
                        {pageData.pageNumber === currentPage && ' (Current)'}
                      </h4>
                      <span style={{
                        fontSize: '12px',
                        color: 'rgba(255,255,255,0.6)'
                      }}>
                        {pageData.transcriptions.length} segment{pageData.transcriptions.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    
                    {pageData.transcriptions.length > 0 ? (
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}>
                        {pageData.transcriptions.map((item, index) => (
                          <div key={index} style={{
                            padding: '10px',
                            background: 'rgba(255,255,255,0.05)',
                            borderRadius: '8px',
                            border: '1px solid rgba(255,255,255,0.1)'
                          }}>
                            <p style={{
                              color: 'white',
                              fontSize: '14px',
                              lineHeight: '1.4',
                              margin: '0 0 6px 0',
                              textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                            }}>
                              {item.text}
                            </p>
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              fontSize: '11px'
                            }}>
                              <span style={{ color: 'rgba(255,255,255,0.6)' }}>
                                {new Date(item.timestamp).toLocaleTimeString()}
                              </span>
                              <span style={{
                                color: item.confidence >= 0.8 ? 'rgba(40, 167, 69, 0.8)' : item.confidence >= 0.6 ? 'rgba(255, 193, 7, 0.8)' : 'rgba(220, 53, 69, 0.8)',
                                fontWeight: '500'
                              }}>
                                {Math.round(item.confidence * 100)}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{
                        color: 'rgba(255,255,255,0.5)',
                        fontSize: '13px',
                        fontStyle: 'italic',
                        margin: 0
                      }}>
                        No transcriptions for this slide yet
                      </p>
                    )}
                  </div>
                ))}
            </div>
          ) : (
            /* Original chronological view */
            <>
              {/* Current Transcription */}
              <div style={{
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '16px',
                border: '1px solid rgba(255,255,255,0.1)',
                minHeight: '60px'
              }}>
                {transcription ? (
                  <p style={{
                    color: 'white',
                    fontSize: '16px',
                    lineHeight: '1.5',
                    margin: 0,
                    textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                  }}>
                    {transcription}
                  </p>
                ) : (
                  <p style={{
                    color: 'rgba(255,255,255,0.5)',
                    fontSize: '14px',
                    fontStyle: 'italic',
                    margin: 0
                  }}>
                    {isTranscribing ? 'Listening for speech...' : 'No active transcription'}
                  </p>
                )}
              </div>

              {/* Transcription History */}
              {showHistory && transcriptionHistory.length > 0 && (
                <div style={{
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: '12px',
                  padding: '16px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  maxHeight: '300px',
                  overflowY: 'auto'
                }}>
                  <h4 style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: 'white',
                    margin: '0 0 12px 0',
                    textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                  }}>
                    Transcription History
                  </h4>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {transcriptionHistory.map((item, index) => (
                      <div key={index} style={{
                        padding: '12px',
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: '8px',
                        border: '1px solid rgba(255,255,255,0.1)'
                      }}>
                        <p style={{
                          color: 'white',
                          fontSize: '14px',
                          lineHeight: '1.4',
                          margin: '0 0 8px 0',
                          textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                        }}>
                          {item.text}
                        </p>
                        
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '12px'
                        }}>
                          <span style={{
                            color: 'rgba(255,255,255,0.6)'
                          }}>
                            {formatTimestamp(item.timestamp)}
                          </span>
                          <span style={{
                            color: getConfidenceColor(item.confidence),
                            fontWeight: '500'
                          }}>
                            {Math.round(item.confidence * 100)}% confidence
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

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
