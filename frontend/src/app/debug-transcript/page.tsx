'use client';

import React, { useState, useEffect } from 'react';
import { useSocket } from '../hooks/useSocket';
import { useTranscript } from '../hooks/useTranscript';

export default function TranscriptDebugPage() {
  const { socket, isConnected, isPresenter, joinRoom, currentRoom } = useSocket();
  const [joinCode, setJoinCode] = useState('TEST123');
  const [debugLogs, setDebugLogs] = useState<string[]>([]);

  const {
    transcript,
    isTranscribing,
    currentSlide,
    delay,
    sessionInfo,
    error: transcriptError,
    startTranscription,
    stopTranscription,
    updateSlide
  } = useTranscript({ joinCode, isPresenter, socket });

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    console.log(message);
  };

  useEffect(() => {
    addLog(`Socket connected: ${isConnected}`);
    addLog(`Is presenter: ${isPresenter}`);
    addLog(`Current room: ${currentRoom}`);
  }, [isConnected, isPresenter, currentRoom]);

  useEffect(() => {
    addLog(`Transcript length: ${transcript.length}`);
    addLog(`Is transcribing: ${isTranscribing}`);
    addLog(`Current slide: ${currentSlide}`);
    addLog(`Delay: ${delay}ms`);
  }, [transcript.length, isTranscribing, currentSlide, delay]);

  const handleJoinRoom = () => {
    addLog(`Joining room: ${joinCode}`);
    joinRoom(joinCode);
  };

  const handleStartTranscription = () => {
    addLog('Starting transcription...');
    startTranscription('computer');
  };

  const handleStopTranscription = () => {
    addLog('Stopping transcription...');
    stopTranscription();
  };

  const handleUpdateSlide = () => {
    const newSlide = currentSlide + 1;
    addLog(`Updating slide to: ${newSlide}`);
    updateSlide(newSlide);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Transcript Debug Page</h1>
        
        {/* Connection Status */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <h2 className="text-xl font-semibold mb-4">Connection Status</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="font-medium">Socket Connected:</span>
              <span className={`ml-2 px-2 py-1 rounded ${isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {isConnected ? 'Yes' : 'No'}
              </span>
            </div>
            <div>
              <span className="font-medium">Is Presenter:</span>
              <span className={`ml-2 px-2 py-1 rounded ${isPresenter ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                {isPresenter ? 'Yes' : 'No'}
              </span>
            </div>
            <div>
              <span className="font-medium">Current Room:</span>
              <span className="ml-2 px-2 py-1 bg-gray-100 rounded">{currentRoom || 'None'}</span>
            </div>
            <div>
              <span className="font-medium">Join Code:</span>
              <span className="ml-2 px-2 py-1 bg-gray-100 rounded">{joinCode}</span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <h2 className="text-xl font-semibold mb-4">Controls</h2>
          <div className="flex gap-4 mb-4">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              placeholder="Enter room code"
              className="px-3 py-2 border border-gray-300 rounded-lg"
            />
            <button
              onClick={handleJoinRoom}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Join Room
            </button>
          </div>
          
          {isPresenter && (
            <div className="flex gap-4">
              <button
                onClick={handleStartTranscription}
                disabled={!isConnected || isTranscribing}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300"
              >
                Start Transcription
              </button>
              <button
                onClick={handleStopTranscription}
                disabled={!isConnected || !isTranscribing}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:bg-gray-300"
              >
                Stop Transcription
              </button>
              <button
                onClick={handleUpdateSlide}
                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
              >
                Next Slide ({currentSlide + 1})
              </button>
            </div>
          )}
        </div>

        {/* Transcript Status */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <h2 className="text-xl font-semibold mb-4">Transcript Status</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="font-medium">Is Transcribing:</span>
              <span className={`ml-2 px-2 py-1 rounded ${isTranscribing ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                {isTranscribing ? 'Yes' : 'No'}
              </span>
            </div>
            <div>
              <span className="font-medium">Current Slide:</span>
              <span className="ml-2 px-2 py-1 bg-gray-100 rounded">{currentSlide}</span>
            </div>
            <div>
              <span className="font-medium">Delay:</span>
              <span className="ml-2 px-2 py-1 bg-gray-100 rounded">{delay}ms</span>
            </div>
            <div>
              <span className="font-medium">Transcript Entries:</span>
              <span className="ml-2 px-2 py-1 bg-gray-100 rounded">{transcript.length}</span>
            </div>
          </div>
          
          {sessionInfo && (
            <div className="mt-4">
              <h3 className="font-medium mb-2">Session Info:</h3>
              <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto">
                {JSON.stringify(sessionInfo, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Transcript Content */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <h2 className="text-xl font-semibold mb-4">Transcript Content</h2>
          {transcript.length === 0 ? (
            <p className="text-gray-500">No transcript entries yet...</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {transcript.map((entry, index) => (
                <div key={entry.id} className="p-2 bg-gray-50 rounded border">
                  <div className="font-medium">Entry {index + 1}</div>
                  <div className="text-sm text-gray-600">Slide: {entry.slideNumber}</div>
                  <div className="text-sm text-gray-600">Confidence: {Math.round(entry.confidence * 100)}%</div>
                  <div className="mt-1">{entry.text}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Debug Logs */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <h2 className="text-xl font-semibold mb-4">Debug Logs</h2>
          <div className="max-h-64 overflow-y-auto bg-gray-100 p-2 rounded">
            {debugLogs.length === 0 ? (
              <p className="text-gray-500">No logs yet...</p>
            ) : (
              debugLogs.map((log, index) => (
                <div key={index} className="text-sm font-mono mb-1">{log}</div>
              ))
            )}
          </div>
        </div>

        {/* Error Display */}
        {transcriptError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mt-4">
            <strong>Error:</strong> {transcriptError}
          </div>
        )}
      </div>
    </div>
  );
}
