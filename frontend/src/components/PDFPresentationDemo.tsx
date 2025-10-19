'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { storage, db, auth } from '../app/lib/firebase';
import { useSocket } from '../hooks/useSocket';
import { generatePDFSummary } from '../utils/geminiApi';

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
  const { socket, isConnected, createRoom, createRoomWithPdf, currentRoom, isAnonymous } = useSocket();
  const [isClient, setIsClient] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isCreatingRoom, setIsCreatingRoom] = useState<boolean>(false);
  const [isSummarizing, setIsSummarizing] = useState<boolean>(false);
  const [isExtractingText, setIsExtractingText] = useState<boolean>(false);
  const [textExtractionProgress, setTextExtractionProgress] = useState<number>(0);
  const [summary, setSummary] = useState<string>('');
  const [pageTexts, setPageTexts] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Timer states
  const [estimatedTime, setEstimatedTime] = useState<number>(0);
  const [slideTimings, setSlideTimings] = useState<number[]>([]);

  // Set client-side flag
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Listen for room creation and navigate
  useEffect(() => {
    if (currentRoom && isCreatingRoom) {
      setIsCreatingRoom(false);
      router.push(`/${currentRoom}`);
    }
  }, [currentRoom, isCreatingRoom, router]);

  // Format time helper
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle time updates from PDFViewer
  const handleTimeUpdate = (timings: number[], estimatedTotal: number) => {
    setSlideTimings(timings);
    setEstimatedTime(estimatedTotal);
  };

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

    if (isAnonymous) {
      setError("Anonymous users cannot create presentations. Please sign in to create a presentation.");
      return;
    }

    if (!socket || !isConnected) {
      setError("Not connected to server. Please try again.");
      return;
    }

    try {
      console.log('🚀 Starting presentation creation process...');
      setIsUploading(true);
      setIsCreatingRoom(true);
      setError(null);
      setUploadProgress(0);

      let finalPdfUrl = pdfUrl;
      let fileName = 'External PDF';
      let fileSize = 0;

      if (pdfFile && pdfUrl.startsWith('blob:')) {
        console.log('📁 Uploading file to Firebase Storage...', {
          fileName: pdfFile.name,
          fileSize: pdfFile.size,
          fileType: pdfFile.type
        });

        fileName = pdfFile.name;
        fileSize = pdfFile.size;

        const storageRef = storage.ref(`presentations/${user.uid}/${Date.now()}_${pdfFile.name}`);
        const uploadTask = storageRef.put(pdfFile);

        uploadTask.on('state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(progress);
            console.log(`📤 Upload progress: ${Math.round(progress)}%`);
          },
          (error) => {
            console.error('❌ Upload error:', error);
            throw error;
          }
        );

        await uploadTask;
        finalPdfUrl = await storageRef.getDownloadURL();
        console.log('✅ File uploaded successfully to Firebase Storage:', finalPdfUrl);
      } else {
        console.log('🌐 Using external PDF URL:', finalPdfUrl);
      }

      console.log('💾 Saving presentation metadata to Firestore...');
      const presentationDoc = await db.collection('presentations').add({
        pdfUrl: finalPdfUrl,
        pdfType: pdfFile ? 'uploaded' : 'external',
        userId: user.uid,
        userEmail: user.email,
        fileName: fileName,
        fileSize: fileSize,
        createdAt: new Date().toISOString(),
      });

      console.log('✅ Presentation saved to Firestore with ID:', presentationDoc.id);

      // Extract text from PDF first
      console.log('📄 Starting PDF text extraction...');
      setIsExtractingText(true);
      setTextExtractionProgress(0);
      setError(null);

      let pdfSummary = '';
      let extractedPageTexts: string[] = [];
      try {
        // Dynamically import PDF text extraction functions
        const { extractTextFromPDF, extractTextFromPDFFile } = await import('../utils/pdfTextExtractor');
        
        // Extract text from PDF with progress tracking
        const textExtraction = pdfFile
          ? await extractTextFromPDFFile(pdfFile, {
              onProgress: (progress, currentPage, totalPages) => {
                setTextExtractionProgress(progress);
                console.log(`📄 Text extraction progress: ${progress}% (page ${currentPage}/${totalPages})`);
              }
            })
          : await extractTextFromPDF(finalPdfUrl, {
              onProgress: (progress, currentPage, totalPages) => {
                setTextExtractionProgress(progress);
                console.log(`📄 Text extraction progress: ${progress}% (page ${currentPage}/${totalPages})`);
              }
            });

        if (textExtraction.success && textExtraction.text) {
          console.log('📄 PDF text extracted, length:', textExtraction.text.length);
          console.log('📄 PDF page texts extracted, pages:', textExtraction.pageTexts.length);
          setTextExtractionProgress(100);

          // Store page texts
          extractedPageTexts = textExtraction.pageTexts;
          setPageTexts(extractedPageTexts);

          // Generate summary using Gemini
          console.log('🤖 Starting PDF summarization...');
          setIsExtractingText(false);
          setIsSummarizing(true);
          
          const summaryResult = await generatePDFSummary(textExtraction.text, fileName);
          if (summaryResult.success) {
            pdfSummary = summaryResult.summary;
            setSummary(pdfSummary);
            console.log('✅ PDF summary generated successfully');
          } else {
            console.warn('⚠️ PDF summary generation failed:', summaryResult.error);
            pdfSummary = summaryResult.summary; // Use fallback summary
          }
        } else {
          console.warn('⚠️ PDF text extraction failed:', textExtraction.error);
          pdfSummary = 'Unable to extract text from PDF for summarization.';
          extractedPageTexts = textExtraction.pageTexts || [];
          setTextExtractionProgress(0);
        }
      } catch (summaryError) {
        console.error('❌ Error during PDF processing:', summaryError);
        pdfSummary = 'Error generating PDF summary.';
        extractedPageTexts = [];
        setTextExtractionProgress(0);
      } finally {
        setIsExtractingText(false);
        setIsSummarizing(false);
      }

      // Store in localStorage for room access (including summary and page texts)
      localStorage.setItem('presentation-id', presentationDoc.id);
      localStorage.setItem('presentation-pdf-url', finalPdfUrl);
      localStorage.setItem('presentation-summary', pdfSummary);
      localStorage.setItem('presentation-page-texts', JSON.stringify(extractedPageTexts));
      console.log('💾 Stored presentation data in localStorage including summary and page texts');

      // Create room using socket with PDF URL, summary, and page texts
      console.log('🏠 Creating room with PDF URL, summary, and page texts:', finalPdfUrl);
      createRoomWithPdf(finalPdfUrl, pdfSummary, extractedPageTexts);

    } catch (error) {
      console.error('❌ Error creating presentation:', error);
      setError('Failed to create presentation. Please try again.');
      setIsCreatingRoom(false);
      setIsSummarizing(false);
      setIsExtractingText(false);
      setTextExtractionProgress(0);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Show loading state during SSR
  if (!isClient) {
    return (
      <div style={{ padding: '24px', maxWidth: '100%', margin: '0 auto' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%)',
            backdropFilter: 'blur(20px)',
            borderRadius: '20px',
            padding: '80px 40px',
            textAlign: 'center',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            border: '1px solid rgba(255,255,255,0.2)'
          }}>
            <div style={{
              fontSize: '48px',
              marginBottom: '24px',
              filter: 'drop-shadow(0 0 20px rgba(255,255,255,0.5))'
            }}>
              ⏳
            </div>
            <h2 style={{
              fontSize: '24px',
              fontWeight: '600',
              color: 'white',
              marginBottom: '12px',
              textShadow: '0 0 20px rgba(147, 112, 219, 0.8)'
            }}>
              Loading PDF Uploader
            </h2>
            <p style={{
              color: 'rgba(255,255,255,0.7)',
              fontSize: '16px',
              textShadow: '0 2px 4px rgba(0,0,0,0.5)'
            }}>
              Preparing stellar PDF processing capabilities...
            </p>
          </div>
        </div>
      </div>
    );
  }

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

        {/* Timer Display - ADD THIS */}
        {totalPages > 0 && pdfUrl && (
          <div style={{
            padding: '20px 28px',
            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.25) 0%, rgba(118, 75, 162, 0.25) 100%)',
            backdropFilter: 'blur(15px)',
            borderRadius: '16px',
            marginBottom: '20px',
            border: '1px solid rgba(255,255,255,0.3)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              color: 'white'
            }}>
              <span style={{ fontSize: '32px' }}>⏱️</span>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: '20px',
                  fontWeight: '700',
                  textShadow: '0 2px 10px rgba(147, 112, 219, 0.8)',
                  marginBottom: '4px'
                }}>
                  Estimated Total Time: {formatTime(estimatedTime)}
                </div>
                <div style={{
                  fontSize: '14px',
                  color: 'rgba(255,255,255,0.8)',
                  textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                }}>
                  Based on your current pace • Slide {currentPage} of {totalPages}
                </div>
              </div>
            </div>
          </div>
        )}

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

          {/* Processing Status Display */}
          {(isExtractingText || isSummarizing) && (
            <div style={{
              marginTop: '16px',
              background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(59, 130, 246, 0.2) 100%)',
              border: '2px solid rgba(34, 197, 94, 0.4)',
              borderRadius: '12px',
              backdropFilter: 'blur(10px)',
              padding: '16px 20px'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '12px'
              }}>
                <div style={{
                  fontSize: '20px',
                  animation: isExtractingText || isSummarizing ? 'pulse 1.5s ease-in-out infinite' : 'none'
                }}>
                  {isExtractingText ? '📄' : '🤖'}
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: 'rgba(255,255,255,0.9)',
                    marginBottom: '4px',
                    textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                  }}>
                    {isExtractingText ? 'Extracting PDF Text' : 'Gemini AI Processing'}
                  </h3>
                  <p style={{
                    fontSize: '14px',
                    color: 'rgba(255,255,255,0.8)',
                    textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                  }}>
                    {isExtractingText 
                      ? `Processing ${totalPages} pages... ${Math.round(textExtractionProgress)}% complete`
                      : 'Analyzing content and generating summary...'
                    }
                  </p>
                </div>
              </div>
              {isExtractingText && (
                <div style={{
                  width: '100%',
                  height: '6px',
                  background: 'rgba(255,255,255,0.2)',
                  borderRadius: '3px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${textExtractionProgress}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #22c55e 0%, #3b82f6 100%)',
                    borderRadius: '3px',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
              )}
            </div>
          )}

          {/* PDF Summary Display */}
          {summary && (
            <div style={{
              marginTop: '16px',
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(147, 51, 234, 0.2) 100%)',
              border: '2px solid rgba(59, 130, 246, 0.4)',
              borderRadius: '12px',
              backdropFilter: 'blur(10px)',
              padding: '16px 20px'
            }}>
              <h3 style={{
                fontSize: '16px',
                fontWeight: '600',
                color: 'rgba(255,255,255,0.9)',
                marginBottom: '12px',
                textShadow: '0 2px 4px rgba(0,0,0,0.5)'
              }}>
                🤖 AI Summary
              </h3>
              <p style={{
                fontSize: '14px',
                color: 'rgba(255,255,255,0.8)',
                lineHeight: '1.6',
                textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                whiteSpace: 'pre-wrap'
              }}>
                {summary}
              </p>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div style={{
              marginTop: '16px',
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(220, 38, 38, 0.2) 100%)',
              border: '2px solid rgba(239, 68, 68, 0.5)',
              color: 'rgba(255, 150, 150, 0.95)',
              padding: '16px 20px',
              borderRadius: '12px',
              backdropFilter: 'blur(10px)',
              textShadow: '0 2px 4px rgba(0,0,0,0.5)'
            }}>
              {error}
            </div>
          )}

          {/* Create Presentation Button */}
          <div style={{ marginTop: '24px' }}>
            <button
              onClick={handleCreatePresentation}
              disabled={!pdfUrl || isUploading || isCreatingRoom || isSummarizing || isExtractingText || !isConnected || isAnonymous}
              style={{
                width: '100%',
                padding: '16px 24px',
                background: (pdfUrl && !isUploading && !isCreatingRoom && !isSummarizing && !isExtractingText && isConnected && !isAnonymous)
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                  : 'rgba(100,100,100,0.3)',
                color: 'white',
                border: '2px solid rgba(255,255,255,0.3)',
                borderRadius: '14px',
                fontSize: '16px',
                fontWeight: '700',
                cursor: (pdfUrl && !isUploading && !isCreatingRoom && !isSummarizing && !isExtractingText && isConnected && !isAnonymous) ? 'pointer' : 'not-allowed',
                transition: 'all 0.3s',
                boxShadow: (pdfUrl && !isUploading && !isCreatingRoom && !isSummarizing && !isExtractingText && isConnected && !isAnonymous) ? '0 6px 25px rgba(147, 112, 219, 0.5)' : 'none',
                textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                opacity: (!pdfUrl || isUploading || isCreatingRoom || isSummarizing || isExtractingText || !isConnected || isAnonymous) ? 0.5 : 1
              }}
              onMouseOver={(e) => {
                if (pdfUrl && !isUploading && !isCreatingRoom && !isSummarizing && !isExtractingText && isConnected && !isAnonymous) {
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.boxShadow = '0 10px 35px rgba(147, 112, 219, 0.6)';
                }
              }}
              onMouseOut={(e) => {
                if (pdfUrl && !isUploading && !isCreatingRoom && !isSummarizing && !isExtractingText && isConnected && !isAnonymous) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 6px 25px rgba(147, 112, 219, 0.5)';
                }
              }}
            >
              {isUploading
                ? `🚀 Uploading... ${Math.round(uploadProgress)}%`
                : isExtractingText
                  ? `📄 Extracting text... ${Math.round(textExtractionProgress)}%`
                  : isSummarizing
                    ? '🤖 Gemini is thinking...'
                    : isCreatingRoom
                      ? '🌟 Creating Room...'
                      : !isConnected
                        ? '🔌 Connecting...'
                        : isAnonymous
                          ? '🔒 Sign In Required'
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
            height: 'calc(100vh - 500px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            border: '1px solid rgba(255,255,255,0.2)'
          }}>
            <PresentationViewer
              pdfUrl={pdfUrl}
              onPageChange={setCurrentPage}
              onTotalPagesChange={setTotalPages}
              onTimeUpdate={handleTimeUpdate}
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
            height: 'calc(100vh - 500px)',
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
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default PDFPresentationDemo;
