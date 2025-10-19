"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import Login from "../../components/Login";

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Redirect to home if already logged in
    if (user && !loading) {
      router.push("/");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(180deg, #000000 0%, #15151c 50%, #0a0a0a 100%)',
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

  if (user) {
    return null; // Will redirect via useEffect
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(180deg, #000000 0%, #15151c 50%, #0a0a0a 100%)',
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

        <Login />
      </div>

      <style jsx global>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
