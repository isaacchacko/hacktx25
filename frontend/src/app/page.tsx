"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "./context/AuthContext";
import Navbar from "../components/Navbar";
import Galaxy from "../components/Galaxy";
import BouncyCards from "../components/BouncyCards";

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
        background: '#0a0e27',
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
      position: 'relative',
      overflow: 'hidden',
      background: '#0a0e27'
    }}>
      {/* Galaxy Background */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0
      }}>
        <Galaxy 
          mouseRepulsion={true}
          mouseInteraction={true}
          density={1}
          glowIntensity={0.3}
          saturation={0}
          hueShift={200}
          transparent={false}
          speed={1.0}
          twinkleIntensity={0.3}
          rotationSpeed={0.1}
          repulsionStrength={2}
        />
      </div>

      {/* Content Container */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', pointerEvents: 'none' }}>
        <Navbar />

        {/* Hero Section */}
        <main style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px 20px',
          textAlign: 'center',
          pointerEvents: 'none'
        }}>
          <div style={{ maxWidth: '1200px', pointerEvents: 'auto' }}>
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

            {/* Bouncy Cards */}
            <BouncyCards isLoggedIn={!!user} />
          </div>
        </main>
      </div>

      <style jsx global>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
