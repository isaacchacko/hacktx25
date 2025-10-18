'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../app/context/AuthContext';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  currentRoom: string | null;
  isPresenter: boolean;
  joinRoom: (joinCode: string) => void;
  leaveRoom: () => void;
  createRoom: () => void;
}

export const useSocket = (): SocketContextType => {
  const { user, getIdToken } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const [isPresenter, setIsPresenter] = useState(false);

  useEffect(() => {
    console.log('useSocket useEffect running, user:', user?.uid);
    
    if (!user) {
      // Disconnect socket if user is not authenticated
      if (socketRef.current) {
        console.log('Disconnecting socket - no user');
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
        setCurrentRoom(null);
        setIsPresenter(false);
      }
      return;
    }

    // Connect to socket server with Firebase token
    const connectSocket = async () => {
      try {
        const token = await getIdToken();
        if (!token) return;

        // Don't create a new socket if one already exists
        if (socketRef.current) {
          console.log('Socket already exists, skipping connection');
          return;
        }

        console.log('Creating new socket connection for user:', user.uid);
        const socket = io('http://localhost:3001', {
          auth: {
            token: token
          }
        });

        socketRef.current = socket;

        socket.on('connect', () => {
          console.log('Connected to socket server');
          setIsConnected(true);
          
          // Authenticate with Firebase token
          socket.emit('authenticate', { token });
        });

        socket.on('authenticated', (data) => {
          console.log('Socket authenticated:', data);
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
  }, [user]); // Removed getIdToken from dependencies

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
      socketRef.current.emit('create-room');
    }
  };

  return {
    socket: socketRef.current,
    isConnected,
    currentRoom,
    isPresenter,
    joinRoom,
    leaveRoom,
    createRoom
  };
};
