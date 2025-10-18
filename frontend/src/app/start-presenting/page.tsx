"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";

export default function Home() {
  const router = useRouter();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [userToken, setUserToken] = useState<string | null>(null);

  // Load token from localStorage on component mount
  useEffect(() => {
    const savedToken = localStorage.getItem('qa-room-token');
    if (savedToken) {
      setUserToken(savedToken);
    }
  }, []);

  const connectToServer = () => {
    if (socket) return;
    
    const newSocket = io("http://localhost:3001");
    setSocket(newSocket);

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
    });

    newSocket.on("disconnect", () => {
      console.log("Disconnected from server");
      setIsConnected(false);
    });

    newSocket.on("room-created", (data: { joinCode: string }) => {
      console.log("Room created:", data);
      setIsCreatingRoom(false);
      router.push(`/${data.joinCode}`);
    });

    newSocket.on("error", (errorMessage: string) => {
      console.error("Socket error:", errorMessage);
      setError(errorMessage);
      setIsCreatingRoom(false);
    });
  };

  const createRoom = () => {
    if (!socket || !isConnected) {
      setError("Not connected to server. Please connect first.");
      return;
    }

    setIsCreatingRoom(true);
    setError(null);
    socket.emit("create-room");
  };

  const joinRoom = () => {
    if (!joinCode.trim()) {
      setError("Please enter a room code");
      return;
    }
    
    router.push(`/${joinCode.trim()}`);
  };

  const handleJoinKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      joinRoom();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Q&A Room
          </h1>
          <p className="text-gray-600">
            Create or join a room to start asking questions
          </p>
        </div>

        {/* Connection Status */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Connection</h2>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-gray-600">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
          
          {!isConnected && (
            <button
              onClick={connectToServer}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Connect to Server
            </button>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Room Actions */}
        <div className="space-y-4">
          {/* Create Room */}
          <div className="bg-gradient-to-r from-purple-50 to-purple-100 border-2 border-purple-200 rounded-lg shadow-md p-6">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-lg font-semibold text-purple-800">Create New Room</h3>
              <span className="bg-purple-200 text-purple-700 px-2 py-1 rounded text-sm font-medium">🎤 PRESENTER</span>
            </div>
            <p className="text-sm text-purple-700 mb-4">
              Create a new room and become the presenter. You'll be able to mark questions as answered and manage the Q&A session.
            </p>
            <button
              onClick={createRoom}
              disabled={!isConnected || isCreatingRoom}
              className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {isCreatingRoom ? "Creating Room..." : "Create Room"}
            </button>
          </div>

          {/* Join Room */}
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-200 rounded-lg shadow-md p-6">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-lg font-semibold text-blue-800">Join Existing Room</h3>
              <span className="bg-blue-200 text-blue-700 px-2 py-1 rounded text-sm font-medium">👥 ATTENDEE</span>
            </div>
            <p className="text-sm text-blue-700 mb-4">
              Enter a room code to join as a participant. You can ask questions and vote on unanswered questions.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                onKeyPress={handleJoinKeyPress}
                placeholder="Enter room code..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={joinRoom}
                disabled={!joinCode.trim()}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Join
              </button>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Features</h3>
          <ul className="text-sm text-gray-600 space-y-2">
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              Real-time question posting and voting
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              Questions persist even when users leave
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              Presenter can mark questions as answered
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              Questions sorted by popularity
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}