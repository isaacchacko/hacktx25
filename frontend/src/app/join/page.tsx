'use client';

import { useState, ChangeEvent } from 'react';

export default function JoinPage() {
  const [code, setCode] = useState<string>('');
  const [joined, setJoined] = useState<boolean>(false);

  const handleJoin = () => {
    if (code.length >= 6) {
      setJoined(true);
    }
  };

  const handleCodeChange = (e: ChangeEvent<HTMLInputElement>) => {
    setCode(e.target.value.toUpperCase());
  };

  if (!joined) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(180deg, #0a0e27 0%, #1a1a3e 50%, #2d1b3d 100%)',
        padding: '20px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Stars */}
        <div style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          background: `
            radial-gradient(2px 2px at 20% 30%, white, transparent),
            radial-gradient(2px 2px at 60% 70%, white, transparent),
            radial-gradient(1px 1px at 50% 50%, white, transparent)
          `,
          backgroundSize: '200px 200px',
          opacity: 0.5,
          pointerEvents: 'none'
        }} />

        <div style={{
          background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%)',
          backdropFilter: 'blur(20px)',
          borderRadius: '24px',
          padding: '50px',
          maxWidth: '550px',
          width: '100%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 100px rgba(147, 112, 219, 0.3)',
          border: '1px solid rgba(255,255,255,0.2)',
          position: 'relative',
          zIndex: 1
        }}>
          <div style={{ textAlign: 'center', marginBottom: '35px' }}>
            <div style={{ fontSize: '80px', marginBottom: '20px', filter: 'drop-shadow(0 0 20px rgba(255,255,255,0.5))' }}>
              🌙
            </div>
            <h1 style={{ 
              color: 'white', 
              marginBottom: '15px', 
              fontSize: '40px',
              textShadow: '0 0 30px rgba(147, 112, 219, 0.8)'
            }}>
              Join the Cosmos
            </h1>
            <p style={{ 
              color: 'rgba(255,255,255,0.8)', 
              fontSize: '17px',
              textShadow: '0 2px 10px rgba(0,0,0,0.5)'
            }}>
              Enter the 6-character stellar code
            </p>
          </div>

          <div style={{ marginBottom: '25px' }}>
            <input
              type="text"
              value={code}
              onChange={handleCodeChange}
              placeholder="STAR01"
              maxLength={6}
              style={{
                width: '100%',
                padding: '24px',
                fontSize: '38px',
                textAlign: 'center',
                border: '3px solid rgba(255,255,255,0.3)',
                borderRadius: '16px',
                fontWeight: 'bold',
                letterSpacing: '10px',
                fontFamily: 'monospace',
                boxSizing: 'border-box',
                transition: 'all 0.3s',
                background: 'rgba(255,255,255,0.05)',
                color: 'white',
                textShadow: '0 0 20px rgba(147, 112, 219, 0.8)',
                backdropFilter: 'blur(10px)'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'rgba(147, 112, 219, 0.8)';
                e.currentTarget.style.boxShadow = '0 0 40px rgba(147, 112, 219, 0.5)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>

          <button
            onClick={handleJoin}
            disabled={code.length < 6}
            style={{
              width: '100%',
              padding: '20px',
              background: code.length >= 6 
                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                : 'rgba(100,100,100,0.3)',
              color: 'white',
              border: '2px solid rgba(255,255,255,0.3)',
              borderRadius: '16px',
              fontSize: '20px',
              fontWeight: '700',
              cursor: code.length >= 6 ? 'pointer' : 'not-allowed',
              transition: 'all 0.3s',
              boxShadow: code.length >= 6 ? '0 8px 30px rgba(147, 112, 219, 0.5)' : 'none',
              textShadow: '0 2px 4px rgba(0,0,0,0.3)'
            }}
            onMouseOver={(e) => {
              if (code.length >= 6) {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 12px 40px rgba(147, 112, 219, 0.7)';
              }
            }}
            onMouseOut={(e) => {
              if (code.length >= 6) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 8px 30px rgba(147, 112, 219, 0.5)';
              }
            }}
          >
            🚀 Enter the Presentation
          </button>

          <div style={{
            marginTop: '40px',
            padding: '25px',
            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%)',
            borderRadius: '12px',
            borderLeft: '4px solid rgba(147, 112, 219, 0.8)',
            backdropFilter: 'blur(10px)'
          }}>
            <h3 style={{ 
              color: 'white', 
              marginBottom: '18px', 
              fontSize: '18px',
              textShadow: '0 2px 10px rgba(0,0,0,0.5)'
            }}>
              ✨ As a cosmic traveler, you can:
            </h3>
            <ul style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              fontSize: '15px',
              lineHeight: '2.2',
              color: 'rgba(255,255,255,0.85)'
            }}>
              <li>🌌 View slides in real-time</li>
              <li>💫 Ask questions</li>
              <li>⭐ Upvote stellar queries</li>
              <li>📝 Take cosmic notes</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // Connected View
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #0a0e27 0%, #1a1a3e 100%)', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      {/* Stars */}
      <div style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        background: `
          radial-gradient(2px 2px at 20% 30%, white, transparent),
          radial-gradient(2px 2px at 60% 70%, white, transparent)
        `,
        backgroundSize: '200px 200px',
        opacity: 0.3,
        pointerEvents: 'none'
      }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <header style={{
          background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%)',
          backdropFilter: 'blur(15px)',
          padding: '22px 45px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div>
            <h2 style={{ 
              margin: 0, 
              color: 'white', 
              fontSize: '22px',
              textShadow: '0 0 20px rgba(147, 112, 219, 0.8)'
            }}>
              Session: <span style={{ 
                color: '#9370db', 
                fontFamily: 'monospace',
                textShadow: '0 0 15px rgba(147, 112, 219, 0.9)'
              }}>{code}</span>
            </h2>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px' }}>
              Q1 Sales Report.pdf
            </span>
          </div>
          <button
            onClick={() => setJoined(false)}
            style={{
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '20px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              boxShadow: '0 4px 15px rgba(220, 53, 69, 0.4)',
              transition: 'all 0.3s'
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
            Leave Cosmos
          </button>
        </header>

        {/* Content */}
        <div style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: '1fr 420px',
          gap: '25px',
          padding: '25px',
          maxWidth: '1400px',
          margin: '0 auto',
          width: '100%'
        }}>
          {/* Slide Viewer */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%)',
            backdropFilter: 'blur(20px)',
            borderRadius: '20px',
            padding: '30px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            border: '1px solid rgba(255,255,255,0.15)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: '2px dashed rgba(147, 112, 219, 0.5)',
              borderRadius: '16px',
              padding: '80px 40px',
              textAlign: 'center',
              width: '100%'
            }}>
              <div style={{ fontSize: '80px', marginBottom: '25px', filter: 'drop-shadow(0 0 20px rgba(255,255,255,0.5))' }}>
                🌠
              </div>
              <h3 style={{ 
                color: 'white', 
                marginBottom: '12px',
                textShadow: '0 0 20px rgba(147, 112, 219, 0.8)'
              }}>
                Slide 1 of 12
              </h3>
              <p style={{ color: 'rgba(255,255,255,0.7)' }}>
                Waiting for presenter to illuminate...
              </p>
            </div>
          </div>

          {/* Q&A Sidebar */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%)',
            backdropFilter: 'blur(20px)',
            borderRadius: '20px',
            padding: '30px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            border: '1px solid rgba(255,255,255,0.15)',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <h3 style={{ 
              color: 'white', 
              marginBottom: '22px', 
              fontSize: '20px',
              textShadow: '0 0 20px rgba(147, 112, 219, 0.8)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              💫 Cosmic Q&A
            </h3>

            <div style={{ marginBottom: '22px' }}>
              <textarea
                placeholder="Ask a stellar question..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '14px',
                  border: '2px solid rgba(255,255,255,0.2)',
                  borderRadius: '10px',
                  fontSize: '14px',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                  marginBottom: '12px',
                  background: 'rgba(255,255,255,0.05)',
                  color: 'white',
                  backdropFilter: 'blur(10px)',
                  transition: 'all 0.3s'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(147, 112, 219, 0.8)';
                  e.currentTarget.style.boxShadow = '0 0 20px rgba(147, 112, 219, 0.3)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
              <button style={{
                width: '100%',
                padding: '14px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '10px',
                cursor: 'pointer',
                fontSize: '15px',
                fontWeight: '700',
                boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
                transition: 'all 0.3s',
                textShadow: '0 2px 4px rgba(0,0,0,0.3)'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.6)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
              }}
              >
                ⭐ Submit Question
              </button>
            </div>

            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '25px',
              background: 'rgba(255,255,255,0.03)',
              borderRadius: '12px',
              textAlign: 'center',
              color: 'rgba(255,255,255,0.6)'
            }}>
              <p>No questions in the cosmos yet. Be the first star! ✨</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
