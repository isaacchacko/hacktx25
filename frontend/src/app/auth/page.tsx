'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function AuthPage() {
  const [isSignUp, setIsSignUp] = useState(false);

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
      {/* Stars Background */}
      <div style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        background: `
          radial-gradient(2px 2px at 20% 30%, white, transparent),
          radial-gradient(2px 2px at 60% 70%, white, transparent),
          radial-gradient(1px 1px at 50% 50%, white, transparent),
          radial-gradient(1px 1px at 80% 10%, white, transparent)
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
        maxWidth: '480px',
        width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 100px rgba(147, 112, 219, 0.3)',
        border: '1px solid rgba(255,255,255,0.2)',
        position: 'relative',
        zIndex: 1
      }}>
        <div style={{ textAlign: 'center', marginBottom: '35px' }}>
          <div style={{ fontSize: '64px', marginBottom: '15px' }}>🌟</div>
          <h1 style={{
            color: 'white',
            marginBottom: '12px',
            fontSize: '36px',
            textShadow: '0 0 30px rgba(147, 112, 219, 0.8)'
          }}>
            Welcome to the Cosmos
          </h1>
          <p style={{
            color: 'rgba(255,255,255,0.8)',
            fontSize: '16px',
            textShadow: '0 2px 10px rgba(0,0,0,0.5)'
          }}>
            Begin your stellar presentation journey
          </p>
        </div>

        <div style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '35px'
        }}>
          {['Sign In', 'Sign Up'].map((tab, idx) => (
            <button
              key={tab}
              onClick={() => setIsSignUp(idx === 1)}
              style={{
                flex: 1,
                padding: '14px',
                border: '2px solid',
                borderColor: (idx === 0 ? !isSignUp : isSignUp) ? 'rgba(147, 112, 219, 0.8)' : 'rgba(255,255,255,0.2)',
                background: (idx === 0 ? !isSignUp : isSignUp) 
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                  : 'rgba(255,255,255,0.05)',
                color: 'white',
                borderRadius: '12px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600',
                transition: 'all 0.3s',
                boxShadow: (idx === 0 ? !isSignUp : isSignUp) ? '0 4px 20px rgba(147, 112, 219, 0.4)' : 'none',
                textShadow: '0 2px 4px rgba(0,0,0,0.3)'
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        <form style={{ marginBottom: '25px' }}>
          <div style={{ marginBottom: '22px' }}>
            <label style={{
              display: 'block',
              marginBottom: '10px',
              color: 'rgba(255,255,255,0.9)',
              fontWeight: '500',
              fontSize: '14px',
              textShadow: '0 2px 4px rgba(0,0,0,0.5)'
            }}>
              Email
            </label>
            <input
              type="email"
              placeholder="starship@galaxy.com"
              style={{
                width: '100%',
                padding: '14px',
                border: '2px solid rgba(255,255,255,0.2)',
                borderRadius: '10px',
                fontSize: '15px',
                boxSizing: 'border-box',
                background: 'rgba(255,255,255,0.08)',
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
          </div>

          <div style={{ marginBottom: '22px' }}>
            <label style={{
              display: 'block',
              marginBottom: '10px',
              color: 'rgba(255,255,255,0.9)',
              fontWeight: '500',
              fontSize: '14px',
              textShadow: '0 2px 4px rgba(0,0,0,0.5)'
            }}>
              Password
            </label>
            <input
              type="password"
              placeholder={isSignUp ? 'Create cosmic password' : 'Enter your password'}
              style={{
                width: '100%',
                padding: '14px',
                border: '2px solid rgba(255,255,255,0.2)',
                borderRadius: '10px',
                fontSize: '15px',
                boxSizing: 'border-box',
                background: 'rgba(255,255,255,0.08)',
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
          </div>

          {isSignUp && (
            <div style={{ marginBottom: '22px' }}>
              <label style={{
                display: 'block',
                marginBottom: '10px',
                color: 'rgba(255,255,255,0.9)',
                fontWeight: '500',
                fontSize: '14px',
                textShadow: '0 2px 4px rgba(0,0,0,0.5)'
              }}>
                Confirm Password
              </label>
              <input
                type="password"
                placeholder="Confirm your password"
                style={{
                  width: '100%',
                  padding: '14px',
                  border: '2px solid rgba(255,255,255,0.2)',
                  borderRadius: '10px',
                  fontSize: '15px',
                  boxSizing: 'border-box',
                  background: 'rgba(255,255,255,0.08)',
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
            </div>
          )}

          <Link href="/presenter">
            <button
              type="button"
              style={{
                width: '100%',
                padding: '16px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: '2px solid rgba(255,255,255,0.3)',
                borderRadius: '12px',
                fontSize: '17px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s',
                boxShadow: '0 6px 25px rgba(147, 112, 219, 0.5)',
                textShadow: '0 2px 4px rgba(0,0,0,0.3)'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = '0 10px 35px rgba(147, 112, 219, 0.6)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 6px 25px rgba(147, 112, 219, 0.5)';
              }}
            >
              ✨ {isSignUp ? 'Launch Account' : 'Enter Cosmos'}
            </button>
          </Link>
        </form>

        <div style={{
          textAlign: 'center',
          margin: '25px 0',
          position: 'relative'
        }}>
          <div style={{
            position: 'absolute',
            top: '50%',
            left: 0,
            right: 0,
            height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)'
          }} />
          <span style={{
            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%)',
            padding: '0 20px',
            position: 'relative',
            color: 'rgba(255,255,255,0.7)',
            fontSize: '14px',
            textShadow: '0 2px 4px rgba(0,0,0,0.5)'
          }}>
            OR
          </span>
        </div>

        <button
          style={{
            width: '100%',
            padding: '16px',
            background: 'rgba(255,255,255,0.1)',
            border: '2px solid rgba(255,255,255,0.3)',
            borderRadius: '12px',
            fontSize: '16px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            transition: 'all 0.3s',
            color: 'white',
            backdropFilter: 'blur(10px)',
            textShadow: '0 2px 4px rgba(0,0,0,0.3)'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
            e.currentTarget.style.boxShadow = '0 4px 20px rgba(255,255,255,0.2)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <span style={{ fontSize: '22px' }}>🌙</span>
          Continue with Google
        </button>

        <div style={{ marginTop: '35px', textAlign: 'center', paddingTop: '25px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', marginBottom: '12px' }}>
            Joining as audience?
          </p>
          <Link href="/join" style={{
            color: '#9370db',
            textDecoration: 'none',
            fontWeight: 'bold',
            fontSize: '15px',
            textShadow: '0 0 15px rgba(147, 112, 219, 0.6)',
            transition: 'all 0.3s'
          }}
          onMouseOver={(e) => e.currentTarget.style.textShadow = '0 0 25px rgba(147, 112, 219, 0.9)'}
          onMouseOut={(e) => e.currentTarget.style.textShadow = '0 0 15px rgba(147, 112, 219, 0.6)'}
          >
            🌙 Join with session code →
          </Link>
        </div>
      </div>
    </div>
  );
}
