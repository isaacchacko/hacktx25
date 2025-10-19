"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "./context/AuthContext";
import Navbar from "../components/Navbar";

export default function Home() {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(180deg, #0a0e27 0%, #1a1a3e 50%, #2d1b3d 100%)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid rgba(147, 112, 219, 0.3)',
            borderTopColor: '#9370db',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          <p style={{ color: 'rgba(255,255,255,0.8)' }}>Loading...</p>
        </div>
        <style jsx global>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #0a0e27 0%, #1a1a3e 50%, #2d1b3d 100%)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Animated Stars Background */}
      <div style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        background: `
          radial-gradient(2px 2px at 20% 30%, white, transparent),
          radial-gradient(2px 2px at 60% 70%, white, transparent),
          radial-gradient(1px 1px at 50% 50%, white, transparent),
          radial-gradient(1px 1px at 80% 10%, white, transparent),
          radial-gradient(2px 2px at 90% 60%, white, transparent),
          radial-gradient(1px 1px at 33% 80%, white, transparent),
          radial-gradient(2px 2px at 70% 40%, white, transparent)
        `,
        backgroundSize: '200px 200px, 300px 300px, 250px 250px, 280px 280px, 320px 320px, 290px 290px, 310px 310px',
        animation: 'twinkle 3s ease-in-out infinite alternate',
        pointerEvents: 'none',
        opacity: 0.6
      }} />

      {/* Animated Gradient Overlay */}
      <div style={{
        position: 'absolute',
        width: '200%',
        height: '200%',
        top: '-50%',
        left: '-50%',
        background: 'radial-gradient(circle, rgba(102, 126, 234, 0.1) 0%, transparent 50%)',
        animation: 'rotateGradient 20s linear infinite',
        pointerEvents: 'none'
      }} />

      {/* Shooting Stars */}
      {[
        { top: '10%', left: '-200px' },
        { top: '30%', left: '-200px' },
        { top: '60%', left: '-200px' },
        { top: '80%', left: '-200px' },
        { top: '-50px', left: '40%' },
        { top: '-50px', left: '50%' },
        { top: '-50px', left: '60%' },
        { top: '-50px', left: '30%' },
        { top: '-50px', left: '70%' }
      ].map((pos, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            top: pos.top,
            left: pos.left,
            width: '150px',
            height: '2px',
            transform: 'rotate(-45deg)',
            transformOrigin: 'center',
            animation: `shootingStar ${4 + i * 1.5}s linear infinite`,
            animationDelay: `${i * 2}s`,
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          {/* Star head (circle) */}
          <div style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: 'white',
            boxShadow: '0 0 15px 3px rgba(255,255,255,0.8)',
            position: 'absolute',
            right: '0'
          }} />
          {/* Star tail (gradient line) */}
          <div style={{
            width: '100%',
            height: '2px',
            background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.8) 100%)',
            boxShadow: '0 0 10px 2px rgba(255,255,255,0.5)'
          }} />
        </div>
      ))}

      {/* Floating Particles */}
      {[...Array(25)].map((_, i) => (
        <div
          key={`particle-${i}`}
          style={{
            position: 'absolute',
            width: `${Math.random() * 4 + 2}px`,
            height: `${Math.random() * 4 + 2}px`,
            background: 'rgba(255,255,255,0.6)',
            borderRadius: '50%',
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            animation: `float ${10 + Math.random() * 20}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 5}s`,
            pointerEvents: 'none',
            boxShadow: '0 0 10px rgba(255,255,255,0.5)'
          }}
        />
      ))}

      {/* Content Container */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Navbar />

        {/* Hero Section */}
        <main style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px 20px',
          textAlign: 'center'
        }}>
          <div style={{ maxWidth: '1000px' }}>
            {/* Title */}
            <h1 style={{
              color: 'white',
              fontSize: '72px',
              fontWeight: 'bold',
              marginBottom: '24px',
              lineHeight: '1.1'
            }}>
              Present Among the Stars
            </h1>

            <p style={{
              color: 'white',
              fontSize: '20px',
              marginBottom: '48px',
              lineHeight: '1.6',
              maxWidth: '700px',
              margin: '0 auto 48px'
            }}>
              Illuminate your presentations with real-time Q&A,
              cosmic AI summaries, and stellar audience engagement
            </p>

            {/* CTA Buttons */}
            <div style={{
              display: 'flex',
              gap: '20px',
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}>
              <Link href={user ? "/upload" : "/login"}>
                <button style={{
                  padding: '16px 36px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderRadius: '20px',
                  fontSize: '18px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.4s',
                  boxShadow: '0 8px 32px rgba(102, 126, 234, 0.5), inset 0 -2px 10px rgba(0,0,0,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  textShadow: '0 2px 4px rgba(0,0,0,0.3)'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px) scale(1.03)';
                  e.currentTarget.style.boxShadow = '0 12px 40px rgba(102, 126, 234, 0.6), inset 0 -2px 10px rgba(0,0,0,0.2)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                  e.currentTarget.style.boxShadow = '0 8px 32px rgba(102, 126, 234, 0.5), inset 0 -2px 10px rgba(0,0,0,0.2)';
                }}
                >
                  <span style={{ fontSize: '24px' }}>🚀</span>
                  {user ? 'Launch Presentation' : 'Get Started'}
                </button>
              </Link>

              {user && (
                <Link href="/dashboard">
                  <button style={{
                    padding: '16px 36px',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: 'white',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderRadius: '20px',
                    fontSize: '18px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    transition: 'all 0.4s',
                    boxShadow: '0 8px 32px rgba(16, 185, 129, 0.5), inset 0 -2px 10px rgba(0,0,0,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    textShadow: '0 2px 4px rgba(0,0,0,0.3)'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px) scale(1.03)';
                    e.currentTarget.style.boxShadow = '0 12px 40px rgba(16, 185, 129, 0.6), inset 0 -2px 10px rgba(0,0,0,0.2)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0) scale(1)';
                    e.currentTarget.style.boxShadow = '0 8px 32px rgba(16, 185, 129, 0.5), inset 0 -2px 10px rgba(0,0,0,0.2)';
                  }}
                  >
                    <span style={{ fontSize: '24px' }}>🌟</span>
                    Dashboard
                  </button>
                </Link>
              )}

              <Link href="/start-presenting">
                <button style={{
                  padding: '16px 36px',
                  background: 'linear-gradient(135deg, #64748b 0%, #7c3aed 100%)',
                  color: 'white',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderRadius: '20px',
                  fontSize: '18px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.4s',
                  backdropFilter: 'blur(10px)',
                  boxShadow: '0 8px 32px rgba(124, 58, 237, 0.4), inset 0 -2px 10px rgba(0,0,0,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  textShadow: '0 2px 4px rgba(0,0,0,0.3)'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px) scale(1.03)';
                  e.currentTarget.style.boxShadow = '0 12px 40px rgba(124, 58, 237, 0.6), inset 0 -2px 10px rgba(0,0,0,0.2)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                  e.currentTarget.style.boxShadow = '0 8px 32px rgba(124, 58, 237, 0.4), inset 0 -2px 10px rgba(0,0,0,0.2)';
                }}
                >
                  <span style={{ fontSize: '24px' }}>🌙</span>
                  Join Session
                </button>
              </Link>
            </div>
          </div>
        </main>
      </div>

      <style jsx global>{`
        @keyframes twinkle {
          0% { opacity: 0.3; }
          100% { opacity: 0.8; }
        }
        
        @keyframes shootingStar {
          0% {
            transform: translate(0, 0) rotate(-315deg);
            opacity: 1;
          }
          50% {
            opacity: 1;
          }
          100% {
            transform: translate(1400px, 1400px) rotate(-315deg);
            opacity: 0;
          }
        }
        
        @keyframes float {
          0%, 100% {
            transform: translateY(0) translateX(0);
          }
          25% {
            transform: translateY(-20px) translateX(10px);
          }
          50% {
            transform: translateY(-10px) translateX(-10px);
          }
          75% {
            transform: translateY(-15px) translateX(5px);
          }
        }
        
        @keyframes rotateGradient {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
