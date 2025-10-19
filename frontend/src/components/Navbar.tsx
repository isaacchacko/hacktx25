"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../app/context/AuthContext";
import { StarLogo } from "./StarLogo";

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
      margin: '20px 40px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      backdropFilter: 'blur(20px)',
      background: 'rgba(255,255,255,0.08)',
      border: '1px solid rgba(255,255,255,0.15)',
      borderRadius: '20px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
    }}>
      <Link href="/" style={{ textDecoration: 'none' }}>
        <div style={{
          color: 'white',
          fontSize: '24px',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          textShadow: '0 0 20px rgba(251, 191, 36, 0.5)',
          cursor: 'pointer'
        }}>
          <StarLogo size={36} />
          <span>PromptDeck</span>
        </div>
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>


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
