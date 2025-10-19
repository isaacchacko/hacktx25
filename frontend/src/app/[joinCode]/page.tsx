"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSocket } from "../../hooks/useSocket";
import { useAuth } from "../context/AuthContext";

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

export default function JoinRoomPage() {
  const params = useParams();
  const router = useRouter();
  const joinCode = params.joinCode as string;
  const { user, signOut } = useAuth();
  const { socket, isConnected, isPresenter, isAnonymous, joinRoom, currentRoom } = useSocket();
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [newQuestion, setNewQuestion] = useState("");
  const [error, setError] = useState<string | null>(null);

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

    // Add event listeners
    socket.on("joined-room", handleJoinedRoom);
    socket.on("error", handleError);
    socket.on("new-question", handleNewQuestion);
    socket.on("question-updated", handleQuestionUpdated);
    socket.on("questions-list", handleQuestionsList);

    // Cleanup
    return () => {
      socket.off("joined-room", handleJoinedRoom);
      socket.off("error", handleError);
      socket.off("new-question", handleNewQuestion);
      socket.off("question-updated", handleQuestionUpdated);
      socket.off("questions-list", handleQuestionsList);
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

  // Remove authentication requirement - allow anonymous users

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
        {/* Header/Navbar */}
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
            {user ? (
              <>
                <span style={{ color: 'rgba(255,255,255,0.8)', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                  👤 {user.displayName || user.email}
                </span>
                <button 
                  onClick={handleLogout}
                  style={{
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
              </>
            ) : (
              <Link href="/login">
                <button style={{
                  padding: '12px 24px',
                  background: 'linear-gradient(135deg, #667eea 0%, #9370db 100%)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  boxShadow: '0 4px 15px rgba(147, 112, 219, 0.4)',
                  transition: 'all 0.3s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(147, 112, 219, 0.6)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(147, 112, 219, 0.4)';
                }}
                >
                  ✨ Sign In
                </button>
              </Link>
            )}
          </div>
        </header>

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
                <h1 style={{
                  color: 'white',
                  fontSize: '32px',
                  fontWeight: 'bold',
                  margin: 0,
                  textShadow: '0 0 20px rgba(147, 112, 219, 0.8)'
                }}>
                  Room: {joinCode}
                </h1>
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
                                      border: 'none',
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
                                      border: 'none',
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
      `}</style>
    </div>
  );
}
