'use client';

import React, { useState, useEffect } from 'react';
import AudioRecorderService from '../services/audioRecorderService';

interface PresenterTranscriptControlsProps {
  joinCode: string;
  isPresenter: boolean;
  onTranscriptionStart?: (deviceType: 'computer' | 'phone') => void;
  onTranscriptionStop?: () => void;
  onSlideChange?: (slideNumber: number) => void;
  className?: string;
}

const PresenterTranscriptControls: React.FC<PresenterTranscriptControlsProps> = ({
  joinCode,
  isPresenter,
  onTranscriptionStart,
  onTranscriptionStop,
  onSlideChange,
  className = ''
}) => {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<'computer' | 'phone'>('computer');
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  const audioRecorder = React.useRef<AudioRecorderService | null>(null);

  useEffect(() => {
    // Initialize audio recorder service
    audioRecorder.current = new AudioRecorderService();
    setIsSupported(AudioRecorderService.isSupported());

    // Load available audio devices
    loadAudioDevices();

    // Set up error handling
    audioRecorder.current.setErrorCallback((errorMessage) => {
      setError(errorMessage);
    });

    // Set up status change handling
    audioRecorder.current.setStatusCallback((isActive) => {
      setIsTranscribing(isActive);
    });

    return () => {
      audioRecorder.current?.cleanup();
    };
  }, []);

  const loadAudioDevices = async () => {
    try {
      const devices = await audioRecorder.current?.getAudioDevices() || [];
      setAudioDevices(devices);
      
      // Set default device if available
      if (devices.length > 0) {
        setSelectedDeviceId(devices[0].deviceId);
      }
    } catch (error) {
      console.error('Error loading audio devices:', error);
      setError('Failed to load audio devices');
    }
  };

  const handleStartTranscription = async () => {
    if (!audioRecorder.current || !isSupported) {
      setError('Audio recording is not supported in this browser');
      return;
    }

    try {
      setError(null);
      
      const success = await audioRecorder.current.startRecording(selectedDeviceId, selectedDevice);
      
      if (success) {
        setIsTranscribing(true);
        onTranscriptionStart?.(selectedDevice);
        
        // Here you would emit to your Socket.IO connection
        // socket.emit('start-transcription', { joinCode, deviceType: selectedDevice });
        
        console.log(`Transcription started on ${selectedDevice} device`);
      } else {
        setError('Failed to start transcription');
      }
    } catch (error) {
      console.error('Error starting transcription:', error);
      setError('Failed to start transcription');
    }
  };

  const handleStopTranscription = async () => {
    try {
      await audioRecorder.current?.stopRecording();
      setIsTranscribing(false);
      onTranscriptionStop?.();
      
      // Here you would emit to your Socket.IO connection
      // socket.emit('stop-transcription', { joinCode });
      
      console.log('Transcription stopped');
    } catch (error) {
      console.error('Error stopping transcription:', error);
      setError('Failed to stop transcription');
    }
  };

  const handleDeviceTypeChange = (deviceType: 'computer' | 'phone') => {
    setSelectedDevice(deviceType);
    
    // For phone, we might want to show different UI or handle differently
    if (deviceType === 'phone') {
      // Could show QR code or instructions for phone recording
      console.log('Phone recording selected - consider showing QR code or instructions');
    }
  };

  const handleSlideChange = (slideNumber: number) => {
    onSlideChange?.(slideNumber);
    
    // Here you would emit to your Socket.IO connection
    // socket.emit('slide-changed', { joinCode, slideNumber });
    
    console.log(`Slide changed to ${slideNumber}`);
  };

  if (!isPresenter) {
    return null;
  }

  if (!isSupported) {
    return (
      <div className={`bg-yellow-50 border border-yellow-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center gap-2 text-yellow-800">
          <span className="text-xl">⚠️</span>
          <div>
            <h3 className="font-semibold">Audio Recording Not Supported</h3>
            <p className="text-sm">Your browser doesn't support audio recording. Please use a modern browser like Chrome, Firefox, or Safari.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-md ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-lg font-semibold text-gray-800">Transcription Controls</h3>
          <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-sm font-medium">
            🎤 PRESENTER
          </span>
        </div>
        <p className="text-sm text-gray-600">
          Start live transcription for attendees. Choose your recording device below.
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-100 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Device Selection */}
      <div className="p-4 space-y-4">
        {/* Device Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Recording Device Type
          </label>
          <div className="flex gap-3">
            <button
              onClick={() => handleDeviceTypeChange('computer')}
              disabled={isTranscribing}
              className={`flex-1 p-3 rounded-lg border-2 transition-colors ${
                selectedDevice === 'computer'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300'
              } ${isTranscribing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="text-center">
                <div className="text-2xl mb-1">💻</div>
                <div className="font-medium">Computer</div>
                <div className="text-xs">Use this device's microphone</div>
              </div>
            </button>
            
            <button
              onClick={() => handleDeviceTypeChange('phone')}
              disabled={isTranscribing}
              className={`flex-1 p-3 rounded-lg border-2 transition-colors ${
                selectedDevice === 'phone'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300'
              } ${isTranscribing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="text-center">
                <div className="text-2xl mb-1">📱</div>
                <div className="font-medium">Phone</div>
                <div className="text-xs">Use your phone's microphone</div>
              </div>
            </button>
          </div>
        </div>

        {/* Audio Device Selection (for computer) */}
        {selectedDevice === 'computer' && audioDevices.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Microphone Device
            </label>
            <select
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
              disabled={isTranscribing}
              className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
            >
              {audioDevices.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Phone Instructions */}
        {selectedDevice === 'phone' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <span className="text-blue-600 text-lg">📱</span>
              <div>
                <h4 className="font-medium text-blue-800 mb-1">Phone Recording Setup</h4>
                <p className="text-sm text-blue-700">
                  To use your phone for recording, you'll need to connect it to the same room.
                  The phone will act as a separate audio input device.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Control Buttons */}
        <div className="flex gap-3">
          {!isTranscribing ? (
            <button
              onClick={handleStartTranscription}
              className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
            >
              🎤 Start Transcription
            </button>
          ) : (
            <button
              onClick={handleStopTranscription}
              className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
            >
              ⏹️ Stop Transcription
            </button>
          )}
        </div>

        {/* Status */}
        <div className="flex items-center justify-center gap-2 text-sm">
          <div className={`w-2 h-2 rounded-full ${isTranscribing ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
          <span className="text-gray-600">
            {isTranscribing ? 'Transcription Active' : 'Transcription Inactive'}
          </span>
        </div>
      </div>

      {/* Quick Slide Controls */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Quick Slide Navigation</h4>
        <div className="flex gap-2">
          <button
            onClick={() => handleSlideChange(1)}
            className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors"
          >
            Slide 1
          </button>
          <button
            onClick={() => handleSlideChange(2)}
            className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors"
          >
            Slide 2
          </button>
          <button
            onClick={() => handleSlideChange(3)}
            className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors"
          >
            Slide 3
          </button>
          <input
            type="number"
            placeholder="Go to slide..."
            min="1"
            className="px-2 py-1 border border-gray-300 rounded text-sm w-20"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                const slideNumber = parseInt((e.target as HTMLInputElement).value);
                if (slideNumber > 0) {
                  handleSlideChange(slideNumber);
                  (e.target as HTMLInputElement).value = '';
                }
              }
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default PresenterTranscriptControls;
