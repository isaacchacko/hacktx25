'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { storage, db, auth } from '../app/lib/firebase';

// Dynamically import PresentationViewer to prevent SSR issues
const PresentationViewer = dynamic(() => import('./PresentationViewer'), {
  ssr: false,
  loading: () => (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '384px',
      background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
      backdropFilter: 'blur(20px)',
      borderRadius: '16px',
      border: '1px solid rgba(255,255,255,0.2)'
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
        <p style={{ color: 'rgba(255,255,255,0.8)' }}>Loading stellar PDF viewer...</p>
      </div>
    </div>
  )
});

const PDFPresentationDemo: React.FC = () => {
  const router = useRouter();
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      const url = URL.createObjectURL(file);
      setPdfUrl(url);
      setPdfFile(file);
    } else {
      alert('Please select a valid PDF file');
    }
  };

  const handleUrlInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPdfUrl(event.target.value);
    setPdfFile(null);
  };

  const handleCreatePresentation = async () => {
    if (!pdfUrl) return;

    const user = auth.currentUser;
    if (!user) {
      alert('Please sign in to create a presentation');
      router.push('/login');
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);
      let finalPdfUrl = pdfUrl;
      let fileName = 'External PDF';
      let fileSize = 0;

      if (pdfFile && pdfUrl.startsWith('blob:')) {
        fileName = pdfFile.name;
        fileSize = pdfFile.size;

        const storageRef = storage.ref(`presentations/${user.uid}/${Date.now()}_${pdfFile.name}`);
        const uploadTask = storageRef.put(pdfFile);

        uploadTask.on('state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(progress);
          },
          (error) => {
            console.error('Upload error:', error);
            throw error;
          }
        );

        await uploadTask;
        finalPdfUrl = await storageRef.getDownloadURL();
      }

      const presentationDoc = await db.collection('presentations').add({
        pdfUrl: finalPdfUrl,
        pdfType: pdfFile ? 'uploaded' : 'external',
        userId: user.uid,
        userEmail: user.email,
        fileName: fileName,
        fileSize: fileSize,
        createdAt: new Date().toISOString(),
      });

      localStorage.setItem('presentation-id', presentationDoc.id);
      localStorage.setItem('presentation-pdf-url', finalPdfUrl);

      router.push('/start-presenting');

    } catch (error) {
      console.error('Error creating presentation:', error);
      alert('Failed to create presentation. Please try again.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '100%', margin: '0 auto' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: 'bold',
          color: 'white',
          marginBottom: '24px',
          textAlign: 'center',
          textShadow: '0 0 30px rgba(147, 112, 219, 0.8)'
        }}>
          ☄️ Stellar PDF Uploader
        </h1>

        {/* Controls */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%)',
          backdropFilter: 'blur(20px)',
          borderRadius: '20px',
          padding: '32px',
          marginBottom: '24px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          border: '1px solid rgba(255,255,255,0.2)'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '24px',
            marginBottom: '24px'
          }}>
            {/* File Upload */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: 'rgba(255,255,255,0.9)',
                marginBottom: '10px',
                textShadow: '0 2px 4px rgba(0,0,0,0.5)'
              }}>
                🚀 Upload PDF File
              </label>
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '12px',
                  background: 'rgba(255,255,255,0.08)',
                  border: '2px solid rgba(255,255,255,0.2)',
                  borderRadius: '12px',
                  color: 'white',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  backdropFilter: 'blur(10px)'
                }}
              />
            </div>

            {/* URL Input */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: 'rgba(255,255,255,0.9)',
                marginBottom: '10px',
                textShadow: '0 2px 4px rgba(0,0,0,0.5)'
              }}>
                🌐 Or enter PDF URL
              </label>
              <input
                type="url"
                placeholder="https://example.com/document.pdf"
                value={pdfUrl}
                onChange={handleUrlInput}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid rgba(255,255,255,0.2)',
                  borderRadius: '12px',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  background: 'rgba(255,255,255,0.08)',
                  color: 'white',
                  backdropFilter: 'blur(10px)',
                  transition: 'all 0.3s'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(147, 112, 219, 0.8)';
                  e.currentTarget.style.boxShadow = '0 0 20px rgba(147, 112, 219, 0.3)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>
          </div>

          {/* Status */}
          {pdfUrl && (
            <div style={{
              marginTop: '16px',
              padding: '16px',
              background: 'linear-gradient(135deg, rgba(102, 234, 147, 0.2) 0%, rgba(75, 162, 118, 0.2) 100%)',
              border: '2px solid rgba(102, 234, 147, 0.4)',
              borderRadius: '12px',
              backdropFilter: 'blur(10px)'
            }}>
              <p style={{
                fontSize: '14px',
                color: 'rgba(200, 255, 200, 0.95)',
                textShadow: '0 2px 4px rgba(0,0,0,0.5)'
              }}>
                ✨ PDF loaded: Page {currentPage} of {totalPages}
              </p>
            </div>
          )}

          {/* Create Presentation Button */}
          <div style={{ marginTop: '24px' }}>
            <button
              onClick={handleCreatePresentation}
              disabled={!pdfUrl || isUploading}
              style={{
                width: '100%',
                padding: '16px 24px',
                background: pdfUrl && !isUploading
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                  : 'rgba(100,100,100,0.3)',
                color: 'white',
                border: '2px solid rgba(255,255,255,0.3)',
                borderRadius: '14px',
                fontSize: '16px',
                fontWeight: '700',
                cursor: pdfUrl && !isUploading ? 'pointer' : 'not-allowed',
                transition: 'all 0.3s',
                boxShadow: pdfUrl && !isUploading ? '0 6px 25px rgba(147, 112, 219, 0.5)' : 'none',
                textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                opacity: !pdfUrl || isUploading ? 0.5 : 1
              }}
              onMouseOver={(e) => {
                if (pdfUrl && !isUploading) {
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.boxShadow = '0 10px 35px rgba(147, 112, 219, 0.6)';
                }
              }}
              onMouseOut={(e) => {
                if (pdfUrl && !isUploading) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 6px 25px rgba(147, 112, 219, 0.5)';
                }
              }}
            >
              {isUploading
                ? `🚀 Uploading... ${Math.round(uploadProgress)}%`
                : '✨ Create Presentation'}
            </button>
          </div>
        </div>

        {/* PDF Viewer */}
        {pdfUrl ? (
          <div style={{
            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
            backdropFilter: 'blur(20px)',
            borderRadius: '20px',
            overflow: 'hidden',
            height: 'calc(100vh - 380px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            border: '1px solid rgba(255,255,255,0.2)'
          }}>
            <PresentationViewer
              pdfUrl={pdfUrl}
              onPageChange={setCurrentPage}
              onTotalPagesChange={setTotalPages}
              className="h-full"
            />
          </div>
        ) : (
          <div style={{
            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
            backdropFilter: 'blur(20px)',
            borderRadius: '20px',
            padding: '80px 40px',
            textAlign: 'center',
            height: 'calc(100vh - 380px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            border: '2px dashed rgba(147, 112, 219, 0.5)'
          }}>
            <div style={{
              fontSize: '96px',
              marginBottom: '24px',
              filter: 'drop-shadow(0 0 20px rgba(255,255,255,0.5))'
            }}>
              🌌
            </div>
            <h2 style={{
              fontSize: '24px',
              fontWeight: '600',
              color: 'white',
              marginBottom: '12px',
              textShadow: '0 0 20px rgba(147, 112, 219, 0.8)'
            }}>
              No PDF in the Cosmos Yet
            </h2>
            <p style={{
              color: 'rgba(255,255,255,0.7)',
              fontSize: '16px',
              textShadow: '0 2px 4px rgba(0,0,0,0.5)'
            }}>
              Upload a PDF file or enter a PDF URL to launch your stellar presentation
            </p>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default PDFPresentationDemo;
