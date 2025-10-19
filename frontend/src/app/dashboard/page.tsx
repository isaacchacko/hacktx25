"use client";

import { useState, ChangeEvent } from 'react';
import Link from 'next/link';
import { useAuth } from "../context/AuthContext";

interface Presentation {
  id: number;
  name: string;
  code: string;
  date: string;
}

export default function PresenterDashboard() {
  const { user, loading } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [presentations] = useState<Presentation[]>([
    { id: 1, name: 'Q1 Sales Report.pdf', code: 'STAR01', date: '2025-10-15' },
    { id: 2, name: 'Product Launch.pptx', code: 'MOON42', date: '2025-10-10' }
  ]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #0a0e27 0%, #1a1a3e 100%)', position: 'relative', overflow: 'hidden' }}>
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
        opacity: 0.4,
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
          <Link href="/" style={{ textDecoration: 'none' }}>
            <h1 style={{ 
              color: 'white', 
              margin: 0, 
              fontSize: '28px',
              textShadow: '0 0 20px rgba(147, 112, 219, 0.8)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer',
              transition: 'all 0.3s'
            }}
            onMouseOver={(e) => e.currentTarget.style.textShadow = '0 0 30px rgba(147, 112, 219, 1)'}
            onMouseOut={(e) => e.currentTarget.style.textShadow = '0 0 20px rgba(147, 112, 219, 0.8)'}
            >
              <span style={{ fontSize: '36px' }}>🌟</span> Stellar Dashboard
            </h1>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '22px' }}>
          <span style={{ color: 'rgba(255,255,255,0.8)', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
            👤 {user?.displayName || user?.email}
          </span>

            <Link href="/auth">
              <button style={{
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
                Logout
              </button>
            </Link>
          </div>
        </header>

        <div style={{
          maxWidth: '1200px',
          margin: '45px auto',
          padding: '0 25px'
        }}>
          {/* Upload Section */}
          <section style={{
            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%)',
            backdropFilter: 'blur(20px)',
            borderRadius: '20px',
            padding: '40px',
            marginBottom: '35px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            border: '1px solid rgba(255,255,255,0.15)'
          }}>
            <h2 style={{ 
              color: 'white', 
              marginBottom: '25px', 
              fontSize: '24px',
              textShadow: '0 0 20px rgba(147, 112, 219, 0.8)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              ☄️ Upload to the Cosmos
            </h2>

            <div style={{
              border: '3px dashed rgba(147, 112, 219, 0.5)',
              borderRadius: '16px',
              padding: '50px',
              textAlign: 'center',
              background: 'rgba(255,255,255,0.03)',
              cursor: 'pointer',
              transition: 'all 0.3s',
              marginBottom: '25px'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = 'rgba(147, 112, 219, 0.8)';
              e.currentTarget.style.background = 'rgba(102, 126, 234, 0.1)';
              e.currentTarget.style.boxShadow = '0 0 30px rgba(147, 112, 219, 0.3)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = 'rgba(147, 112, 219, 0.5)';
              e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
              e.currentTarget.style.boxShadow = 'none';
            }}
            >
              <input
                type="file"
                accept=".pdf,.ppt,.pptx"
                onChange={handleFileChange}
                style={{ display: 'none' }}
                id="file-input"
              />
              <label htmlFor="file-input" style={{ cursor: 'pointer' }}>
                <div style={{ fontSize: '64px', marginBottom: '15px', filter: 'drop-shadow(0 0 15px rgba(255,255,255,0.5))' }}>
                  {file ? '✅' : '🌠'}
                </div>
                <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '18px', marginBottom: '8px', fontWeight: '600' }}>
                  {file ? `Selected: ${file.name}` : 'Click to choose your stellar presentation'}
                </p>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>
                  PDF, PowerPoint, or Google Slides
                </p>
              </label>
            </div>

            {file && (
              <button style={{
                width: '100%',
                padding: '18px',
                background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '12px',
                fontSize: '18px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.3s',
                boxShadow: '0 6px 25px rgba(40, 167, 69, 0.4)',
                textShadow: '0 2px 4px rgba(0,0,0,0.3)'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = '0 10px 35px rgba(40, 167, 69, 0.6)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 6px 25px rgba(40, 167, 69, 0.4)';
              }}
              >
                🚀 Launch to Universe
              </button>
            )}
          </section>

          {/* Presentations List */}
          <section style={{
            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%)',
            backdropFilter: 'blur(20px)',
            borderRadius: '20px',
            padding: '40px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            border: '1px solid rgba(255,255,255,0.15)'
          }}>
            <h2 style={{ 
              color: 'white', 
              marginBottom: '30px', 
              fontSize: '24px',
              textShadow: '0 0 20px rgba(147, 112, 219, 0.8)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              ⭐ Your Stellar Archives
            </h2>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '25px'
            }}>
              {presentations.map((pres) => (
                <div key={pres.id} style={{
                  background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '16px',
                  padding: '25px',
                  transition: 'all 0.3s',
                  backdropFilter: 'blur(10px)'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-8px)';
                  e.currentTarget.style.boxShadow = '0 15px 40px rgba(102, 126, 234, 0.4)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                >
                  <div style={{ fontSize: '48px', marginBottom: '15px', filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.3))' }}>
                    📄
                  </div>
                  <h3 style={{
                    color: 'white',
                    marginBottom: '18px',
                    fontSize: '18px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    textShadow: '0 2px 10px rgba(0,0,0,0.5)'
                  }}>
                    {pres.name}
                  </h3>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '18px',
                    fontSize: '14px',
                    color: 'rgba(255,255,255,0.7)'
                  }}>
                    <span>
                      Code: <strong style={{ 
                        color: '#9370db', 
                        fontFamily: 'monospace', 
                        fontSize: '16px',
                        textShadow: '0 0 10px rgba(147, 112, 219, 0.8)'
                      }}>
                        {pres.code}
                      </strong>
                    </span>
                    <span>{pres.date}</span>
                  </div>
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
                    transition: 'all 0.3s',
                    boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
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
                    🚀 Launch Presentation
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
