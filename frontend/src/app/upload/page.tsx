"use client";

import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import PDFPresentationDemo from "../../components/PDFPresentationDemo";
import Navbar from "../../components/Navbar";

export default function UploadPage() {
  const { user, loading } = useAuth();

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

  if (!user) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #0a0e27 0%, #1a1a3e 50%, #2d1b3d 100%)',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
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
          zIndex: 1,
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '80px',
            marginBottom: '24px',
            filter: 'drop-shadow(0 0 20px rgba(255,255,255,0.5))'
          }}>
            🔒
          </div>
          <h2 style={{
            color: 'white',
            fontSize: '32px',
            fontWeight: 'bold',
            marginBottom: '16px',
            textShadow: '0 0 30px rgba(147, 112, 219, 0.8)'
          }}>
            Stellar Access Required
          </h2>
          <p style={{
            color: 'rgba(255,255,255,0.8)',
            fontSize: '16px',
            marginBottom: '32px',
            lineHeight: '1.6',
            textShadow: '0 2px 10px rgba(0,0,0,0.5)'
          }}>
            Please sign in to upload PDF presentations and launch them among the stars
          </p>
          <Link href="/login">
            <button style={{
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
              ✨ Sign In to Continue
            </button>
          </Link>
        </div>
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
      {/* Stars Background */}
      <div style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        background: `
          radial-gradient(2px 2px at 20% 30%, white, transparent),
          radial-gradient(2px 2px at 60% 70%, white, transparent),
          radial-gradient(1px 1px at 50% 50%, white, transparent),
          radial-gradient(1px 1px at 80% 10%, white, transparent),
          radial-gradient(2px 2px at 90% 60%, white, transparent)
        `,
        backgroundSize: '200px 200px, 300px 300px, 250px 250px, 280px 280px, 320px 320px',
        animation: 'twinkle 3s ease-in-out infinite alternate',
        pointerEvents: 'none',
        opacity: 0.5
      }} />

      {/* Navbar */}
      <Navbar />

      {/* PDF Upload Component */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <PDFPresentationDemo />
      </div>

      <style jsx global>{`
        @keyframes twinkle {
          0% { opacity: 0.3; }
          100% { opacity: 0.7; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
