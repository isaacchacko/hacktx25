"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useSocket } from "../../hooks/useSocket";
import { useAuth } from "../context/AuthContext";
import Navbar from "../../components/Navbar";
import { VoiceRecordingControls } from "../../components/VoiceRecordingControls";
import { TranscriptionDisplay } from "../../components/TranscriptionDisplay";
import AIInsightsPanel from "../../components/AIInsightsPanel";
import { generateMultipleSummaries, SummaryRequest, getQuestionSuggestions, QuestionSuggestionsContext } from "../../utils/geminiApi";
import { usePresentationTimer } from "../../hooks/usePresentationTimer";
import { generatePresentationSummaryPDF, downloadPDF, generateFilename } from "../../utils/pdfGenerator";

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

interface AIInsights {
  confusedAreas: string[];
  suggestedSlideNumbers: number[];
  analysis: string;
  success: boolean;
  error?: string;
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

  // Question suggestions state
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const latestRequestId = useRef<number>(0);

  // PDF context state for suggestions
  const [pdfSummary, setPdfSummary] = useState<string>('');
  const [pdfPageTexts, setPdfPageTexts] = useState<string[]>([]);

  // AI insights state
  const [aiInsights, setAiInsights] = useState<AIInsights | null>(null);
  const [showAIInsights, setShowAIInsights] = useState(false);

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

  // Slide timer for presentation timing
  const { 
    isRecording: isTimerRecording,
    totalRecordingTime,
    slideTimings, 
    estimatedTotalTime, 
    startRecording: startTimer,
    stopRecording: stopTimer,
    onSlideChange, 
    resetTimer, 
    formatTime 
  } = usePresentationTimer(totalPages, currentPage);

  // Add state to track if recording has started
  const [hasStartedRecording, setHasStartedRecording] = useState(false);

  // Add state for fullscreen mode
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Add function to toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Add useEffect to handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);
  
  // Summary generation state and PDF viewer ref
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const pdfViewerRef = useRef<HTMLDivElement>(null);
  
  // AI Insights trigger function
  const triggerAIInsights = useCallback(async (questionsList: Question[]) => {
    try {
      console.log("🚀 Starting AI insights analysis...");
      console.log("📊 Analysis data:", {
        questionsCount: questionsList.length,
        questions: questionsList.map(q => q.text),
        hasPdfSummary: !!pdfSummary,
        pdfSummaryLength: pdfSummary.length,
        hasTotalPages: totalPages > 0,
        totalPages,
        hasPdfPageTexts: pdfPageTexts.length > 0,
        pdfPageTextsLength: pdfPageTexts.length
      });

      // Prepare the request body
      const requestBody = {
        questions: questionsList.map(q => q.text),
        pdfText: pdfPageTexts.join('\n\n') || 'No PDF text available',
        totalPages: totalPages || 1,
        overallSummary: pdfSummary || 'No summary available'
      };

      console.log("📤 Sending request to /api/ai-insights:", requestBody);

      const response = await fetch('/api/ai-insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      console.log("📥 Response received:", {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ API response not OK:", errorText);
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const insights = await response.json();
      console.log("✅ AI insights received from API:", insights);

      if (insights.success) {
        console.log("🎉 AI insights analysis successful!");
        setAiInsights(insights);
        setShowAIInsights(true);
      } else {
        console.error("❌ AI insights analysis failed:", insights.error);
        // Still set the insights to show the error state
        setAiInsights(insights);
        setShowAIInsights(true);
      }
    } catch (error) {
      console.error("💥 AI insights analysis error:", error);
      
      // Set a fallback error state
      const errorInsights = {
        confusedAreas: [],
        suggestedSlideNumbers: [],
        analysis: 'Failed to analyze questions. Please try again.',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      
      console.log("🔄 Setting error insights:", errorInsights);
      setAiInsights(errorInsights);
      setShowAIInsights(true);
    }
  }, [pdfSummary, totalPages, pdfPageTexts]);

  // Debug logging for presenter current page changes
  useEffect(() => {
    console.log('📄 Presenter current page updated to:', presenterCurrentPage);
  }, [presenterCurrentPage]);

  // Trigger AI insights when PDF data becomes available and we have questions
  useEffect(() => {
    if (questions.length >= 3 && pdfSummary && totalPages > 0) {
      console.log("🤖 PDF data available, triggering AI insights...");
      triggerAIInsights(questions);
    }
  }, [questions, pdfSummary, totalPages, triggerAIInsights]);

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
      console.log("🔍 Room data for AI insights:", {
        hasQuestions: !!(data.questions && data.questions.length > 0),
        questionsCount: data.questions ? data.questions.length : 0,
        hasPdfText: !!data.pdfText,
        hasTotalPages: !!data.totalPages,
        hasSummary: !!data.summary,
        hasPageTexts: !!(data.pageTexts && data.pageTexts.length > 0)
      });
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

      // Store PDF context for suggestions
      if (data.summary) {
        console.log("📄 Received PDF summary:", data.summary);
        setPdfSummary(data.summary);
      }

      if (data.pageTexts && Array.isArray(data.pageTexts)) {
        console.log("📄 Received PDF page texts:", data.pageTexts.length, "pages");
        setPdfPageTexts(data.pageTexts);
      }

      // Set questions if present
      if (data.questions && Array.isArray(data.questions)) {
        console.log("📝 Received questions:", data.questions.length, "questions");
        setQuestions(data.questions);
        
        // Trigger AI insights if we have enough questions and PDF data
        if (data.questions.length >= 3 && data.summary && data.totalPages > 0) {
          console.log("🤖 Triggering AI insights from joined room data...");
          // Use a timeout to ensure state is updated
          setTimeout(() => {
            triggerAIInsights(data.questions);
          }, 100);
        } else {
          console.log("⏭️ Skipping AI insights from joined room - conditions not met:", {
            questionsCount: data.questions.length,
            hasSummary: !!data.summary,
            hasTotalPages: data.totalPages > 0,
            totalPages: data.totalPages
          });
        }
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
      setQuestions(prev => {
        const newQuestions = [...prev, question];
        console.log("📝 Updated questions array:", newQuestions);
        
        // Trigger AI insights analysis if we have enough questions and PDF data
        if (newQuestions.length >= 3 && pdfSummary && totalPages > 0) {
          console.log("🤖 Triggering AI insights from frontend...");
          triggerAIInsights(newQuestions);
        } else {
          console.log("⏭️ Skipping AI insights - conditions not met:", {
            questionsCount: newQuestions.length,
            hasPdfSummary: !!pdfSummary,
            hasTotalPages: totalPages > 0,
            totalPages
          });
        }
        
        return newQuestions;
      });
    };

    const handleQuestionUpdated = (question: Question) => {
      console.log("Question updated:", question);
      setQuestions(prev => prev.map(q => q.id === question.id ? question : q));
    };

    const handleQuestionsList = (questionsList: Question[]) => {
      console.log("Questions list:", questionsList);
      setQuestions(questionsList);
      
      // Trigger AI insights if we have enough questions and PDF data
      if (questionsList.length >= 3 && pdfSummary && totalPages > 0) {
        console.log("🤖 Triggering AI insights from questions list...");
        triggerAIInsights(questionsList);
      } else {
        console.log("⏭️ Skipping AI insights from questions list - conditions not met:", {
          questionsCount: questionsList.length,
          hasPdfSummary: !!pdfSummary,
          hasTotalPages: totalPages > 0,
          totalPages
        });
      }
    };

    const handleSocketTranscriptionUpdate = (data: any) => {
      console.log("📝 Transcription update from socket:", {
        joinCode: data.joinCode,
        transcriptionLength: data.transcription?.length || 0,
        historyCount: data.history?.length || 0,
        transcriptionsByPageKeys: data.transcriptionsByPage ? Object.keys(data.transcriptionsByPage).length : 0
      });
      
      if (data.joinCode === joinCode) {
        // Update all transcription state
        setLiveTranscription(data.transcription || '');
        setTranscriptionHistory(data.history || []);
        
        // IMPORTANT: Also update transcriptionsByPage for summary generation
        if (data.transcriptionsByPage) {
          setTranscriptionsByPage(data.transcriptionsByPage);
          console.log('✅ Updated transcriptionsByPage from socket:', Object.keys(data.transcriptionsByPage));
        }
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

    const handleAIInsights = (insights: AIInsights) => {
      console.log("🤖 AI insights received:", insights);
      console.log("🤖 Setting AI insights state and showing panel");
      setAiInsights(insights);
      setShowAIInsights(true);
    };

    // Add event listeners
    socket.on("joined-room", handleJoinedRoom);
    socket.on("error", handleError);
    socket.on("new-question", handleNewQuestion);
    socket.on("question-updated", handleQuestionUpdated);
    socket.on("questions-list", handleQuestionsList);
    socket.on("transcription-update", handleSocketTranscriptionUpdate);
    socket.on("room-pdf-update", handleRoomPdfUpdate);
    socket.on("pdf-page-updated", handlePdfPageUpdate);
    socket.on("ai-insights", handleAIInsights);

    // Cleanup
    return () => {
      socket.off("joined-room", handleJoinedRoom);
      socket.off("error", handleError);
      socket.off("new-question", handleNewQuestion);
      socket.off("question-updated", handleQuestionUpdated);
      socket.off("questions-list", handleQuestionsList);
      socket.off("transcription-update", handleSocketTranscriptionUpdate);
      socket.off("room-pdf-update", handleRoomPdfUpdate);
      socket.off("pdf-page-updated", handlePdfPageUpdate);
      socket.off("ai-insights", handleAIInsights);
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

  // Debounced question suggestions with PDF context (attendees only)
  useEffect(() => {
    // Skip suggestions for presenters
    if (isPresenter) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    if (!newQuestion.trim() || newQuestion.trim().length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
        console.log('Gemini API key not available, skipping suggestions');
        return;
      }

      // Generate unique request ID
      const currentRequestId = ++latestRequestId.current;

      setIsSuggesting(true);
      setSuggestError(null);
      setShowSuggestions(true); // Show panel immediately with loading state

      try {
        // Get recent questions for context
        const recentQuestions = questions
          .slice(-5)
          .map(q => q.text)
          .filter(text => text.length > 0);

        // Determine active page for context
        const activePage = isPresenter ? currentPage : presenterCurrentPage;
        
        // Build context with PDF and transcription information
        const context: QuestionSuggestionsContext = {
          recentQuestions,
          overallSummary: pdfSummary || undefined,
          currentPage: activePage,
          totalPages: totalPages || undefined,
          slideText: (pdfPageTexts.length > 0 && activePage > 0) 
            ? pdfPageTexts[activePage - 1] 
            : undefined,
          transcriptionText: liveTranscription || undefined,
          transcriptionHistory: transcriptionHistory.length > 0 
            ? transcriptionHistory.slice(-3) // Last 3 transcriptions
            : undefined
        };

        console.log('💭 Generating suggestions with context:', {
          activePage,
          totalPages,
          hasSummary: !!pdfSummary,
          hasSlideText: !!context.slideText,
          hasTranscription: !!context.transcriptionText,
          transcriptionHistoryCount: context.transcriptionHistory?.length || 0,
          recentQuestionsCount: recentQuestions.length
        });

        const result = await getQuestionSuggestions(newQuestion.trim(), context);

        // Check if this is still the latest request
        if (currentRequestId === latestRequestId.current) {
          if (result.success) {
            setSuggestions(result.suggestions);
            setShowSuggestions(result.suggestions.length > 0);
          } else {
            setSuggestError(result.error || 'Failed to generate suggestions');
            setSuggestions([]);
            setShowSuggestions(false);
          }
        } else {
          console.log('⏭️ Skipping stale suggestion response');
        }
      } catch (error) {
        console.error('Error generating suggestions:', error);
        // Only update state if this is still the latest request
        if (currentRequestId === latestRequestId.current) {
          setSuggestError('Failed to generate suggestions');
          setSuggestions([]);
          setShowSuggestions(false);
        }
      } finally {
        // Only update loading state if this is still the latest request
        if (currentRequestId === latestRequestId.current) {
          setIsSuggesting(false);
        }
      }
    }, 150); // 150ms debounce

    return () => clearTimeout(timeoutId);
  }, [newQuestion, questions, pdfSummary, pdfPageTexts, currentPage, presenterCurrentPage, totalPages, isPresenter, liveTranscription, transcriptionHistory]);

  const handleSuggestionClick = (suggestion: string) => {
    // Set the question and immediately submit it
    setNewQuestion(suggestion);
    setShowSuggestions(false);
    
    // Submit the question automatically
    if (socket && suggestion.trim()) {
      socket.emit("post-question", {
        question: suggestion.trim(),
        joinCode: joinCode
      });
      setNewQuestion(""); // Clear the input after sending
    }
  };

  // Handle recording start - start the timer immediately
  const handleRecordingStart = useCallback(() => {
    if (!hasStartedRecording) {
      console.log('🎤 Recording started, initializing presentation timer');
      startTimer();
      setHasStartedRecording(true);
    }
  }, [hasStartedRecording, startTimer]);

  // Handle recording stop - stop the timer
  const handleRecordingStop = useCallback(() => {
    if (hasStartedRecording) {
      console.log('⏹️ Recording stopped, stopping presentation timer');
      stopTimer();
      setHasStartedRecording(false);
    }
  }, [hasStartedRecording, stopTimer]);

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
    
    // Update slide timer
    onSlideChange(page);
    
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
  }, [currentPage, transcriptionsByPage, onSlideChange, isPresenter, socket, joinCode]);

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

  // Remove authentication requirement - allow anonymous users

  // Generate summary for all slides with enhanced context
  const generateSummary = useCallback(async () => {
    setIsGeneratingSummary(true);
    try {
      // Prefer in-memory PDF context first, fallback to localStorage
      const overallSummary = pdfSummary || localStorage.getItem('presentation-summary') || '';
      const pageTexts: string[] = (pdfPageTexts && pdfPageTexts.length > 0)
        ? pdfPageTexts
        : JSON.parse(localStorage.getItem('presentation-page-texts') || '[]');

      console.log('🧪 generateSummary(): debugging context');
      console.log(' - transcriptionHistory count:', transcriptionHistory.length);
      console.log(' - transcriptionHistory sample:', transcriptionHistory.slice(-5));
      console.log(' - transcriptionsByPage keys:', Object.keys(transcriptionsByPage));
      console.log(' - totalPages:', totalPages, 'currentPage:', currentPage);
      console.log(' - has overallSummary:', !!overallSummary, 'overallSummary length:', overallSummary.length);
      console.log(' - pageTexts length:', pageTexts.length);

      // Collect pages that have any transcription data
      const pagesWithTranscriptions = Object.keys(transcriptionsByPage)
        .map(Number)
        .sort((a, b) => a - b);

      if (pagesWithTranscriptions.length === 0) {
        setIsGeneratingSummary(false);
        return;
      }

      const summaryRequests: SummaryRequest[] = [];
      for (const pageNumber of pagesWithTranscriptions) {
        const pageData = transcriptionsByPage[pageNumber];
        const slideText = pageTexts[pageNumber - 1] || '';

        // Prefer stored per-page transcriptions
        let perPageTexts = (pageData?.transcriptions || []).map(t => t.text);

        // Fallback: derive from global transcriptionHistory using page time window
        if ((!perPageTexts || perPageTexts.length === 0) && pageData?.startTime) {
          const windowStart = pageData.startTime;
          const windowEnd = pageData.endTime || Date.now();
          perPageTexts = transcriptionHistory
            .filter(t => t.timestamp >= windowStart && t.timestamp <= windowEnd)
            .map(t => t.text);
          console.log(` - page ${pageNumber}: using fallback history window`, { windowStart, windowEnd, matched: perPageTexts.length });
        }

        const combinedText = (perPageTexts || []).join(' ').trim();

        console.log(` - page ${pageNumber}: pageData summary`, {
          hasPageData: !!pageData,
          transcriptionsCount: pageData?.transcriptions?.length || 0,
          startTime: pageData?.startTime,
          endTime: pageData?.endTime,
          combinedLen: combinedText.length,
          slideTextLen: slideText.length
        });

        // Skip pages that truly have no transcription text
        if (!combinedText) {
          console.log(`   -> page ${pageNumber}: skipped (no combined transcription text)`);
          continue;
        }

        summaryRequests.push({
          pageNumber,
          transcriptionText: combinedText,
          slideText,
          overallSummary,
          totalPages,
          currentPage,
          isPresenter
        });
      }

      console.log('🧪 SummaryRequest payload (truncated):', summaryRequests.map(r => ({
        pageNumber: r.pageNumber,
        transcriptionPreview: r.transcriptionText.slice(0, 120),
        transcriptionLen: r.transcriptionText.length,
        slideTextPreview: (r.slideText || '').slice(0, 120),
        slideTextLen: (r.slideText || '').length,
        overallSummaryLen: (r.overallSummary || '').length,
        totalPages: r.totalPages,
        currentPage: r.currentPage
      })));

      const summaries = await generateMultipleSummaries(summaryRequests);
      console.log('🧪 Gemini response (per item, truncated):', summaries.map(s => ({
        pageNumber: s.pageNumber,
        success: s.success,
        summaryPreview: (s.summary || '').slice(0, 160),
        error: s.error
      })));
      const sortedSummaries = summaries.sort((a, b) => a.pageNumber - b.pageNumber);

      // Build PDF with slide images and summaries
      const pdfBlob = await generatePresentationSummaryPDF(
        sortedSummaries,
        pdfViewerRef.current,
        pageTexts,
        totalPages,
        currentPage,
        pdfUrl,
        {
          title: 'Presentation Summary',
          author: 'Presentation Platform',
          subject: 'AI-Generated Slide Summaries',
          roomCode: joinCode,
          generatedAt: new Date()
        }
      );

      const filename = generateFilename(joinCode);
      downloadPDF(pdfBlob, filename);
    } catch (error) {
      console.error('Error generating PDF summary:', error);
    } finally {
      setIsGeneratingSummary(false);
    }
  }, [transcriptionsByPage, totalPages, currentPage, isPresenter, pdfUrl, joinCode]);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #000000 0%, #15151c 50%, #0a0a0a 100%)',
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
              background: 'rgba(255,255,255,0.04)',
              borderRadius: '12px',
              padding: '28px',
              marginBottom: '32px',
              border: '1px solid rgba(255,255,255,0.08)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h1 style={{
                  color: 'white',
                  fontSize: '28px',
                  fontWeight: '600',
                  margin: 0,
                  letterSpacing: '-0.02em'
                }}>
                  Room {joinCode}
                </h1>
                <div style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: '500',
                  background: 'rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.9)',
                  border: '1px solid rgba(255,255,255,0.12)'
                }}>
                  {isPresenter ? 'Presenter' : 'Participant'}
                </div>
              </div>

              {/* Connection Status */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: isConnected ? '#6ee7b7' : '#fca5a5'
                }}></div>
                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px' }}>
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>
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
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '12px',
                padding: '28px',
                marginBottom: '32px',
                border: '1px solid rgba(255,255,255,0.06)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                  <h3 style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    color: 'white',
                    margin: 0,
                    letterSpacing: '-0.01em'
                  }}>
                    Presentation PDF
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {/* Enhanced Timer Display */}
                    {totalPages > 0 && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '6px 12px',
                        background: isTimerRecording 
                          ? 'linear-gradient(135deg, rgba(40, 167, 69, 0.15) 0%, rgba(34, 139, 34, 0.15) 100%)'
                          : 'linear-gradient(135deg, rgba(147, 112, 219, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%)',
                        border: isTimerRecording 
                          ? '1px solid rgba(40, 167, 69, 0.3)'
                          : '1px solid rgba(147, 112, 219, 0.3)',
                        borderRadius: '8px',
                        fontSize: '13px',
                        color: 'rgba(255,255,255,0.9)',
                        backdropFilter: 'blur(10px)',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                      }}>
                        <span style={{ 
                          fontSize: '14px', 
                          opacity: 0.8,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          {isTimerRecording ? '🔴' : '⏱️'}
                        </span>
                        <span style={{ fontWeight: '600' }}>
                          {isTimerRecording ? formatTime(Math.round(totalRecordingTime / 1000)) : formatTime(estimatedTotalTime)}
                        </span>
                        <span style={{ fontSize: '11px', opacity: 0.6 }}>
                          {isTimerRecording ? 'recording' : 'est.'}
                        </span>
                      </div>
                    )}

                    {/* Presenter Page Indicator - Only show for attendees */}
                    {!isPresenter && totalPages > 0 && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '4px 8px',
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '6px',
                        fontSize: '12px',
                        color: 'rgba(255,255,255,0.8)'
                      }}>
                        <span style={{ fontSize: '11px', opacity: 0.7 }}>Presenter on:</span>
                        <span style={{ fontWeight: '500' }}>Page {presenterCurrentPage}</span>
                        {currentPage !== presenterCurrentPage && (
                          <button
                            onClick={() => handlePageChange(presenterCurrentPage)}
                            style={{
                              padding: '3px 6px',
                              background: 'rgba(255,255,255,0.08)',
                              color: 'rgba(255,255,255,0.9)',
                              border: '1px solid rgba(255,255,255,0.12)',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: '500',
                              cursor: 'pointer',
                              transition: 'all 0.2s'
                            }}
                            onMouseOver={(e) => {
                              e.currentTarget.style.background = 'rgba(255,255,255,0.12)';
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                            }}
                          >
                            Jump to Presenter
                          </button>
                        )}
                      </div>
                    )}

                    {/* Reset Timer Button - Only for presenters */}
                    {isPresenter && totalPages > 0 && (
                      <button
                        onClick={resetTimer}
                        style={{
                          padding: '6px 12px',
                          background: 'rgba(255, 193, 7, 0.1)',
                          color: 'rgba(255, 193, 7, 0.9)',
                          border: '1px solid rgba(255, 193, 7, 0.3)',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '500',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.background = 'rgba(255, 193, 7, 0.15)';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.background = 'rgba(255, 193, 7, 0.1)';
                        }}
                      >
                        🔄 Reset Timer
                      </button>
                    )}

                    {/* Fullscreen Button */}
                    {showPdfViewer && totalPages > 0 && (
                      <button
                        onClick={toggleFullscreen}
                        style={{
                          padding: '6px 12px',
                          background: 'rgba(255,255,255,0.08)',
                          color: 'rgba(255,255,255,0.9)',
                          border: '1px solid rgba(255,255,255,0.12)',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '500',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.12)';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                        }}
                      >
                        {isFullscreen ? '🔲 Exit Fullscreen' : '⛶ Fullscreen'}
                      </button>
                    )}

                    <button
                      onClick={togglePdfViewer}
                      style={{
                        padding: '6px 12px',
                        background: showPdfViewer
                          ? 'rgba(220, 53, 69, 0.1)'
                          : 'rgba(40, 167, 69, 0.1)',
                        color: showPdfViewer
                          ? 'rgba(220, 53, 69, 0.9)'
                          : 'rgba(40, 167, 69, 0.9)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.background = showPdfViewer
                          ? 'rgba(220, 53, 69, 0.15)'
                          : 'rgba(40, 167, 69, 0.15)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background = showPdfViewer
                          ? 'rgba(220, 53, 69, 0.1)'
                          : 'rgba(40, 167, 69, 0.1)';
                      }}
                    >
                      {showPdfViewer ? 'Hide PDF' : 'Show PDF'}
                    </button>
                  </div>
                </div>

                {showPdfViewer && (
                  <div style={{
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    height: isFullscreen ? '100vh' : '600px',
                    border: '1px solid rgba(255,255,255,0.08)',
                    position: isFullscreen ? 'fixed' : 'relative',
                    top: isFullscreen ? '0' : 'auto',
                    left: isFullscreen ? '0' : 'auto',
                    width: isFullscreen ? '100vw' : 'auto',
                    zIndex: isFullscreen ? 9999 : 'auto'
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
                    <div ref={pdfViewerRef} style={{ flex: 1, overflow: 'hidden', minHeight: 0, height: 'calc(100% - 120px)' }}>
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

                {/* Enhanced Analytics Panel */}
                {isPresenter && showPdfViewer && totalPages > 0 && (
                  <div style={{
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: '8px',
                    padding: '16px',
                    marginTop: '16px',
                    border: '1px solid rgba(255,255,255,0.08)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <h4 style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: 'rgba(255,255,255,0.9)',
                        margin: 0
                      }}>
                        📊 Presentation Analytics
                      </h4>
                      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
                        Slide {currentPage} of {totalPages}
                      </div>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                      <div style={{
                        padding: '8px 12px',
                        background: isTimerRecording 
                          ? 'rgba(40, 167, 69, 0.1)'
                          : 'rgba(147, 112, 219, 0.1)',
                        borderRadius: '6px',
                        border: isTimerRecording 
                          ? '1px solid rgba(40, 167, 69, 0.2)'
                          : '1px solid rgba(147, 112, 219, 0.2)'
                      }}>
                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginBottom: '2px' }}>
                          {isTimerRecording ? 'Recording Time' : 'Est. Total Time'}
                        </div>
                        <div style={{ fontSize: '16px', fontWeight: '600', color: 'rgba(255,255,255,0.9)' }}>
                          {isTimerRecording 
                            ? formatTime(Math.round(totalRecordingTime / 1000))
                            : formatTime(estimatedTotalTime)
                          }
                        </div>
                      </div>
                      
                      <div style={{
                        padding: '8px 12px',
                        background: 'rgba(40, 167, 69, 0.1)',
                        borderRadius: '6px',
                        border: '1px solid rgba(40, 167, 69, 0.2)'
                      }}>
                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginBottom: '2px' }}>Current Slide</div>
                        <div style={{ fontSize: '16px', fontWeight: '600', color: 'rgba(255,255,255,0.9)' }}>
                          {slideTimings[currentPage - 1] ? formatTime(Math.round(slideTimings[currentPage - 1] / 1000)) : '0:00'}
                        </div>
                      </div>
                      
                      <div style={{
                        padding: '8px 12px',
                        background: 'rgba(255, 193, 7, 0.1)',
                        borderRadius: '6px',
                        border: '1px solid rgba(255, 193, 7, 0.2)'
                      }}>
                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginBottom: '2px' }}>Avg. per Slide</div>
                        <div style={{ fontSize: '16px', fontWeight: '600', color: 'rgba(255,255,255,0.9)' }}>
                          {slideTimings.filter(t => t > 0).length > 0 
                            ? formatTime(Math.round(slideTimings.reduce((sum, time) => sum + time, 0) / slideTimings.filter(t => t > 0).length / 1000))
                            : '0:00'
                          }
                        </div>
                      </div>
                    </div>
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
                    margin: '0 0 8px 0'
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
              <VoiceRecordingControls 
                onTranscriptionUpdate={handleTranscriptionUpdate}
                onRecordingStart={handleRecordingStart}
                onRecordingStop={handleRecordingStop}
              />
            )}

            {/* AI Insights Trigger - Only for Presenters */}
            {isPresenter && questions.length >= 3 && (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '12px',
                marginTop: '16px'
              }}>
                <button
                  onClick={() => {
                    console.log("🤖 AI Insights button clicked. Current state:", {
                      showAIInsights,
                      hasInsights: !!aiInsights,
                      insightsData: aiInsights
                    });
                    setShowAIInsights(!showAIInsights);
                  }}
                  style={{
                    backgroundColor: showAIInsights ? '#4a9eff' : '#2a2a2a',
                    color: '#ffffff',
                    border: '1px solid #4a9eff',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = showAIInsights ? '#5ba8ff' : '#3a3a3a';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = showAIInsights ? '#4a9eff' : '#2a2a2a';
                  }}
                >
                  <span>🤖</span>
                  {showAIInsights ? 'Hide AI Insights' : 'Show AI Insights'}
                  {aiInsights && <span style={{ fontSize: '10px', opacity: 0.7 }}> (Available)</span>}
                </button>
                
                {/* Test AI Insights Button */}
                <button
                  onClick={() => {
                    console.log("🧪 Testing AI insights manually...");
                    triggerAIInsights(questions);
                  }}
                  style={{
                    backgroundColor: '#ff6b6b',
                    color: '#ffffff',
                    border: '1px solid #ff6b6b',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <span>🧪</span>
                  Test AI
                </button>
              </div>
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

            {/* Slide Summaries - Generate PDF */}
            {(liveTranscription || transcriptionHistory.length > 0 || Object.keys(transcriptionsByPage).length > 0) && (
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '12px',
                padding: '20px',
                margin: '16px 0 24px 0',
                border: '1px solid rgba(255,255,255,0.06)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <h3 style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    color: 'white',
                    margin: 0,
                    letterSpacing: '-0.01em'
                  }}>
                    Slide Summaries
                  </h3>
                  <div style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '500',
                    background: 'rgba(255,255,255,0.06)',
                    color: 'rgba(255,255,255,0.7)',
                    border: '1px solid rgba(255,255,255,0.08)'
                  }}>
                    {Object.keys(transcriptionsByPage).length} slide{Object.keys(transcriptionsByPage).length !== 1 ? 's' : ''} with transcriptions
                  </div>
                </div>
                <p style={{
                  fontSize: '14px',
                  color: 'rgba(255,255,255,0.8)',
                  margin: '0 0 12px 0',
                  lineHeight: '1.5'
                }}>
                  Generate intelligent summaries for each slide based on transcriptions and slide text. A PDF will download automatically.
                </p>
                <button
                  onClick={generateSummary}
                  disabled={isGeneratingSummary}
                  style={{
                    padding: '10px 16px',
                    background: isGeneratingSummary ? 'rgba(108,117,125,0.2)' : 'rgba(40, 167, 69, 0.1)',
                    color: isGeneratingSummary ? 'rgba(255,255,255,0.7)' : 'rgba(40, 167, 69, 0.9)',
                    border: '1px solid rgba(40, 167, 69, 0.2)',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: isGeneratingSummary ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    opacity: isGeneratingSummary ? 0.7 : 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  onMouseOver={(e) => {
                    if (!isGeneratingSummary) {
                      e.currentTarget.style.background = 'rgba(40, 167, 69, 0.15)';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!isGeneratingSummary) {
                      e.currentTarget.style.background = 'rgba(40, 167, 69, 0.1)';
                    }
                  }}
                >
                  {isGeneratingSummary ? (
                    <>
                      <div style={{
                        width: '14px',
                        height: '14px',
                        border: '2px solid rgba(255,255,255,0.3)',
                        borderTopColor: '#ffffff',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }} />
                      Generating...
                    </>
                  ) : (
                    <>📄 Generate PDF Summary</>
                  )}
                </button>
              </div>
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
              background: 'rgba(255,255,255,0.03)',
              borderRadius: '12px',
              padding: '28px',
              marginBottom: '32px',
              border: '1px solid rgba(255,255,255,0.06)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h2 style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: 'white',
                  margin: 0,
                  letterSpacing: '-0.01em'
                }}>Questions</h2>
                <div style={{
                  padding: '4px 8px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '500',
                  background: 'rgba(255,255,255,0.06)',
                  color: 'rgba(255,255,255,0.7)',
                  border: '1px solid rgba(255,255,255,0.08)'
                }}>
                  {isPresenter
                    ? 'You can mark questions as answered'
                    : 'You can vote on unanswered questions'
                  }
                </div>
              </div>
              <div style={{
                height: '400px',
                overflowY: 'auto',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '8px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
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
                        padding: '20px',
                        borderRadius: '8px',
                        background: question.answered
                          ? 'rgba(40, 167, 69, 0.08)'
                          : 'rgba(255,255,255,0.02)',
                        border: question.answered
                          ? '1px solid rgba(40, 167, 69, 0.15)'
                          : '1px solid rgba(255,255,255,0.06)'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <div style={{ flex: 1 }}>
                            <p style={{
                              color: question.answered ? 'rgba(255,255,255,0.6)' : 'white',
                              textDecoration: question.answered ? 'line-through' : 'none',
                              margin: '0 0 12px 0',
                              fontSize: '15px',
                              lineHeight: '1.5'
                            }}>
                              {question.text}
                            </p>
                            {question.answered && (
                              <span style={{
                                color: '#6ee7b7',
                                fontSize: '13px',
                                fontWeight: '500'
                              }}>Answered</span>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '16px' }}>
                            {isPresenter ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {/* Voting buttons - disabled for presenter */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <button
                                    disabled={true}
                                    style={{
                                      padding: '6px 10px',
                                      background: 'rgba(255,255,255,0.05)',
                                      color: 'rgba(255,255,255,0.4)',
                                      borderRadius: '6px',
                                      border: '1px solid rgba(255,255,255,0.08)',
                                      cursor: 'not-allowed',
                                      fontWeight: '500',
                                      fontSize: '13px'
                                    }}
                                  >
                                    {question.upvotes}
                                  </button>
                                  <button
                                    disabled={true}
                                    style={{
                                      padding: '6px 10px',
                                      background: 'rgba(255,255,255,0.05)',
                                      color: 'rgba(255,255,255,0.4)',
                                      borderRadius: '6px',
                                      border: '1px solid rgba(255,255,255,0.08)',
                                      cursor: 'not-allowed',
                                      fontWeight: '500',
                                      fontSize: '13px'
                                    }}
                                  >
                                    {question.downvotes}
                                  </button>
                                </div>
                                {/* Mark as answered button */}
                                <button
                                  onClick={() => markAsAnswered(question.id)}
                                  disabled={!isConnected}
                                  style={{
                                    padding: '6px 12px',
                                    fontSize: '13px',
                                    fontWeight: '500',
                                    borderRadius: '6px',
                                    border: '1px solid rgba(255,255,255,0.12)',
                                    cursor: isConnected ? 'pointer' : 'not-allowed',
                                    background: question.answered
                                      ? 'rgba(239, 68, 68, 0.1)'
                                      : 'rgba(40, 167, 69, 0.1)',
                                    color: question.answered
                                      ? 'rgba(239, 68, 68, 0.9)'
                                      : 'rgba(40, 167, 69, 0.9)',
                                    transition: 'all 0.2s',
                                    opacity: isConnected ? 1 : 0.5
                                  }}
                                  onMouseOver={(e) => {
                                    if (isConnected) {
                                      e.currentTarget.style.background = question.answered
                                        ? 'rgba(239, 68, 68, 0.15)'
                                        : 'rgba(40, 167, 69, 0.15)';
                                    }
                                  }}
                                  onMouseOut={(e) => {
                                    if (isConnected) {
                                      e.currentTarget.style.background = question.answered
                                        ? 'rgba(239, 68, 68, 0.1)'
                                        : 'rgba(40, 167, 69, 0.1)';
                                    }
                                  }}
                                >
                                  {question.answered ? 'Mark Unanswered' : 'Mark Answered'}
                                </button>
                              </div>
                            ) : (() => {
                              const userVote = getUserVote(question);
                              return (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <button
                                    onClick={() => handleVote(question.id, userVote === "upvote" ? "remove" : "upvote")}
                                    disabled={!isConnected || question.answered}
                                    style={{
                                      padding: '6px 10px',
                                      borderRadius: '6px',
                                      border: '1px solid rgba(255,255,255,0.08)',
                                      fontWeight: '500',
                                      fontSize: '13px',
                                      cursor: (!isConnected || question.answered) ? 'not-allowed' : 'pointer',
                                      transition: 'all 0.2s',
                                      background: userVote === "upvote"
                                        ? 'rgba(40, 167, 69, 0.15)'
                                        : 'rgba(255,255,255,0.05)',
                                      color: userVote === "upvote" 
                                        ? '#22c55e' 
                                        : 'rgba(255,255,255,0.7)',
                                      opacity: (!isConnected || question.answered) ? 0.5 : 1,
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px'
                                    }}
                                    onMouseOver={(e) => {
                                      if (isConnected && !question.answered) {
                                        e.currentTarget.style.background = userVote === "upvote"
                                          ? 'rgba(40, 167, 69, 0.2)'
                                          : 'rgba(255,255,255,0.08)';
                                      }
                                    }}
                                    onMouseOut={(e) => {
                                      if (isConnected && !question.answered) {
                                        e.currentTarget.style.background = userVote === "upvote"
                                          ? 'rgba(40, 167, 69, 0.15)'
                                          : 'rgba(255,255,255,0.05)';
                                      }
                                    }}
                                  >
                                    <span style={{ fontSize: '16px', color: '#22c55e' }}>↑</span>
                                    <span>{question.upvotes}</span>
                                  </button>
                                  <button
                                    onClick={() => handleVote(question.id, userVote === "downvote" ? "remove" : "downvote")}
                                    disabled={!isConnected || question.answered}
                                    style={{
                                      padding: '6px 10px',
                                      borderRadius: '6px',
                                      border: '1px solid rgba(255,255,255,0.08)',
                                      fontWeight: '500',
                                      fontSize: '13px',
                                      cursor: (!isConnected || question.answered) ? 'not-allowed' : 'pointer',
                                      transition: 'all 0.2s',
                                      background: userVote === "downvote"
                                        ? 'rgba(220, 53, 69, 0.15)'
                                        : 'rgba(255,255,255,0.05)',
                                      color: userVote === "downvote" 
                                        ? '#ef4444' 
                                        : 'rgba(255,255,255,0.7)',
                                      opacity: (!isConnected || question.answered) ? 0.5 : 1,
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px'
                                    }}
                                    onMouseOver={(e) => {
                                      if (isConnected && !question.answered) {
                                        e.currentTarget.style.background = userVote === "downvote"
                                          ? 'rgba(220, 53, 69, 0.2)'
                                          : 'rgba(255,255,255,0.08)';
                                      }
                                    }}
                                    onMouseOut={(e) => {
                                      if (isConnected && !question.answered) {
                                        e.currentTarget.style.background = userVote === "downvote"
                                          ? 'rgba(220, 53, 69, 0.15)'
                                          : 'rgba(255,255,255,0.05)';
                                      }
                                    }}
                                  >
                                    <span style={{ fontSize: '16px', color: '#ef4444' }}>↓</span>
                                    <span>{question.downvotes}</span>
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
                          marginTop: '8px'
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
              background: 'rgba(255,255,255,0.03)',
              borderRadius: '12px',
              padding: '28px',
              marginBottom: '32px',
              border: '1px solid rgba(255,255,255,0.06)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: 'white',
                  margin: 0,
                  letterSpacing: '-0.01em'
                }}>
                  Ask a Question
                </h3>
                <span style={{
                  fontSize: '12px',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  background: 'rgba(255,255,255,0.06)',
                  color: 'rgba(255,255,255,0.7)',
                  border: '1px solid rgba(255,255,255,0.08)'
                }}>
                  {isPresenter ? 'Presenter' : 'Participant'}
                </span>
              </div>
              
              {isPresenter ? (
                <div style={{
                  padding: '20px',
                  background: 'rgba(147, 112, 219, 0.1)',
                  border: '1px solid rgba(147, 112, 219, 0.2)',
                  borderRadius: '8px',
                  textAlign: 'center'
                }}>
                  <p style={{
                    color: 'rgba(255,255,255,0.8)',
                    margin: 0,
                    fontSize: '14px'
                  }}>
                    🎤 As the presenter, you can answer questions and mark them as answered, but you cannot ask questions.
                  </p>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', gap: '16px', position: 'relative' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <input
                    type="text"
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    onKeyPress={handleQuestionKeyPress}
                    onFocus={() => {
                      if (suggestions.length > 0) {
                        setShowSuggestions(true);
                      }
                    }}
                    onBlur={() => {
                      // Delay hiding suggestions to allow clicking
                      setTimeout(() => setShowSuggestions(false), 150);
                    }}
                    placeholder={isPresenter
                      ? "Ask a question..."
                      : "Ask a question..."
                    }
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: '8px',
                      background: 'rgba(255,255,255,0.05)',
                      color: 'white',
                      fontSize: '15px',
                      outline: 'none',
                      opacity: isConnected ? 1 : 0.5,
                      cursor: isConnected ? 'text' : 'not-allowed'
                    }}
                    disabled={!isConnected}
                  />
                  
                  {/* Suggestions Panel */}
                  {showSuggestions && (suggestions.length > 0 || isSuggesting) && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      background: 'rgba(0,0,0,0.9)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '8px',
                      marginTop: '4px',
                      zIndex: 1000,
                      boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
                    }}>
                      {isSuggesting && (
                        <div style={{
                          padding: '12px 16px',
                          color: 'rgba(255,255,255,0.7)',
                          fontSize: '14px',
                          textAlign: 'center',
                          borderBottom: '1px solid rgba(255,255,255,0.1)'
                        }}>
                          <div style={{
                            display: 'inline-block',
                            width: '16px',
                            height: '16px',
                            border: '2px solid rgba(255,255,255,0.3)',
                            borderTopColor: '#667eea',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite',
                            marginRight: '8px'
                          }} />
                          Generating suggestions...
                        </div>
                      )}
                      
                      {suggestions.map((suggestion, index) => (
                        <div
                          key={index}
                          onClick={() => handleSuggestionClick(suggestion)}
                          style={{
                            padding: '12px 16px',
                            color: 'white',
                            fontSize: '14px',
                            cursor: 'pointer',
                            borderBottom: index < suggestions.length - 1 ? '1px solid rgba(255,255,255,0.1)' : 'none',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.background = 'rgba(102, 126, 234, 0.2)';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          {suggestion}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={postQuestion}
                  disabled={!isConnected || !newQuestion.trim()}
                  style={{
                    padding: '12px 20px',
                    background: 'rgba(40, 167, 69, 0.1)',
                    color: 'rgba(40, 167, 69, 0.9)',
                    border: '1px solid rgba(40, 167, 69, 0.2)',
                    borderRadius: '8px',
                    fontSize: '15px',
                    fontWeight: '500',
                    cursor: (!isConnected || !newQuestion.trim()) ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    opacity: (!isConnected || !newQuestion.trim()) ? 0.5 : 1
                  }}
                  onMouseOver={(e) => {
                    if (isConnected && newQuestion.trim()) {
                      e.currentTarget.style.background = 'rgba(40, 167, 69, 0.15)';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (isConnected && newQuestion.trim()) {
                      e.currentTarget.style.background = 'rgba(40, 167, 69, 0.1)';
                    }
                  }}
                >
                  Ask
                </button>
              </div>
                  <p style={{
                    fontSize: '13px',
                    margin: '16px 0 0 0',
                    color: 'rgba(255,255,255,0.6)'
                  }}>
                    Press Enter to ask, or click the Ask button. Questions will be visible to all members in the room.
                  </p>
                </div>
              )}
            </div>
            {/* Testing Instructions */}
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              borderRadius: '12px',
              padding: '28px',
              marginTop: '32px',
              border: '1px solid rgba(255,255,255,0.06)'
            }}>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: 'white',
                margin: '0 0 16px 0'
              }}>Testing Instructions</h3>
              <ul style={{
                color: 'rgba(255,255,255,0.85)',
                margin: 0,
                paddingLeft: '20px',
                lineHeight: '1.6'
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

      {/* AI Insights Panel - Only visible to presenters */}
      {isPresenter && (
        <AIInsightsPanel
          insights={aiInsights}
          isVisible={showAIInsights}
          onClose={() => setShowAIInsights(false)}
          onNavigateToSlide={(slideNumber) => {
            handlePageChange(slideNumber);
            setShowAIInsights(false);
          }}
        />
      )}

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
