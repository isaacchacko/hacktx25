"use client";

import { useState, ChangeEvent, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from "../context/AuthContext";
import Navbar from "../../components/Navbar";
import { db } from "../lib/firebase";
import { useSocket } from "../../hooks/useSocket";

interface Presentation {
  id: string;
  fileName: string;
  pdfUrl: string;
  pdfType: 'uploaded' | 'external';
  fileSize: number;
  createdAt: string;
  userEmail: string;
}

export default function PresenterDashboard() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { socket, isConnected } = useSocket();
  const [file, setFile] = useState<File | null>(null);
  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  // Fetch user presentations from Firestore
  useEffect(() => {
    const fetchPresentations = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }
      
      try {
        setIsLoading(true);
        setLoadError(null);
        
        const snapshot = await db.collection('presentations')
          .where('userId', '==', user.uid)
          .orderBy('createdAt', 'desc')
          .get();
        
        const fetchedPresentations = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Presentation[];
        
        // Dedupe by pdfUrl
        const uniquePresentations = fetchedPresentations.filter((presentation, index, self) => 
          index === self.findIndex(p => p.pdfUrl === presentation.pdfUrl)
        );
        
        setPresentations(uniquePresentations);
      } catch (error) {
        console.error('Error fetching presentations:', error);
        setLoadError('Failed to load presentations');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPresentations();
  }, [user]);

  const handleViewPresentation = (presentation: Presentation) => {
    const proxyUrl = `/api/pdf-proxy?url=${encodeURIComponent(presentation.pdfUrl)}`;
    window.open(proxyUrl, '_blank');
  };

  const handleLaunchPresentation = async (presentation: Presentation) => {
    if (!socket || !isConnected || !user) {
      console.error('Socket not connected or user not authenticated');
      return;
    }

    try {
      // Clear any previous PDF URL from localStorage to prevent showing old PDF
      localStorage.removeItem('presentation-pdf-url');
      
      // Emit create-room-with-pdf event
      socket.emit('create-room-with-pdf', {
        pdfUrl: presentation.pdfUrl,
        fileName: presentation.fileName
      });

      // Listen for room creation response
      socket.once('room-created', (data: { joinCode: string }) => {
        router.push(`/${data.joinCode}`);
      });

      // Handle errors
      socket.once('error', (error: string) => {
        console.error('Error creating room:', error);
      });
    } catch (error) {
      console.error('Error launching presentation:', error);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #000000 0%, #15151c 50%, #0a0a0a 100%)', position: 'relative', overflow: 'hidden' }}>
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
        <Navbar />

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
              {/* Loading State */}
              {isLoading && (
                <div style={{
                  gridColumn: '1 / -1',
                  textAlign: 'center',
                  padding: '40px',
                  color: 'rgba(255,255,255,0.7)'
                }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    border: '4px solid rgba(147, 112, 219, 0.3)',
                    borderTopColor: '#9370db',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto 16px'
                  }} />
                  <p>Loading your stellar archives...</p>
                </div>
              )}

              {/* Error State */}
              {loadError && (
                <div style={{
                  gridColumn: '1 / -1',
                  background: 'rgba(220, 53, 69, 0.2)',
                  border: '1px solid rgba(220, 53, 69, 0.4)',
                  borderRadius: '12px',
                  padding: '20px',
                  textAlign: 'center',
                  color: '#ff6b6b'
                }}>
                  <p>{loadError}</p>
                </div>
              )}

              {/* Empty State */}
              {!isLoading && !loadError && presentations.length === 0 && (
                <div style={{
                  gridColumn: '1 / -1',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  padding: '40px',
                  textAlign: 'center',
                  color: 'rgba(255,255,255,0.7)'
                }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>🌌</div>
                  <h3 style={{ color: 'white', marginBottom: '8px' }}>No presentations yet</h3>
                  <p>Upload your first presentation using the "Launch Presentation" card above to get started!</p>
                </div>
              )}

              {/* Presentations List */}
              {!isLoading && !loadError && presentations.map((pres) => (
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
                    {pres.fileName}
                  </h3>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '18px',
                    fontSize: '14px',
                    color: 'rgba(255,255,255,0.7)'
                  }}>
                    <span>
                      Size: <strong style={{
                        color: '#9370db',
                        fontSize: '14px'
                      }}>
                        {pres.fileSize > 0 ? `${(pres.fileSize / 1024 / 1024).toFixed(1)} MB` : 'Unknown'}
                      </strong>
                    </span>
                    <span>{new Date(pres.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      onClick={() => handleViewPresentation(pres)}
                      style={{
                        flex: 1,
                        padding: '12px',
                        background: 'linear-gradient(135deg, #4ade80 0%, #34d399 100%)',
                        color: 'white',
                        border: '1px solid rgba(255,255,255,0.3)',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: '600',
                        transition: 'all 0.3s',
                        boxShadow: '0 4px 15px rgba(74, 222, 128, 0.4)',
                        textShadow: '0 2px 4px rgba(0,0,0,0.3)'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 6px 20px rgba(74, 222, 128, 0.6)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 15px rgba(74, 222, 128, 0.4)';
                      }}
                    >
                      👁️ View
                    </button>
                    <button 
                      onClick={() => handleLaunchPresentation(pres)}
                      disabled={!isConnected || !user}
                      style={{
                        flex: 1,
                        padding: '12px',
                        background: isConnected && user 
                          ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                          : 'rgba(255,255,255,0.1)',
                        color: 'white',
                        border: '1px solid rgba(255,255,255,0.3)',
                        borderRadius: '8px',
                        cursor: (isConnected && user) ? 'pointer' : 'not-allowed',
                        fontSize: '13px',
                        fontWeight: '600',
                        transition: 'all 0.3s',
                        boxShadow: isConnected && user 
                          ? '0 4px 15px rgba(102, 126, 234, 0.4)'
                          : 'none',
                        textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                        opacity: (isConnected && user) ? 1 : 0.5
                      }}
                      onMouseOver={(e) => {
                        if (isConnected && user) {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.6)';
                        }
                      }}
                      onMouseOut={(e) => {
                        if (isConnected && user) {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
                        }
                      }}
                    >
                      🚀 Launch
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
