"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../app/context/AuthContext";

export default function Navbar() {
  const router = useRouter();
  const { user, signOut } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <nav style={{
      padding: '20px 40px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      backdropFilter: 'blur(10px)',
      background: 'rgba(255,255,255,0.05)',
      borderBottom: '1px solid rgba(255,255,255,0.1)'
    }}>
      <Link href="/" style={{ textDecoration: 'none' }}>
        <div style={{
          color: 'white',
          fontSize: '24px',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          textShadow: '0 0 20px rgba(147, 112, 219, 0.8)',
          cursor: 'pointer'
        }}>
          <span style={{ fontSize: '36px' }}>🌟</span>
          <span>PromptDeck</span>
        </div>
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        <Link
          href="/"
          style={{
            color: 'rgba(255,255,255,0.8)',
            textDecoration: 'none',
            fontSize: '16px',
            fontWeight: '500',
            transition: 'all 0.3s',
            textShadow: '0 2px 4px rgba(0,0,0,0.5)'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.color = 'white';
            e.currentTarget.style.textShadow = '0 0 15px rgba(147, 112, 219, 0.8)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.color = 'rgba(255,255,255,0.8)';
            e.currentTarget.style.textShadow = '0 2px 4px rgba(0,0,0,0.5)';
          }}
        >
          Home
        </Link>

        <Link
          href="/upload"
          style={{
            color: 'rgba(255,255,255,0.8)',
            textDecoration: 'none',
            fontSize: '16px',
            fontWeight: '500',
            transition: 'all 0.3s',
            textShadow: '0 2px 4px rgba(0,0,0,0.5)'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.color = 'white';
            e.currentTarget.style.textShadow = '0 0 15px rgba(147, 112, 219, 0.8)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.color = 'rgba(255,255,255,0.8)';
            e.currentTarget.style.textShadow = '0 2px 4px rgba(0,0,0,0.5)';
          }}
        >
          Upload PDF
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {user ? (
            <>
              <span style={{
                color: 'rgba(255,255,255,0.8)',
                fontSize: '14px',
                textShadow: '0 2px 4px rgba(0,0,0,0.5)'
              }}>
                {user.displayName || user.email}
              </span>
              <button
                onClick={handleLogout}
                style={{
                  padding: '10px 24px',
                  background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: '20px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  boxShadow: '0 4px 15px rgba(220, 53, 69, 0.4)',
                  textShadow: '0 2px 4px rgba(0,0,0,0.3)'
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
                Logout
              </button>
            </>
          ) : (
            <Link href="/login">
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
          )}
        </div>
      </div>
    </nav>
  );
}
