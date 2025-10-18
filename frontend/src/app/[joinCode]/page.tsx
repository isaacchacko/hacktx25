"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { io, Socket } from "socket.io-client";

interface RoomStatus {
  joinCode: string;
  memberCount: number;
  message: string;
  isPresenter: boolean;
}

interface Question {
  id: string;
  text: string;
  authorId: string;
  authorSocketId: string;
  upvotes: number;
  downvotes: number;
  votes: Map<string, string>; // userId -> voteType ('upvote', 'downvote', or null)
  createdAt: string;
  answered: boolean;
}

export default function JoinRoomPage() {
  const params = useParams();
  const joinCode = params.joinCode as string;
  
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [roomStatus, setRoomStatus] = useState<RoomStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [newQuestion, setNewQuestion] = useState("");
  const [userToken, setUserToken] = useState<string | null>(null);

  // Load token from localStorage on component mount
  useEffect(() => {
    const savedToken = localStorage.getItem('qa-room-token');
    if (savedToken) {
      setUserToken(savedToken);
    }
  }, []);

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io("http://localhost:3001");
    setSocket(newSocket);

    // Connection event handlers
    newSocket.on("connect", () => {
      console.log("Connected to server");
      setIsConnected(true);
      setError(null);
      
      // Authenticate with the server
      newSocket.emit("authenticate", { token: userToken });
    });

    newSocket.on("authenticated", (data: { token: string }) => {
      console.log("Authenticated with token:", data.token);
      setUserToken(data.token);
      localStorage.setItem('qa-room-token', data.token);
      
      // Join the room after authentication
      newSocket.emit("join-room", joinCode);
      
      // Request existing questions
      newSocket.emit("get-questions", joinCode);
    });

    newSocket.on("disconnect", () => {
      console.log("Disconnected from server");
      setIsConnected(false);
    });

    newSocket.on("joined-room", (status: RoomStatus) => {
      console.log("Joined room:", status);
      setRoomStatus(status);
      setError(null);
    });

    newSocket.on("user-joined", (status: RoomStatus) => {
      console.log("User joined:", status);
      setRoomStatus(prev => prev ? { ...prev, memberCount: status.memberCount } : null);
    });

    newSocket.on("user-left", (status: RoomStatus) => {
      console.log("User left:", status);
      setRoomStatus(prev => prev ? { ...prev, memberCount: status.memberCount } : null);
    });

    newSocket.on("error", (errorMessage: string) => {
      console.error("Socket error:", errorMessage);
      setError(errorMessage);
    });

    // Question-related event handlers
    newSocket.on("new-question", (question: Question) => {
      console.log("New question:", question);
      setQuestions(prev => [...prev, question]);
    });

    newSocket.on("question-updated", (question: Question) => {
      console.log("Question updated:", question);
      setQuestions(prev => prev.map(q => q.id === question.id ? question : q));
    });

    newSocket.on("questions-list", (questionsList: Question[]) => {
      console.log("Questions list:", questionsList);
      setQuestions(questionsList);
    });

    // Cleanup on unmount
    return () => {
      newSocket.close();
    };
  }, [joinCode, userToken]);

  const postQuestion = () => {
    if (socket && newQuestion.trim() && roomStatus) {
      socket.emit("post-question", {
        question: newQuestion.trim(),
        joinCode: roomStatus.joinCode
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
    if (socket && roomStatus) {
      socket.emit("mark-answered", {
        questionId,
        joinCode: roomStatus.joinCode
      });
    }
  };

  const getUserVote = (question: Question): string | null => {
    if (!socket?.userId) return null;
    return question.votes.get(socket.userId) || null;
  };

  const handleVote = (questionId: string, voteType: "upvote" | "downvote" | "remove") => {
    if (socket && roomStatus) {
      socket.emit("vote-question", {
        questionId,
        voteType,
        joinCode: roomStatus.joinCode
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className={`rounded-lg shadow-md p-6 mb-6 ${roomStatus?.isPresenter ? 'bg-gradient-to-r from-purple-50 to-purple-100 border-2 border-purple-200' : 'bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-200'}`}>
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-gray-800">
              Room: {joinCode}
            </h1>
            <div className={`px-4 py-2 rounded-full text-sm font-bold ${roomStatus?.isPresenter 
              ? 'bg-purple-600 text-white shadow-lg' 
              : 'bg-blue-600 text-white shadow-lg'
            }`}>
              {roomStatus?.isPresenter ? '🎤 PRESENTER' : '👥 ATTENDEE'}
            </div>
          </div>
          
          {/* Connection Status */}
          <div className="flex items-center gap-4 mb-4">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm text-gray-600">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
            {roomStatus && (
              <span className="text-sm text-gray-600">
                • {roomStatus.memberCount} member{roomStatus.memberCount !== 1 ? 's' : ''} in room
              </span>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              Error: {error}
            </div>
          )}

          {/* Room Status */}
          {roomStatus && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
              {roomStatus.message}
            </div>
          )}
        </div>

        {/* Role Instructions */}
        {roomStatus && (
          <div className={`rounded-lg shadow-md p-4 mb-6 ${roomStatus.isPresenter 
            ? 'bg-purple-50 border-l-4 border-purple-400' 
            : 'bg-blue-50 border-l-4 border-blue-400'
          }`}>
            <div className="flex items-start gap-3">
              <div className={`text-2xl ${roomStatus.isPresenter ? 'text-purple-600' : 'text-blue-600'}`}>
                {roomStatus.isPresenter ? '🎤' : '👥'}
              </div>
              <div>
                <h3 className={`font-bold text-lg ${roomStatus.isPresenter ? 'text-purple-800' : 'text-blue-800'}`}>
                  {roomStatus.isPresenter ? 'You are the PRESENTER' : 'You are an ATTENDEE'}
                </h3>
                <p className={`text-sm mt-1 ${roomStatus.isPresenter ? 'text-purple-700' : 'text-blue-700'}`}>
                  {roomStatus.isPresenter 
                    ? 'You can mark questions as answered/unanswered. You cannot vote on questions.'
                    : 'You can ask questions and vote on unanswered questions. You cannot mark questions as answered.'
                  }
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Questions */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Questions</h2>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${roomStatus?.isPresenter 
              ? 'bg-purple-100 text-purple-700' 
              : 'bg-blue-100 text-blue-700'
            }`}>
              {roomStatus?.isPresenter 
                ? '🎤 You can mark questions as answered' 
                : '👥 You can vote on unanswered questions'
              }
            </div>
          </div>
          <div className="h-96 overflow-y-auto border border-gray-200 rounded p-4 space-y-3">
            {questions.length === 0 ? (
              <p className="text-gray-500 text-center">No questions yet. Ask the first one!</p>
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
                  <div key={question.id} className={`p-4 rounded-lg ${question.answered ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <p className={`text-gray-800 ${question.answered ? 'line-through text-gray-500' : ''}`}>
                          {question.text}
                        </p>
                        {question.answered && (
                          <span className="text-green-600 text-sm font-medium">✓ Answered</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        {roomStatus?.isPresenter ? (
                          <div className="flex items-center gap-2">
                            {/* Voting buttons - disabled for presenter */}
                            <div className="flex items-center gap-2">
                              <button
                                disabled={true}
                                className="px-3 py-2 bg-gray-200 text-gray-500 rounded-lg cursor-not-allowed font-medium"
                              >
                                👍 {question.upvotes}
                              </button>
                              <button
                                disabled={true}
                                className="px-3 py-2 bg-gray-200 text-gray-500 rounded-lg cursor-not-allowed font-medium"
                              >
                                👎 {question.downvotes}
                              </button>
                            </div>
                            {/* Mark as answered button */}
                            <button
                              onClick={() => markAsAnswered(question.id)}
                              disabled={!isConnected || !roomStatus}
                              className={`px-4 py-2 text-sm font-medium rounded-lg shadow-sm ${
                                question.answered 
                                  ? 'bg-red-500 text-white hover:bg-red-600' 
                                  : 'bg-green-500 text-white hover:bg-green-600'
                              } disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors`}
                            >
                              {question.answered ? '❌ Mark Unanswered' : '✅ Mark Answered'}
                            </button>
                          </div>
                        ) : (() => {
                          const userVote = getUserVote(question);
                          return (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleVote(question.id, userVote === "upvote" ? "remove" : "upvote")}
                                disabled={!isConnected || !roomStatus || question.answered}
                                className={`px-3 py-2 rounded-lg transition-colors font-medium ${
                                  userVote === "upvote"
                                    ? "bg-green-600 text-white hover:bg-green-700"
                                    : "bg-green-100 text-green-700 hover:bg-green-200"
                                } disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed`}
                              >
                                👍 {question.upvotes}
                              </button>
                              <button
                                onClick={() => handleVote(question.id, userVote === "downvote" ? "remove" : "downvote")}
                                disabled={!isConnected || !roomStatus || question.answered}
                                className={`px-3 py-2 rounded-lg transition-colors font-medium ${
                                  userVote === "downvote"
                                    ? "bg-red-600 text-white hover:bg-red-700"
                                    : "bg-red-100 text-red-700 hover:bg-red-200"
                                } disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed`}
                              >
                                👎 {question.downvotes}
                              </button>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-xs text-gray-500">
                      <span>
                        Asked by {question.authorSocketId === socket?.id ? 'You' : `User ${question.authorSocketId.slice(0, 8)}`}
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
        <div className={`rounded-lg shadow-md p-6 mb-6 ${roomStatus?.isPresenter 
          ? 'bg-purple-50 border border-purple-200' 
          : 'bg-blue-50 border border-blue-200'
        }`}>
          <div className="flex items-center gap-2 mb-4">
            <h3 className={`text-lg font-semibold ${roomStatus?.isPresenter ? 'text-purple-800' : 'text-blue-800'}`}>
              Ask a Question
            </h3>
            <span className={`text-sm px-2 py-1 rounded ${roomStatus?.isPresenter 
              ? 'bg-purple-200 text-purple-700' 
              : 'bg-blue-200 text-blue-700'
            }`}>
              {roomStatus?.isPresenter ? '🎤 Presenter' : '👥 Attendee'}
            </span>
          </div>
          <div className="flex gap-4">
            <input
              type="text"
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              onKeyPress={handleQuestionKeyPress}
              placeholder={roomStatus?.isPresenter 
                ? "Ask a question as the presenter..." 
                : "Ask a question as an attendee..."
              }
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={!isConnected || !roomStatus}
            />
            <button
              onClick={postQuestion}
              disabled={!isConnected || !roomStatus || !newQuestion.trim()}
              className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Ask
            </button>
          </div>
          <p className={`text-sm mt-2 ${roomStatus?.isPresenter ? 'text-purple-600' : 'text-blue-600'}`}>
            Press Enter to ask, or click the Ask button. Questions will be visible to all members in the room.
          </p>
        </div>
        {/* Testing Instructions */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mt-6">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">Testing Instructions</h3>
          <ul className="text-yellow-700 space-y-1">
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
  );
}
