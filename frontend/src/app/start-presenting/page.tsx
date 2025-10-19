"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSocket } from "../../hooks/useSocket";
import { useAuth } from "../context/AuthContext";
import Link from "next/link";
import Navbar from "../../components/Navbar";

export default function StartPresentingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { socket, isConnected, createRoom, currentRoom, isAnonymous } = useSocket();
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Listen for room creation and navigate
  useEffect(() => {
    if (currentRoom && isCreatingRoom) {
      setIsCreatingRoom(false);
      router.push(`/${currentRoom}`);
    }
  }, [currentRoom, isCreatingRoom, router]);

  const handleCreateRoom = () => {
    if (isAnonymous) {
      setError("Anonymous users cannot create rooms. Please sign in to create a room.");
      return;
    }

    if (!socket || !isConnected) {
      setError("Not connected to server. Please try again.");
      return;
    }

    setIsCreatingRoom(true);
    setError(null);
    createRoom();
  };

  const joinRoom = () => {
    if (!joinCode.trim()) {
      setError("Please enter a room code");
      return;
    }

    router.push(`/${joinCode.trim()}`);
  };

  const handleJoinKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      joinRoom();
    }
  };

return (
  <div style={{
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #000000 0%, #15151c 50%, #0a0a0a 100%)',
    position: 'relative',
    overflow: 'hidden'
  }}>
    {/* Stars Background */}
    <div style={{
      position: 'absolute',
      width: '100%',
      height: '100%',
      backgroundImage: `
        radial-gradient(2px 2px at 20% 30%, white, transparent),
        radial-gradient(2px 2px at 60% 70%, white, transparent),
        radial-gradient(1px 1px at 50% 50%, white, transparent),
        radial-gradient(1px 1px at 80% 10%, white, transparent)
      `,
      backgroundSize: '200px 200px',
      opacity: 0.5,
      pointerEvents: 'none'
    }} />


    {/* NAVBAR - Now at the top */}
    <Navbar />

    {/* Content - Centered */}
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 'calc(100vh - 90px)',
      padding: '20px',
      position: 'relative',
      zIndex: 1
    }}>

      <div style={{ maxWidth: '550px', width: '100%', position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            fontSize: '64px',
            marginBottom: '16px',
            filter: 'drop-shadow(0 0 20px rgba(255,255,255,0.5))'
          }}>
            💫
          </div>
          <h1 style={{
            fontSize: '40px',
            fontWeight: 'bold',
            color: 'white',
            marginBottom: '12px',
            textShadow: '0 0 30px rgba(147, 112, 219, 0.8)'
          }}>
            Cosmic Q&A Room
          </h1>
          <p style={{
            color: 'rgba(255,255,255,0.8)',
            fontSize: '17px',
            textShadow: '0 2px 10px rgba(0,0,0,0.5)',
            marginBottom: '8px'
          }}>
            Create or join a room to start asking questions
          </p>
          <p style={{
            fontSize: '14px',
            color: 'rgba(255,255,255,0.6)',
            textShadow: '0 2px 4px rgba(0,0,0,0.5)'
          }}>
            {isAnonymous ? '🌙 Anonymous user' : `✨ Signed in as: ${user?.email}`}
          </p>
        </div>

        {/* Connection Status */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%)',
          backdropFilter: 'blur(20px)',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          border: '1px solid rgba(255,255,255,0.2)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: !isConnected ? '16px' : '0'
          }}>
            <h2 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: 'white',
              textShadow: '0 2px 10px rgba(147, 112, 219, 0.6)'
            }}>
              Connection
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: isConnected ? '#10b981' : '#ef4444',
                boxShadow: isConnected
                  ? '0 0 10px rgba(16, 185, 129, 0.8)'
                  : '0 0 10px rgba(239, 68, 68, 0.8)'
              }} />
              <span style={{
                fontSize: '14px',
                color: 'rgba(255,255,255,0.9)',
                textShadow: '0 2px 4px rgba(0,0,0,0.5)'
              }}>
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>

          {!isConnected && (
            <p style={{
              fontSize: '14px',
              color: 'rgba(255,255,255,0.7)',
              textShadow: '0 2px 4px rgba(0,0,0,0.5)'
            }}>
              Connecting to stellar server...
            </p>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(220, 38, 38, 0.2) 100%)',
            border: '2px solid rgba(239, 68, 68, 0.5)',
            color: 'rgba(255, 150, 150, 0.95)',
            padding: '16px 20px',
            borderRadius: '12px',
            marginBottom: '24px',
            backdropFilter: 'blur(10px)',
            textShadow: '0 2px 4px rgba(0,0,0,0.5)'
          }}>
            {error}
          </div>
        )}

        {/* Room Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Create Room */}
          <div style={{
            background: isAnonymous
              ? 'linear-gradient(135deg, rgba(75, 85, 99, 0.2) 0%, rgba(55, 65, 81, 0.2) 100%)'
              : 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(124, 58, 237, 0.2) 100%)',
            backdropFilter: 'blur(20px)',
            borderRadius: '16px',
            padding: '28px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            border: `2px solid ${isAnonymous ? 'rgba(156, 163, 175, 0.3)' : 'rgba(139, 92, 246, 0.4)'}`
          }}>
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
                textShadow: '0 2px 10px rgba(147, 112, 219, 0.6)'
              }}>
                Create New Room
              </h3>
              <span style={{
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: '600',
                background: isAnonymous
                  ? 'rgba(156, 163, 175, 0.3)'
                  : 'rgba(139, 92, 246, 0.3)',
                color: 'rgba(255,255,255,0.9)',
                border: `1px solid ${isAnonymous ? 'rgba(156, 163, 175, 0.5)' : 'rgba(139, 92, 246, 0.5)'}`,
                textShadow: '0 2px 4px rgba(0,0,0,0.5)'
              }}>
                🎤 PRESENTER
              </span>
            </div>
            <p style={{
              fontSize: '14px',
              marginBottom: '20px',
              color: 'rgba(255,255,255,0.8)',
              lineHeight: '1.6',
              textShadow: '0 2px 4px rgba(0,0,0,0.5)'
            }}>
              {isAnonymous
                ? "Sign in to create rooms and become a presenter. You'll be able to mark questions as answered and manage Q&A sessions."
                : "Create a new room and become the presenter. You'll be able to mark questions as answered and manage the Q&A session."
              }
            </p>
            {isAnonymous ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button
                  disabled={true}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    background: 'rgba(100,100,100,0.3)',
                    color: 'rgba(255,255,255,0.5)',
                    border: '2px solid rgba(255,255,255,0.2)',
                    borderRadius: '12px',
                    cursor: 'not-allowed',
                    fontSize: '15px',
                    fontWeight: '600',
                    textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                  }}
                >
                  Sign In Required
                </button>
                <a
                  href="/login"
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderRadius: '12px',
                    textAlign: 'center',
                    textDecoration: 'none',
                    display: 'block',
                    fontSize: '15px',
                    fontWeight: '600',
                    transition: 'all 0.3s',
                    boxShadow: '0 4px 15px rgba(147, 112, 219, 0.4)',
                    textShadow: '0 2px 4px rgba(0,0,0,0.3)'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(147, 112, 219, 0.6)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(147, 112, 219, 0.4)';
                  }}
                >
                  ✨ Go to Sign In
                </a>
              </div>
            ) : (
              <button
                onClick={handleCreateRoom}
                disabled={!isConnected || isCreatingRoom}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  background: (!isConnected || isCreatingRoom)
                    ? 'rgba(100,100,100,0.3)'
                    : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderRadius: '12px',
                  cursor: (!isConnected || isCreatingRoom) ? 'not-allowed' : 'pointer',
                  fontSize: '15px',
                  fontWeight: '600',
                  transition: 'all 0.3s',
                  boxShadow: (!isConnected || isCreatingRoom)
                    ? 'none'
                    : '0 4px 15px rgba(16, 185, 129, 0.4)',
                  textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                  opacity: (!isConnected || isCreatingRoom) ? 0.5 : 1
                }}
                onMouseOver={(e) => {
                  if (isConnected && !isCreatingRoom) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.6)';
                  }
                }}
                onMouseOut={(e) => {
                  if (isConnected && !isCreatingRoom) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(16, 185, 129, 0.4)';
                  }
                }}
              >
                {isCreatingRoom ? "🚀 Creating Room..." : "🌟 Create Room"}
              </button>
            )}
          </div>

          {/* Join Room */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(37, 99, 235, 0.2) 100%)',
            backdropFilter: 'blur(20px)',
            borderRadius: '16px',
            padding: '28px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            border: '2px solid rgba(59, 130, 246, 0.4)'
          }}>
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
                textShadow: '0 2px 10px rgba(59, 130, 246, 0.6)'
              }}>
                Join Existing Room
              </h3>
              <span style={{
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: '600',
                background: 'rgba(59, 130, 246, 0.3)',
                color: 'rgba(255,255,255,0.9)',
                border: '1px solid rgba(59, 130, 246, 0.5)',
                textShadow: '0 2px 4px rgba(0,0,0,0.5)'
              }}>
                👥 ATTENDEE
              </span>
            </div>
            <p style={{
              fontSize: '14px',
              color: 'rgba(255,255,255,0.8)',
              marginBottom: '20px',
              lineHeight: '1.6',
              textShadow: '0 2px 4px rgba(0,0,0,0.5)'
            }}>
              Enter a room code to join as a participant. You can ask questions and vote on unanswered questions.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                onKeyPress={handleJoinKeyPress}
                placeholder="Enter room code..."
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  border: '2px solid rgba(255,255,255,0.2)',
                  borderRadius: '12px',
                  fontSize: '14px',
                  background: 'rgba(255,255,255,0.08)',
                  color: 'white',
                  backdropFilter: 'blur(10px)',
                  transition: 'all 0.3s',
                  outline: 'none'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.8)';
                  e.currentTarget.style.boxShadow = '0 0 20px rgba(59, 130, 246, 0.3)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
              <button
                onClick={joinRoom}
                disabled={!joinCode.trim()}
                style={{
                  padding: '12px 24px',
                  background: joinCode.trim()
                    ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                    : 'rgba(100,100,100,0.3)',
                  color: 'white',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderRadius: '12px',
                  cursor: joinCode.trim() ? 'pointer' : 'not-allowed',
                  fontSize: '15px',
                  fontWeight: '600',
                  transition: 'all 0.3s',
                  boxShadow: joinCode.trim() ? '0 4px 15px rgba(59, 130, 246, 0.4)' : 'none',
                  textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                  opacity: !joinCode.trim() ? 0.5 : 1
                }}
                onMouseOver={(e) => {
                  if (joinCode.trim()) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.6)';
                  }
                }}
                onMouseOut={(e) => {
                  if (joinCode.trim()) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(59, 130, 246, 0.4)';
                  }
                }}
              >
                Join
              </button>
            </div>
          </div>
        </div>

        {/* Features */}
        <div style={{
          marginTop: '32px',
          background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%)',
          backdropFilter: 'blur(20px)',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          border: '1px solid rgba(255,255,255,0.2)'
        }}>
          <h3 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: 'white',
            marginBottom: '16px',
            textShadow: '0 2px 10px rgba(147, 112, 219, 0.6)'
          }}>
            ✨ Stellar Features
          </h3>
          <ul style={{
            fontSize: '14px',
            color: 'rgba(255,255,255,0.85)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            listStyle: 'none',
            padding: 0,
            margin: 0
          }}>
            <li style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{
                color: '#10b981',
                fontSize: '16px',
                textShadow: '0 0 10px rgba(16, 185, 129, 0.6)'
              }}>
                ✓
              </span>
              <span style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                Real-time question posting and voting
              </span>
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{
                color: '#10b981',
                fontSize: '16px',
                textShadow: '0 0 10px rgba(16, 185, 129, 0.6)'
              }}>
                ✓
              </span>
              <span style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                Questions persist even when users leave
              </span>
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{
                color: '#10b981',
                fontSize: '16px',
                textShadow: '0 0 10px rgba(16, 185, 129, 0.6)'
              }}>
                ✓
              </span>
              <span style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                Presenter can mark questions as answered
              </span>
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{
                color: '#10b981',
                fontSize: '16px',
                textShadow: '0 0 10px rgba(16, 185, 129, 0.6)'
              }}>
                ✓
              </span>
              <span style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                Questions sorted by popularity
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
  );
}
