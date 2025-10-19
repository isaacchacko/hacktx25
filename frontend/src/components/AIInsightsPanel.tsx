import React from 'react';

interface AIInsights {
  confusedAreas: string[];
  suggestedSlideNumbers: number[];
  analysis: string;
  success: boolean;
  error?: string;
}

interface AIInsightsPanelProps {
  insights: AIInsights | null;
  isVisible: boolean;
  onClose: () => void;
  onNavigateToSlide: (slideNumber: number) => void;
}

export default function AIInsightsPanel({ 
  insights, 
  isVisible, 
  onClose, 
  onNavigateToSlide 
}: AIInsightsPanelProps) {
  console.log("🤖 AIInsightsPanel render:", { isVisible, hasInsights: !!insights, insights });
  
  if (!isVisible || !insights) {
    console.log("🤖 AIInsightsPanel not rendering - isVisible:", isVisible, "hasInsights:", !!insights);
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      width: '400px',
      maxHeight: '80vh',
      backgroundColor: '#1a1a1a',
      border: '2px solid #4a9eff',
      borderRadius: '12px',
      padding: '20px',
      zIndex: 1000,
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
        paddingBottom: '12px',
        borderBottom: '1px solid #333'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '8px',
            height: '8px',
            backgroundColor: '#4a9eff',
            borderRadius: '50%',
            animation: 'pulse 2s infinite'
          }} />
          <h3 style={{
            margin: 0,
            color: '#ffffff',
            fontSize: '18px',
            fontWeight: '600'
          }}>
            AI Insights
          </h3>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#888',
            fontSize: '20px',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '4px',
            transition: 'color 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
          onMouseLeave={(e) => e.currentTarget.style.color = '#888'}
        >
          ×
        </button>
      </div>

      {/* Content */}
      <div style={{ 
        flex: 1, 
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        {insights.success ? (
          <>
            {/* Confused Areas */}
            {insights.confusedAreas.length > 0 && (
              <div>
                <h4 style={{
                  margin: '0 0 8px 0',
                  color: '#ff6b6b',
                  fontSize: '14px',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Confused Areas
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {insights.confusedAreas.map((area, index) => (
                    <div
                      key={index}
                      style={{
                        backgroundColor: '#2a2a2a',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid #444',
                        fontSize: '13px',
                        color: '#e0e0e0',
                        lineHeight: '1.4'
                      }}
                    >
                      {area}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Suggested Slides */}
            {insights.suggestedSlideNumbers.length > 0 && (
              <div>
                <h4 style={{
                  margin: '0 0 8px 0',
                  color: '#4a9eff',
                  fontSize: '14px',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Suggested Slides
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {insights.suggestedSlideNumbers.map((slideNumber, index) => (
                    <button
                      key={index}
                      onClick={() => onNavigateToSlide(slideNumber)}
                      style={{
                        backgroundColor: '#4a9eff',
                        color: '#ffffff',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '20px',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: '0 2px 8px rgba(74, 158, 255, 0.3)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#5ba8ff';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(74, 158, 255, 0.4)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#4a9eff';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(74, 158, 255, 0.3)';
                      }}
                    >
                      Slide {slideNumber}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Analysis */}
            {insights.analysis && (
              <div>
                <h4 style={{
                  margin: '0 0 8px 0',
                  color: '#f0f0f0',
                  fontSize: '14px',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Analysis
                </h4>
                <div style={{
                  backgroundColor: '#2a2a2a',
                  padding: '12px',
                  borderRadius: '6px',
                  border: '1px solid #444',
                  fontSize: '13px',
                  color: '#d0d0d0',
                  lineHeight: '1.5'
                }}>
                  {insights.analysis}
                </div>
              </div>
            )}
          </>
        ) : (
          /* Error State */
          <div style={{
            backgroundColor: '#2a1a1a',
            border: '1px solid #ff4444',
            borderRadius: '6px',
            padding: '12px',
            textAlign: 'center'
          }}>
            <div style={{ color: '#ff6b6b', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
              Analysis Failed
            </div>
            <div style={{ color: '#ccc', fontSize: '12px' }}>
              {insights.error || 'Unable to analyze questions at this time.'}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        marginTop: '16px',
        paddingTop: '12px',
        borderTop: '1px solid #333',
        fontSize: '11px',
        color: '#888',
        textAlign: 'center'
      }}>
        Based on {insights.confusedAreas.length > 0 ? 'student questions' : 'recent activity'}
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
