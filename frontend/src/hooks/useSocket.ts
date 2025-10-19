'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../app/context/AuthContext';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  currentRoom: string | null;
  isPresenter: boolean;
  isAnonymous: boolean;
  joinRoom: (joinCode: string) => void;
  leaveRoom: () => void;
  createRoom: () => void;
  createRoomWithPdf: (pdfUrl: string, summary?: string, pageTexts?: string[]) => void;
}

export const useSocket = (): SocketContextType => {
  const { user, getIdToken } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const [isPresenter, setIsPresenter] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);

  useEffect(() => {
    console.log('useSocket useEffect running, user:', user?.uid);
    
    // Connect to socket server (with or without authentication)
    const connectSocket = async () => {
      try {
        // Don't create a new socket if one already exists
        if (socketRef.current) {
          console.log('Socket already exists, skipping connection');
          return;
        }

        let authData = {};
        if (user) {
          const token = await getIdToken();
          if (token) {
            authData = { token };
            console.log('Creating authenticated socket connection for user:', user.uid);
          } else {
            console.log('Creating anonymous socket connection (no token)');
          }
        } else {
          console.log('Creating anonymous socket connection (no user)');
        }

        const socket = io('http://localhost:3001', {
          auth: authData
        });

        socketRef.current = socket;

        socket.on('connect', () => {
          console.log('Connected to socket server');
          setIsConnected(true);
          
          // Authenticate (with or without token)
          if (user) {
            getIdToken().then(token => {
              socket.emit('authenticate', { token });
            });
          } else {
            socket.emit('authenticate', {});
          }
        });

        socket.on('authenticated', (data) => {
          console.log('Socket authenticated:', data);
          setIsAnonymous(data.isAnonymous || false);
        });

        socket.on('room-created', (data) => {
          console.log('Room created:', data);
          setCurrentRoom(data.joinCode);
          setIsPresenter(true);
          console.log('Set isPresenter to true from room-created');
        });

        socket.on('joined-room', (data) => {
          console.log('Joined room:', data);
          console.log('isPresenter from joined-room:', data.isPresenter);
          setCurrentRoom(data.joinCode);
          setIsPresenter(data.isPresenter);
          console.log('Set isPresenter to:', data.isPresenter);
        });

        socket.on('disconnect', () => {
          console.log('Disconnected from socket server');
          setIsConnected(false);
          setCurrentRoom(null);
          setIsPresenter(false);
          setIsAnonymous(false);
        });

        socket.on('error', (error) => {
          console.error('Socket error:', error);
        });

      } catch (error) {
        console.error('Failed to connect to socket:', error);
      }
    };

    connectSocket();

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [user, getIdToken]); // Re-added getIdToken since we need it for authentication

  const joinRoom = (joinCode: string) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('join-room', joinCode);
    }
  };

  const leaveRoom = () => {
    if (socketRef.current && currentRoom) {
      socketRef.current.emit('leave-room', currentRoom);
      setCurrentRoom(null);
      setIsPresenter(false);
    }
  };

  const createRoom = () => {
    if (socketRef.current && isConnected) {
      console.log('🏠 Creating room without PDF...');
      socketRef.current.emit('create-room');
    }
  };

  const createRoomWithPdf = (pdfUrl: string, summary?: string, pageTexts?: string[]) => {
    if (socketRef.current && isConnected) {
      console.log('🏠 Creating room with PDF URL:', pdfUrl);
      console.log('📄 PDF Summary:', summary ? 'Provided' : 'Not provided');
      console.log('📄 PDF Page Texts:', pageTexts ? `Provided (${pageTexts.length} pages)` : 'Not provided');
      socketRef.current.emit('create-room-with-pdf', { pdfUrl, summary, pageTexts });
    }
  };

  return {
    socket: socketRef.current,
    isConnected,
    currentRoom,
    isPresenter,
    isAnonymous,
    joinRoom,
    leaveRoom,
    createRoom,
    createRoomWithPdf
  };
};
