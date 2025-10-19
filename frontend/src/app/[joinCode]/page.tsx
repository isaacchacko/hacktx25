"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useSocket } from "../../hooks/useSocket";
import { useAuth } from "../context/AuthContext";
import Navbar from "../../components/Navbar";
import { VoiceRecordingControls } from "../../components/VoiceRecordingControls";
import { TranscriptionDisplay } from "../../components/TranscriptionDisplay";

// Dynamically import PDF components to prevent SSR issues
const PDFViewer = dynamic(() => import("../../components/PDFViewer"), {
  ssr: false,
  loading: () => (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '400px',
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
        <p style={{ color: 'rgba(255,255,255,0.8)' }}>Loading PDF viewer...</p>
      </div>
    </div>
  )
});

const PDFToolbar = dynamic(() => import("../../components/PDFToolbar"), {
  ssr: false
});

const PDFNavigation = dynamic(() => import("../../components/PDFNavigation"), {
  ssr: false
});

interface Question {
  id: string;
  text: string;
  authorId: string;
  authorEmail: string;
  authorSocketId: string;
  upvotes: number;
  downvotes: number;
  votes: { [userId: string]: string }; // userId -> voteType ('upvote', 'downvote', or null)
  createdAt: string;
  answered: boolean;
}

interface TranscriptionResult {
  text: string;
  confidence: number;
  timestamp: number;
}

interface PageTranscription {
  pageNumber: number;
  transcriptions: TranscriptionResult[];
  startTime: number;
  endTime?: number;
}

export default function JoinRoomPage() {
  const params = useParams();
  const router = useRouter();
  const joinCode = params.joinCode as string;
  const { user, signOut } = useAuth();
  const { socket, isConnected, isPresenter, isAnonymous, joinRoom, currentRoom } = useSocket();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [newQuestion, setNewQuestion] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Transcription state
  const [liveTranscription, setLiveTranscription] = useState("");
  const [transcriptionHistory, setTranscriptionHistory] = useState<Array<{
    text: string;
    confidence: number;
    timestamp: number;
  }>>([]);
  const [isTranscriptionCollapsed, setIsTranscriptionCollapsed] = useState(false);

  // PDF state
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [fitMode, setFitMode] = useState<'width' | 'height' | 'page' | 'auto'>('auto');
  const [showPdfViewer, setShowPdfViewer] = useState<boolean>(false);

  // PDF page tracking for presenter
  const [presenterCurrentPage, setPresenterCurrentPage] = useState<number>(1);

  // Page-based transcription state
  const [transcriptionsByPage, setTranscriptionsByPage] = useState<{ [pageNumber: number]: PageTranscription }>({});
  const [viewByPage, setViewByPage] = useState(false); // Toggle between views
  const [isInitialized, setIsInitialized] = useState(false);

  // Fullscreen state for PDF viewer
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  
  // Share room link state
  const [showShareCopied, setShowShareCopied] = useState<boolean>(false);
  
  // Debug logging for presenter current page changes
  useEffect(() => {
    console.log('📄 Presenter current page updated to:', presenterCurrentPage);
  }, [presenterCurrentPage]);


  // Load PDF URL from localStorage on component mount
  useEffect(() => {
    console.log('🔍 Checking for PDF URL in localStorage...');
    const storedPdfUrl = localStorage.getItem('presentation-pdf-url');
    if (storedPdfUrl) {
      console.log('📄 Found PDF URL in localStorage:', storedPdfUrl);

      // Convert Firebase URL to proxy URL to bypass CORS
      const proxyUrl = `http://localhost:3001/api/pdf-proxy?url=${encodeURIComponent(storedPdfUrl)}`;
      console.log('🔄 Using proxy URL for PDF:', proxyUrl);

      setPdfUrl(proxyUrl);
      setShowPdfViewer(true);
    } else {
      console.log('❌ No PDF URL found in localStorage');
    }
    
    // Initialize page 1 for transcriptions
    if (!isInitialized) {
      setTranscriptionsByPage({
        1: {
          pageNumber: 1,
          transcriptions: [],
          startTime: Date.now()
        }
      });
      setIsInitialized(true);
    }
  }, [isInitialized]);

  useEffect(() => {
    if (socket && isConnected && currentRoom !== joinCode) {
      // Only join the room if we're not already in it
      console.log(`Joining room ${joinCode}, current room: ${currentRoom}`);
      joinRoom(joinCode);

      // Request existing questions
      socket.emit("get-questions", joinCode);
    } else if (socket && isConnected && currentRoom === joinCode) {
      // We're already in this room, just request questions
      console.log(`Already in room ${joinCode}, requesting questions`);
      socket.emit("get-questions", joinCode);
    }
  }, [socket, isConnected, joinCode, currentRoom]); // Removed user dependency

  useEffect(() => {
    if (!socket) return;

    // Set up event listeners
    const handleJoinedRoom = (data: any) => {
      console.log("Joined room:", data);
      setError(null);

      // Handle PDF URL if present in joined room data
      if (data.pdfUrl) {
        console.log("📄 Received PDF URL from joined-room event:", data.pdfUrl);

        // Convert Firebase URL to proxy URL to bypass CORS
        const proxyUrl = `http://localhost:3001/api/pdf-proxy?url=${encodeURIComponent(data.pdfUrl)}`;
        console.log('🔄 Using proxy URL for PDF:', proxyUrl);

        setPdfUrl(proxyUrl);
        setShowPdfViewer(true);
        // Store original Firebase URL in localStorage for persistence
        localStorage.setItem('presentation-pdf-url', data.pdfUrl);
      }

      // Set initial presenter current page if available
      if (data.currentPage) {
        console.log("📄 Setting initial presenter page:", data.currentPage);
        setPresenterCurrentPage(data.currentPage);
      }
    };

    const handleError = (errorMessage: string) => {
      console.error("Socket error:", errorMessage);
      setError(errorMessage);
    };

    const handleNewQuestion = (question: Question) => {
      console.log("New question:", question);
      setQuestions(prev => [...prev, question]);
    };

    const handleQuestionUpdated = (question: Question) => {
      console.log("Question updated:", question);
      setQuestions(prev => prev.map(q => q.id === question.id ? question : q));
    };

    const handleQuestionsList = (questionsList: Question[]) => {
      console.log("Questions list:", questionsList);
      setQuestions(questionsList);
    };

    const handleTranscriptionUpdate = (data: any) => {
      console.log("Transcription update:", data);
      if (data.joinCode === joinCode) {
        setLiveTranscription(data.transcription);
        setTranscriptionHistory(data.history);
      }
    };

    const handleRoomPdfUpdate = (data: any) => {
      console.log("Room PDF update:", data);
      if (data.joinCode === joinCode && data.pdfUrl) {
        console.log("📄 Received PDF URL for room:", data.pdfUrl);

        // Convert Firebase URL to proxy URL to bypass CORS
        const proxyUrl = `http://localhost:3001/api/pdf-proxy?url=${encodeURIComponent(data.pdfUrl)}`;
        console.log('🔄 Using proxy URL for PDF:', proxyUrl);

        setPdfUrl(proxyUrl);
        setShowPdfViewer(true);
        // Store original Firebase URL in localStorage for persistence
        localStorage.setItem('presentation-pdf-url', data.pdfUrl);
      }
    };

    const handlePdfPageUpdate = (data: any) => {
      console.log("📄 PDF page update received:", data);
      if (data.joinCode === joinCode) {
        console.log("📄 Updating presenter current page to:", data.currentPage);
        setPresenterCurrentPage(data.currentPage);

        // Note: Attendees can navigate freely - we only update the presenter page indicator
        // They can use the "Jump to Presenter" button if they want to sync
      }
    };

    // Add event listeners
    socket.on("joined-room", handleJoinedRoom);
    socket.on("error", handleError);
    socket.on("new-question", handleNewQuestion);
    socket.on("question-updated", handleQuestionUpdated);
    socket.on("questions-list", handleQuestionsList);
    socket.on("transcription-update", handleTranscriptionUpdate);
    socket.on("room-pdf-update", handleRoomPdfUpdate);
    socket.on("pdf-page-updated", handlePdfPageUpdate);

    // Cleanup
    return () => {
      socket.off("joined-room", handleJoinedRoom);
      socket.off("error", handleError);
      socket.off("new-question", handleNewQuestion);
      socket.off("question-updated", handleQuestionUpdated);
      socket.off("questions-list", handleQuestionsList);
      socket.off("transcription-update", handleTranscriptionUpdate);
      socket.off("room-pdf-update", handleRoomPdfUpdate);
      socket.off("pdf-page-updated", handlePdfPageUpdate);
    };
  }, [socket]);

  const postQuestion = () => {
    if (socket && newQuestion.trim()) {
      socket.emit("post-question", {
        question: newQuestion.trim(),
        joinCode: joinCode
      });
      setNewQuestion("");
    }
  };

  const handleQuestionKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      postQuestion();
    }
  };

  const markAsAnswered = (questionId: string) => {
    if (socket) {
      socket.emit("mark-answered", {
        questionId,
        joinCode: joinCode
      });
    }
  };

  const getUserVote = (question: Question): string | null => {
    if (!user) return null;
    return question.votes[user.uid] || null;
  };

  const handleVote = (questionId: string, voteType: "upvote" | "downvote" | "remove") => {
    if (socket) {
      socket.emit("vote-question", {
        questionId,
        voteType,
        joinCode: joinCode
      });
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Handle transcription updates from voice recording
  const handleTranscriptionUpdate = useCallback((transcription: string, history: Array<{
    text: string;
    confidence: number;
    timestamp: number;
  }>) => {
    console.log('Transcription update received:', { transcription, historyLength: history.length });
    setLiveTranscription(transcription);
    setTranscriptionHistory(history);

    
    // Add new transcriptions to current page
    if (history.length > 0) {
      // Get all existing transcriptions across all pages to avoid duplicates
      const allExistingTimestamps = new Set();
      Object.values(transcriptionsByPage).forEach(pageData => {
        pageData.transcriptions.forEach(t => allExistingTimestamps.add(t.timestamp));
      });
      
      // Filter out transcriptions that already exist in any page
      const newTranscriptions = history.filter(t => !allExistingTimestamps.has(t.timestamp));
      
      if (newTranscriptions.length > 0) {
        setTranscriptionsByPage(prev => ({
          ...prev,
          [currentPage]: {
            ...prev[currentPage],
            pageNumber: currentPage,
            startTime: prev[currentPage]?.startTime || Date.now(),
            transcriptions: [...(prev[currentPage]?.transcriptions || []), ...newTranscriptions]
          }
        }));
      }
    }
    
    // Broadcast transcription to other users in the room
    if (socket && transcription) {
      socket.emit('transcription-update', {
        joinCode,
        transcription,
        history,
        currentPage,
        transcriptionsByPage
      });
    }
  }, [transcriptionsByPage, currentPage, socket, joinCode]);

  // PDF-related handlers
  const handlePageChange = useCallback((page: number) => {
    console.log('📄 Page changed to:', page);
    
    // Finalize previous page's transcription
    if (currentPage !== page && transcriptionsByPage[currentPage]) {
      setTranscriptionsByPage(prev => ({
        ...prev,
        [currentPage]: {
          ...prev[currentPage],
          endTime: Date.now()
        }
      }));
    }
    
    setCurrentPage(page);
    // Initialize new page transcription if it doesn't exist
    setTranscriptionsByPage(prev => ({
      ...prev,
      [page]: prev[page] || {
        pageNumber: page,
        transcriptions: [],
        startTime: Date.now()
      }
    }));
    
    // If user is presenter, emit page change to socket server
    if (isPresenter && socket) {
      console.log('📄 Presenter changing page to:', page, 'emitting to socket server');
      socket.emit('pdf-page-change', {
        page: page,
        joinCode: joinCode
      });
    }
  }, [currentPage, transcriptionsByPage, isPresenter, socket, joinCode]);

  const handleTotalPagesChange = useCallback((pages: number) => {
    console.log('📄 Total pages:', pages);
    setTotalPages(pages);
  }, []);

  const handleFitModeChange = useCallback((mode: 'width' | 'height' | 'page' | 'auto') => {
    console.log('📄 Fit mode changed to:', mode);
    setFitMode(mode);
  }, []);

  const togglePdfViewer = useCallback(() => {
    console.log('📄 Toggling PDF viewer, current state:', showPdfViewer);
    setShowPdfViewer(!showPdfViewer);
  }, [showPdfViewer]);

  const toggleFullscreen = useCallback(() => {
    console.log('📄 Toggling fullscreen, current state:', isFullscreen);
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  const shareRoomLink = useCallback(async () => {
    try {
      const roomUrl = `${window.location.origin}/${joinCode}`;
      await navigator.clipboard.writeText(roomUrl);
      console.log('📋 Room link copied to clipboard:', roomUrl);
      setShowShareCopied(true);
      setTimeout(() => setShowShareCopied(false), 2000); // Hide after 2 seconds
    } catch (error) {
      console.error('Failed to copy room link:', error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = `${window.location.origin}/${joinCode}`;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setShowShareCopied(true);
      setTimeout(() => setShowShareCopied(false), 2000);
    }
  }, [joinCode]);

  // Handle keyboard navigation in fullscreen
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isFullscreen) return;
      
      switch (event.key) {
        case 'Escape':
          console.log('📄 Escape key pressed, exiting fullscreen');
          setIsFullscreen(false);
          break;
        case 'ArrowLeft':
          event.preventDefault();
          if (currentPage > 1) {
            console.log('📄 Left arrow pressed, going to previous page');
            handlePageChange(currentPage - 1);
          }
          break;
        case 'ArrowRight':
          event.preventDefault();
          if (currentPage < totalPages) {
            console.log('📄 Right arrow pressed, going to next page');
            handlePageChange(currentPage + 1);
          }
          break;
      }
    };

    if (isFullscreen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isFullscreen, currentPage, totalPages, handlePageChange]);

  // Remove authentication requirement - allow anonymous users

  // Fullscreen PDF viewer layout - UI-free mode
  if (isFullscreen && isPresenter && pdfUrl) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: '#000',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <PDFViewer
          pdfUrl={pdfUrl}
          currentPage={currentPage}
          onPageChange={handlePageChange}
          onPDFLoad={handleTotalPagesChange}
          fitMode="page"
          className="h-full w-full"
        />
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
        <Navbar />

        {/* Main Content */}
        <div style={{ flex: 1, padding: '20px' }}>
          <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{
              background: isPresenter
                ? 'linear-gradient(135deg, rgba(147, 112, 219, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%)'
                : 'linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%)',
              backdropFilter: 'blur(15px)',
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
              border: isPresenter
                ? '2px solid rgba(147, 112, 219, 0.3)'
                : '2px solid rgba(102, 126, 234, 0.3)',
              boxShadow: '0 6px 24px rgba(0,0,0,0.3)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <h1 style={{
                    color: 'white',
                    fontSize: '32px',
                    fontWeight: 'bold',
                    margin: 0,
                    textShadow: '0 0 20px rgba(147, 112, 219, 0.8)'
                  }}>
                    Room: {joinCode}
                  </h1>
                  
                  {/* Share Room Link Button */}
                  <button
                    onClick={shareRoomLink}
                    style={{
                      padding: '8px 16px',
                      background: showShareCopied 
                        ? 'linear-gradient(135deg, #28a745 0%, #20c997 100%)'
                        : 'linear-gradient(135deg, #17a2b8 0%, #138496 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '20px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.3s',
                      boxShadow: '0 4px 15px rgba(23, 162, 184, 0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                    onMouseOver={(e) => {
                      if (!showShareCopied) {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 6px 20px rgba(23, 162, 184, 0.6)';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (!showShareCopied) {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 15px rgba(23, 162, 184, 0.4)';
                      }
                    }}
                  >
                    {showShareCopied ? '✅ Copied!' : '📋 Share Room Link'}
                  </button>
                </div>
                
                <div style={{
                  padding: '8px 16px',
                  borderRadius: '20px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  background: isPresenter
                    ? 'linear-gradient(135deg, #9370db 0%, #8a2be2 100%)'
                    : 'linear-gradient(135deg, #667eea 0%, #9370db 100%)',
                  color: 'white',
                  boxShadow: '0 4px 15px rgba(147, 112, 219, 0.4)'
                }}>
                  {isPresenter ? '🎤 PRESENTER' : '👥 ATTENDEE'}
                </div>
              </div>

              {/* Connection Status */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                <div style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: isConnected ? '#28a745' : '#dc3545',
                  boxShadow: `0 0 10px ${isConnected ? '#28a745' : '#dc3545'}`
                }}></div>
                <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
                <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                  • {isAnonymous ? 'Anonymous user' : `Signed in as ${user?.email}`}
                </span>
              </div>

              {/* Error Display */}
              {error && (
                <div style={{
                  background: 'rgba(220, 53, 69, 0.2)',
                  border: '1px solid rgba(220, 53, 69, 0.4)',
                  color: '#ff6b6b',
                  padding: '16px',
                  borderRadius: '12px',
                  marginBottom: '16px',
                  backdropFilter: 'blur(10px)'
                }}>
                  Error: {error}
                </div>
              )}

              {/* Sign-in option for anonymous users */}
              {isAnonymous && (
                <div style={{
                  background: 'rgba(102, 126, 234, 0.2)',
                  border: '1px solid rgba(102, 126, 234, 0.3)',
                  borderRadius: '12px',
                  padding: '16px',
                  marginBottom: '16px',
                  backdropFilter: 'blur(10px)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'white', margin: '0 0 4px 0' }}>Want to create rooms?</h3>
                      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', margin: 0 }}>Sign in to create your own Q&A rooms</p>
                    </div>
                    <Link href="/">
                      <button style={{
                        background: 'linear-gradient(135deg, #667eea 0%, #9370db 100%)',
                        color: 'white',
                        padding: '8px 16px',
                        borderRadius: '8px',
                        border: 'none',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.3s',
                        boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
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
                        Sign In
                      </button>
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* PDF Viewer Section */}
            {pdfUrl && (
              <div style={{
                background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%)',
                backdropFilter: 'blur(15px)',
                borderRadius: '16px',
                padding: '20px',
                marginBottom: '24px',
                border: '1px solid rgba(255,255,255,0.2)',
                boxShadow: '0 6px 24px rgba(0,0,0,0.3)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <h3 style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    color: 'white',
                    margin: 0,
                    textShadow: '0 2px 10px rgba(147, 112, 219, 0.6)'
                  }}>
                    📄 Presentation PDF
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {/* Presenter Page Indicator - Only show for attendees */}
                    {!isPresenter && totalPages > 0 && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '6px 12px',
                        background: 'rgba(147, 112, 219, 0.2)',
                        border: '1px solid rgba(147, 112, 219, 0.3)',
                        borderRadius: '20px',
                        fontSize: '14px',
                        color: 'white'
                      }}>
                        <span style={{ fontSize: '12px', opacity: 0.8 }}>Presenter on:</span>
                        <span style={{ fontWeight: '600' }}>Page {presenterCurrentPage}</span>
                        {currentPage !== presenterCurrentPage && (
                          <button
                            onClick={() => handlePageChange(presenterCurrentPage)}
                            style={{
                              padding: '4px 8px',
                              background: 'linear-gradient(135deg, #9370db 0%, #8a2be2 100%)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '12px',
                              fontSize: '12px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              transition: 'all 0.3s',
                              boxShadow: '0 2px 8px rgba(147, 112, 219, 0.4)'
                            }}
                            onMouseOver={(e) => {
                              e.currentTarget.style.transform = 'translateY(-1px)';
                              e.currentTarget.style.boxShadow = '0 4px 12px rgba(147, 112, 219, 0.6)';
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.transform = 'translateY(0)';
                              e.currentTarget.style.boxShadow = '0 2px 8px rgba(147, 112, 219, 0.4)';
                            }}
                          >
                            Jump to Presenter
                          </button>
                        )}
                      </div>
                    )}
                    
                    {/* Fullscreen button - Only for presenters */}
                    {isPresenter && showPdfViewer && (
                      <button
                        onClick={toggleFullscreen}
                        style={{
                          padding: '8px 16px',
                          background: isFullscreen 
                            ? 'linear-gradient(135deg, #ffc107 0%, #ff8c00 100%)'
                            : 'linear-gradient(135deg, #6f42c1 0%, #8e44ad 100%)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.3s',
                          boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.4)';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.3)';
                        }}
                      >
                        {isFullscreen ? '⤓ Exit Fullscreen' : '⤢ Fullscreen'}
                      </button>
                    )}
                    
                    <button
                      onClick={togglePdfViewer}
                      style={{
                        padding: '8px 16px',
                        background: showPdfViewer 
                          ? 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)'
                          : 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.3s',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.4)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.3)';
                      }}
                    >
                      {showPdfViewer ? '🔼 Hide PDF' : '🔽 Show PDF'}
                    </button>
                  </div>
                </div>

                {showPdfViewer && (
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
                    backdropFilter: 'blur(20px)',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    height: '600px',
                    border: '1px solid rgba(255,255,255,0.2)'
                  }}>
                    {/* PDF Toolbar */}
                    {totalPages > 0 && (
                      <PDFToolbar
                        fitMode={fitMode}
                        onFitModeChange={handleFitModeChange}
                        className="flex-shrink-0"
                      />
                    )}

                    {/* PDF Viewer */}
                    <div style={{ flex: 1, overflow: 'hidden', minHeight: 0, height: 'calc(100% - 120px)' }}>
                      <PDFViewer
                        pdfUrl={pdfUrl}
                        currentPage={currentPage}
                        onPageChange={handlePageChange}
                        onPDFLoad={handleTotalPagesChange}
                        fitMode={fitMode}
                        className="h-full"
                      />
                    </div>

                    {/* PDF Navigation */}
                    {totalPages > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>

                        <PDFNavigation
                          currentPage={currentPage}
                          totalPages={totalPages}
                          onPageChange={handlePageChange}
                          className="flex-shrink-0"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Role Instructions */}
            <div style={{
              background: isPresenter
                ? 'linear-gradient(135deg, rgba(147, 112, 219, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%)'
                : 'linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%)',
              backdropFilter: 'blur(15px)',
              borderRadius: '16px',
              padding: '20px',
              marginBottom: '24px',
              borderLeft: isPresenter
                ? '4px solid rgba(147, 112, 219, 0.6)'
                : '4px solid rgba(102, 126, 234, 0.6)',
              boxShadow: '0 6px 24px rgba(0,0,0,0.3)'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ fontSize: '24px' }}>
                  {isPresenter ? '🎤' : '👥'}
                </div>
                <div>
                  <h3 style={{
                    fontWeight: 'bold',
                    fontSize: '18px',
                    color: 'white',
                    margin: '0 0 8px 0',
                    textShadow: '0 2px 10px rgba(147, 112, 219, 0.6)'
                  }}>
                    {isPresenter ? 'You are the PRESENTER' : 'You are an ATTENDEE'}
                  </h3>
                  <p style={{
                    fontSize: '14px',
                    margin: 0,
                    color: 'rgba(255,255,255,0.85)',
                    lineHeight: '1.5'
                  }}>
                    {isPresenter
                      ? 'You can mark questions as answered/unanswered. You cannot vote on questions.'
                      : 'You can ask questions and vote on unanswered questions. You cannot mark questions as answered.'
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Voice Recording Controls - Only for Presenters */}
            {isPresenter && (
              <VoiceRecordingControls onTranscriptionUpdate={handleTranscriptionUpdate} />
            )}

            {/* Live Transcription Display - For All Users */}
            {(liveTranscription || transcriptionHistory.length > 0) && (
              <TranscriptionDisplay
                transcription={liveTranscription}
                transcriptionHistory={transcriptionHistory}
                isTranscribing={false} // This will be managed by the VoiceRecordingControls
                isCollapsed={isTranscriptionCollapsed}
                onToggleCollapse={() => setIsTranscriptionCollapsed(!isTranscriptionCollapsed)}
                transcriptionsByPage={transcriptionsByPage}
                currentPage={currentPage}
                totalPages={totalPages}
                viewByPage={viewByPage}
                onToggleView={() => setViewByPage(!viewByPage)}
              />
            )}

            {/* Debug info - remove this later */}
            {process.env.NODE_ENV === 'development' && (
              <div style={{
                background: 'rgba(0,0,0,0.3)',
                padding: '10px',
                borderRadius: '8px',
                marginBottom: '16px',
                fontSize: '12px',
                color: 'white'
              }}>
                Debug: liveTranscription="{liveTranscription}", historyLength={transcriptionHistory.length}, presenterCurrentPage={presenterCurrentPage}
              </div>
            )}

            {/* Questions */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
              backdropFilter: 'blur(15px)',
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
              border: '1px solid rgba(255,255,255,0.2)',
              boxShadow: '0 6px 24px rgba(0,0,0,0.3)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h2 style={{
                  fontSize: '20px',
                  fontWeight: '600',
                  color: 'white',
                  margin: 0,
                  textShadow: '0 2px 10px rgba(147, 112, 219, 0.6)'
                }}>Questions</h2>
                <div style={{
                  padding: '6px 12px',
                  borderRadius: '20px',
                  fontSize: '14px',
                  fontWeight: '500',
                  background: isPresenter
                    ? 'rgba(147, 112, 219, 0.2)'
                    : 'rgba(102, 126, 234, 0.2)',
                  color: 'white',
                  border: isPresenter
                    ? '1px solid rgba(147, 112, 219, 0.3)'
                    : '1px solid rgba(102, 126, 234, 0.3)'
                }}>
                  {isPresenter
                    ? '🎤 You can mark questions as answered'
                    : '👥 You can vote on unanswered questions'
                  }
                </div>
              </div>
              <div style={{
                height: '384px',
                overflowY: 'auto',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                {questions.length === 0 ? (
                  <p style={{
                    color: 'rgba(255,255,255,0.6)',
                    textAlign: 'center',
                    fontSize: '16px',
                    margin: '40px 0'
                  }}>No questions yet. Ask the first one!</p>
                ) : (
                  questions
                    .sort((a, b) => {
                      // Sort answered questions to bottom, then by votes
                      if (a.answered !== b.answered) {
                        return a.answered ? 1 : -1;
                      }
                      return (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes);
                    })
                    .map((question) => (
                      <div key={question.id} style={{
                        padding: '16px',
                        borderRadius: '12px',
                        background: question.answered
                          ? 'linear-gradient(135deg, rgba(40, 167, 69, 0.2) 0%, rgba(32, 201, 151, 0.2) 100%)'
                          : 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
                        border: question.answered
                          ? '1px solid rgba(40, 167, 69, 0.3)'
                          : '1px solid rgba(255,255,255,0.1)',
                        backdropFilter: 'blur(10px)',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.2)'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <div style={{ flex: 1 }}>
                            <p style={{
                              color: question.answered ? 'rgba(255,255,255,0.6)' : 'white',
                              textDecoration: question.answered ? 'line-through' : 'none',
                              margin: '0 0 8px 0',
                              fontSize: '16px',
                              lineHeight: '1.5',
                              textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                            }}>
                              {question.text}
                            </p>
                            {question.answered && (
                              <span style={{
                                color: '#28a745',
                                fontSize: '14px',
                                fontWeight: '600',
                                textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                              }}>✓ Answered</span>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '16px' }}>
                            {isPresenter ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {/* Voting buttons - disabled for presenter */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <button
                                    disabled={true}
                                    style={{
                                      padding: '8px 12px',
                                      background: 'rgba(255,255,255,0.1)',
                                      color: 'rgba(255,255,255,0.4)',
                                      borderRadius: '8px',
                                      border: '1px solid rgba(255,255,255,0.2)',
                                      cursor: 'not-allowed',
                                      fontWeight: '500',
                                      fontSize: '14px'
                                    }}
                                  >
                                    👍 {question.upvotes}
                                  </button>
                                  <button
                                    disabled={true}
                                    style={{
                                      padding: '8px 12px',
                                      background: 'rgba(255,255,255,0.1)',
                                      color: 'rgba(255,255,255,0.4)',
                                      borderRadius: '8px',
                                      border: '1px solid rgba(255,255,255,0.2)',
                                      cursor: 'not-allowed',
                                      fontWeight: '500',
                                      fontSize: '14px'
                                    }}
                                  >
                                    👎 {question.downvotes}
                                  </button>
                                </div>
                                {/* Mark as answered button */}
                                <button
                                  onClick={() => markAsAnswered(question.id)}
                                  disabled={!isConnected}
                                  style={{
                                    padding: '8px 16px',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    borderRadius: '8px',
                                    border: 'none',
                                    cursor: isConnected ? 'pointer' : 'not-allowed',
                                    background: question.answered
                                      ? 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)'
                                      : 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                                    color: 'white',
                                    transition: 'all 0.3s',
                                    boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                                    opacity: isConnected ? 1 : 0.5
                                  }}
                                  onMouseOver={(e) => {
                                    if (isConnected) {
                                      e.currentTarget.style.transform = 'translateY(-2px)';
                                      e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.4)';
                                    }
                                  }}
                                  onMouseOut={(e) => {
                                    if (isConnected) {
                                      e.currentTarget.style.transform = 'translateY(0)';
                                      e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.3)';
                                    }
                                  }}
                                >
                                  {question.answered ? '❌ Mark Unanswered' : '✅ Mark Answered'}
                                </button>
                              </div>
                            ) : (() => {
                              const userVote = getUserVote(question);
                              return (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <button
                                    onClick={() => handleVote(question.id, userVote === "upvote" ? "remove" : "upvote")}
                                    disabled={!isConnected || question.answered}
                                    style={{
                                      padding: '8px 12px',
                                      borderRadius: '8px',
                                      fontWeight: '500',
                                      fontSize: '14px',
                                      cursor: (!isConnected || question.answered) ? 'not-allowed' : 'pointer',
                                      transition: 'all 0.3s',
                                      background: userVote === "upvote"
                                        ? 'linear-gradient(135deg, #28a745 0%, #20c997 100%)'
                                        : 'rgba(40, 167, 69, 0.2)',
                                      color: userVote === "upvote" ? 'white' : 'rgba(255,255,255,0.8)',
                                      border: userVote === "upvote"
                                        ? '1px solid rgba(40, 167, 69, 0.5)'
                                        : '1px solid rgba(40, 167, 69, 0.3)',
                                      opacity: (!isConnected || question.answered) ? 0.5 : 1,
                                      boxShadow: userVote === "upvote"
                                        ? '0 4px 15px rgba(40, 167, 69, 0.4)'
                                        : '0 2px 8px rgba(0,0,0,0.2)'
                                    }}
                                    onMouseOver={(e) => {
                                      if (isConnected && !question.answered) {
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                        e.currentTarget.style.boxShadow = userVote === "upvote"
                                          ? '0 6px 20px rgba(40, 167, 69, 0.6)'
                                          : '0 4px 12px rgba(40, 167, 69, 0.4)';
                                      }
                                    }}
                                    onMouseOut={(e) => {
                                      if (isConnected && !question.answered) {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = userVote === "upvote"
                                          ? '0 4px 15px rgba(40, 167, 69, 0.4)'
                                          : '0 2px 8px rgba(0,0,0,0.2)';
                                      }
                                    }}
                                  >
                                    👍 {question.upvotes}
                                  </button>
                                  <button
                                    onClick={() => handleVote(question.id, userVote === "downvote" ? "remove" : "downvote")}
                                    disabled={!isConnected || question.answered}
                                    style={{
                                      padding: '8px 12px',
                                      borderRadius: '8px',
                                      fontWeight: '500',
                                      fontSize: '14px',
                                      cursor: (!isConnected || question.answered) ? 'not-allowed' : 'pointer',
                                      transition: 'all 0.3s',
                                      background: userVote === "downvote"
                                        ? 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)'
                                        : 'rgba(220, 53, 69, 0.2)',
                                      color: userVote === "downvote" ? 'white' : 'rgba(255,255,255,0.8)',
                                      border: userVote === "downvote"
                                        ? '1px solid rgba(220, 53, 69, 0.5)'
                                        : '1px solid rgba(220, 53, 69, 0.3)',
                                      opacity: (!isConnected || question.answered) ? 0.5 : 1,
                                      boxShadow: userVote === "downvote"
                                        ? '0 4px 15px rgba(220, 53, 69, 0.4)'
                                        : '0 2px 8px rgba(0,0,0,0.2)'
                                    }}
                                    onMouseOver={(e) => {
                                      if (isConnected && !question.answered) {
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                        e.currentTarget.style.boxShadow = userVote === "downvote"
                                          ? '0 6px 20px rgba(220, 53, 69, 0.6)'
                                          : '0 4px 12px rgba(220, 53, 69, 0.4)';
                                      }
                                    }}
                                    onMouseOut={(e) => {
                                      if (isConnected && !question.answered) {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = userVote === "downvote"
                                          ? '0 4px 15px rgba(220, 53, 69, 0.4)'
                                          : '0 2px 8px rgba(0,0,0,0.2)';
                                      }
                                    }}
                                  >
                                    👎 {question.downvotes}
                                  </button>
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '12px',
                          color: 'rgba(255,255,255,0.6)',
                          marginTop: '8px',
                          textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                        }}>
                          <span>
                            Asked by {(() => {
                              // Check if it's the current user
                              if (question.authorId === user?.uid) {
                                return 'You';
                              }
                              // Check if it's an anonymous user
                              if (question.authorId.startsWith('anonymous-')) {
                                return 'Anonymous user';
                              }
                              // For authenticated users, show the email like in "Signed in as"
                              return question.authorEmail;
                            })()}
                          </span>
                          <span>
                            {new Date(question.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>

            {/* Question Input */}
            <div style={{
              background: isPresenter
                ? 'linear-gradient(135deg, rgba(147, 112, 219, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%)'
                : 'linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%)',
              backdropFilter: 'blur(15px)',
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
              border: isPresenter
                ? '1px solid rgba(147, 112, 219, 0.3)'
                : '1px solid rgba(102, 126, 234, 0.3)',
              boxShadow: '0 6px 24px rgba(0,0,0,0.3)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: 'white',
                  margin: 0,
                  textShadow: '0 2px 10px rgba(147, 112, 219, 0.6)'
                }}>
                  Ask a Question
                </h3>
                <span style={{
                  fontSize: '14px',
                  padding: '4px 8px',
                  borderRadius: '12px',
                  background: isPresenter
                    ? 'rgba(147, 112, 219, 0.2)'
                    : 'rgba(102, 126, 234, 0.2)',
                  color: 'white',
                  border: isPresenter
                    ? '1px solid rgba(147, 112, 219, 0.3)'
                    : '1px solid rgba(102, 126, 234, 0.3)'
                }}>
                  {isPresenter ? '🎤 Presenter' : '👥 Attendee'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '16px' }}>
                <input
                  type="text"
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  onKeyPress={handleQuestionKeyPress}
                  placeholder={isPresenter
                    ? "Ask a question as the presenter..."
                    : "Ask a question as an attendee..."
                  }
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    border: '1px solid rgba(255,255,255,0.3)',
                    borderRadius: '12px',
                    background: 'rgba(255,255,255,0.1)',
                    color: 'white',
                    fontSize: '16px',
                    outline: 'none',
                    backdropFilter: 'blur(10px)',
                    opacity: isConnected ? 1 : 0.5,
                    cursor: isConnected ? 'text' : 'not-allowed'
                  }}
                  onFocus={(e) => {
                    if (isConnected) {
                      e.currentTarget.style.border = '1px solid rgba(102, 126, 234, 0.6)';
                      e.currentTarget.style.boxShadow = '0 0 20px rgba(102, 126, 234, 0.3)';
                    }
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.border = '1px solid rgba(255,255,255,0.3)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  disabled={!isConnected}
                />
                <button
                  onClick={postQuestion}
                  disabled={!isConnected || !newQuestion.trim()}
                  style={{
                    padding: '12px 24px',
                    background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: (!isConnected || !newQuestion.trim()) ? 'not-allowed' : 'pointer',
                    transition: 'all 0.3s',
                    boxShadow: '0 4px 15px rgba(40, 167, 69, 0.4)',
                    opacity: (!isConnected || !newQuestion.trim()) ? 0.5 : 1
                  }}
                  onMouseOver={(e) => {
                    if (isConnected && newQuestion.trim()) {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 6px 20px rgba(40, 167, 69, 0.6)';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (isConnected && newQuestion.trim()) {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 15px rgba(40, 167, 69, 0.4)';
                    }
                  }}
                >
                  Ask
                </button>
              </div>
              <p style={{
                fontSize: '14px',
                margin: '12px 0 0 0',
                color: 'rgba(255,255,255,0.8)',
                textShadow: '0 2px 4px rgba(0,0,0,0.5)'
              }}>
                Press Enter to ask, or click the Ask button. Questions will be visible to all members in the room.
              </p>
            </div>
            {/* Testing Instructions */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(255, 193, 7, 0.15) 0%, rgba(255, 152, 0, 0.15) 100%)',
              backdropFilter: 'blur(15px)',
              borderRadius: '16px',
              padding: '24px',
              marginTop: '24px',
              border: '1px solid rgba(255, 193, 7, 0.3)',
              boxShadow: '0 6px 24px rgba(0,0,0,0.3)'
            }}>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: 'white',
                margin: '0 0 16px 0',
                textShadow: '0 2px 10px rgba(255, 193, 7, 0.6)'
              }}>Testing Instructions</h3>
              <ul style={{
                color: 'rgba(255,255,255,0.85)',
                margin: 0,
                paddingLeft: '20px',
                lineHeight: '1.6',
                textShadow: '0 2px 4px rgba(0,0,0,0.5)'
              }}>
                <li>• Open this same URL in multiple browser tabs or different browsers</li>
                <li>• Each tab will join the same room automatically</li>
                <li>• Ask questions and vote on them - questions persist even when users leave</li>
                <li>• Questions are sorted by answered status, then by net votes</li>
                <li>• Users can change or remove their votes</li>
                <li>• Presenters can mark questions as answered/unanswered</li>
                <li>• Participants can vote on unanswered questions only</li>
                <li>• Watch the member count update as users join/leave</li>
                <li>• Try refreshing tabs to see reconnection behavior</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes twinkle {
          0% { opacity: 0.3; }
          100% { opacity: 0.8; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
