'use client';

import Link from 'next/link';

export default function Home() {
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

      {/* Content Container */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {/* Header */}
        <header style={{
          padding: '20px 40px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backdropFilter: 'blur(10px)',
          background: 'rgba(255,255,255,0.05)',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div style={{
            color: 'white',
            fontSize: '24px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            textShadow: '0 0 20px rgba(147, 112, 219, 0.8)'
          }}>
            <span style={{ fontSize: '36px' }}>🌟</span>
            <span>Celestial Presenter</span>
          </div>
          <Link href="/auth">
            <button style={{
              padding: '12px 28px',
              background: 'linear-gradient(135deg, #667eea 0%, #9370db 100%)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '25px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s',
              boxShadow: '0 4px 20px rgba(147, 112, 219, 0.4)',
              textShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)';
              e.currentTarget.style.boxShadow = '0 6px 30px rgba(147, 112, 219, 0.6)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0) scale(1)';
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(147, 112, 219, 0.4)';
            }}
            >
              ✨ Sign In
            </button>
          </Link>
        </header>

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
            {/* Glowing Title */}
            <h1 style={{
              color: 'white',
              fontSize: '72px',
              fontWeight: 'bold',
              marginBottom: '30px',
              lineHeight: '1.1',
              textShadow: '0 0 40px rgba(147, 112, 219, 0.8), 0 0 80px rgba(138, 43, 226, 0.4)',
              background: 'linear-gradient(to right, #fff, #e0c3fc, #fff)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              Present Among the Stars
            </h1>
            
            <p style={{
              color: 'rgba(255,255,255,0.9)',
              fontSize: '24px',
              marginBottom: '60px',
              lineHeight: '1.6',
              maxWidth: '750px',
              margin: '0 auto 60px',
              textShadow: '0 2px 10px rgba(0,0,0,0.5)'
            }}>
              Illuminate your presentations with real-time Q&A,
              cosmic AI summaries, and stellar audience engagement
            </p>

            {/* CTA Buttons */}
            <div style={{
              display: 'flex',
              gap: '25px',
              justifyContent: 'center',
              flexWrap: 'wrap',
              marginBottom: '80px'
            }}>
              <Link href="/auth">
                <button style={{
                  padding: '20px 45px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderRadius: '30px',
                  fontSize: '20px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.4s',
                  boxShadow: '0 10px 40px rgba(102, 126, 234, 0.5), inset 0 -2px 10px rgba(0,0,0,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  textShadow: '0 2px 4px rgba(0,0,0,0.3)'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-6px) scale(1.05)';
                  e.currentTarget.style.boxShadow = '0 15px 50px rgba(102, 126, 234, 0.7), inset 0 -2px 10px rgba(0,0,0,0.2)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                  e.currentTarget.style.boxShadow = '0 10px 40px rgba(102, 126, 234, 0.5), inset 0 -2px 10px rgba(0,0,0,0.2)';
                }}
                >
                  <span style={{ fontSize: '28px' }}>🚀</span>
                  Launch Presentation
                </button>
              </Link>

              <Link href="/join">
                <button style={{
                  padding: '20px 45px',
                  background: 'rgba(255,255,255,0.1)',
                  color: 'white',
                  border: '2px solid rgba(255,255,255,0.4)',
                  borderRadius: '30px',
                  fontSize: '20px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.4s',
                  backdropFilter: 'blur(10px)',
                  boxShadow: '0 10px 30px rgba(255,255,255,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  textShadow: '0 2px 4px rgba(0,0,0,0.3)'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
                  e.currentTarget.style.transform = 'translateY(-6px) scale(1.05)';
                  e.currentTarget.style.boxShadow = '0 15px 40px rgba(255,255,255,0.2)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                  e.currentTarget.style.boxShadow = '0 10px 30px rgba(255,255,255,0.1)';
                }}
                >
                  <span style={{ fontSize: '28px' }}>🌙</span>
                  Join Cosmos
                </button>
              </Link>
            </div>

            {/* Features Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '30px',
              maxWidth: '1100px',
              margin: '0 auto'
            }}>
              {[
                { icon: '☄️', title: 'Stellar Uploads', desc: 'PDF, PowerPoint & Google Slides' },
                { icon: '💫', title: 'Cosmic Q&A', desc: 'Real-time audience questions' },
                { icon: '🌌', title: 'AI Nebula', desc: 'Auto-generated smart summaries' },
                { icon: '⭐', title: 'Star Analytics', desc: 'Track engagement metrics' }
              ].map((feature, index) => (
                <div key={index} style={{
                  background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%)',
                  backdropFilter: 'blur(15px)',
                  borderRadius: '20px',
                  padding: '35px 25px',
                  border: '1px solid rgba(255,255,255,0.2)',
                  transition: 'all 0.4s',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(102, 126, 234, 0.35) 0%, rgba(118, 75, 162, 0.35) 100%)';
                  e.currentTarget.style.transform = 'translateY(-10px)';
                  e.currentTarget.style.boxShadow = '0 15px 45px rgba(102, 126, 234, 0.4)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.3)';
                }}
                >
                  <div style={{ 
                    fontSize: '56px', 
                    marginBottom: '18px',
                    filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.5))'
                  }}>
                    {feature.icon}
                  </div>
                  <h3 style={{
                    color: 'white',
                    fontSize: '22px',
                    fontWeight: '700',
                    marginBottom: '12px',
                    textShadow: '0 2px 10px rgba(147, 112, 219, 0.6)'
                  }}>
                    {feature.title}
                  </h3>
                  <p style={{
                    color: 'rgba(255,255,255,0.85)',
                    fontSize: '15px',
                    lineHeight: '1.6'
                  }}>
                    {feature.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer style={{
          padding: '30px 40px',
          borderTop: '1px solid rgba(255,255,255,0.15)',
          backdropFilter: 'blur(10px)',
          background: 'rgba(255,255,255,0.03)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px'
        }}>
          <div style={{ 
            color: 'rgba(255,255,255,0.7)', 
            fontSize: '14px',
            textShadow: '0 2px 4px rgba(0,0,0,0.5)'
          }}>
            © 2025 Celestial Presenter • Made with 🌟 across the universe
          </div>
          <div style={{
            display: 'flex',
            gap: '30px',
            fontSize: '14px'
          }}>
            {['About', 'Features', 'Galaxy'].map(link => (
              <a key={link} href="#" style={{
                color: 'rgba(255,255,255,0.7)',
                textDecoration: 'none',
                transition: 'all 0.3s',
                textShadow: '0 2px 4px rgba(0,0,0,0.5)'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.color = 'white';
                e.currentTarget.style.textShadow = '0 0 15px rgba(147, 112, 219, 0.8)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
                e.currentTarget.style.textShadow = '0 2px 4px rgba(0,0,0,0.5)';
              }}
              >
                {link}
              </a>
            ))}
          </div>
        </footer>
      </div>

      <style jsx global>{`
        @keyframes twinkle {
          0% { opacity: 0.3; }
          100% { opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}
