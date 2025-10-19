'use client';

interface AudioRecorderOptions {
  sampleRate?: number;
  channels?: number;
  bitRate?: number;
  onTranscriptUpdate?: (transcript: TranscriptEntry) => void;
  onError?: (error: string) => void;
  onStatusChange?: (isActive: boolean) => void;
  socket?: any; // Socket.IO instance
  joinCode?: string; // Room code for sending audio data
}

interface TranscriptEntry {
  id: string;
  text: string;
  confidence: number;
  timestamp: Date | string;
  slideNumber: number;
  wordTimings?: Array<{
    word: string;
    start: number;
    end: number;
  }>;
}

interface TranscriptionSession {
  isActive: boolean;
  deviceType: 'computer' | 'phone';
  startTime?: Date;
  endTime?: Date;
  transcript: TranscriptEntry[];
  currentSlide: number;
}

class AudioRecorderService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioStream: MediaStream | null = null;
  private isRecording: boolean = false;
  private deviceType: 'computer' | 'phone' = 'computer';
  private onTranscriptUpdate?: (transcript: TranscriptEntry) => void;
  private onError?: (error: string) => void;
  private onStatusChange?: (isActive: boolean) => void;

  constructor() {
    this.checkMicrophonePermission();
  }

  /**
   * Check if microphone access is available
   */
  async checkMicrophonePermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      console.error('Microphone access denied:', error);
      return false;
    }
  }

  /**
   * Get available audio input devices
   */
  async getAudioDevices(): Promise<MediaDeviceInfo[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter(device => device.kind === 'audioinput');
    } catch (error) {
      console.error('Error getting audio devices:', error);
      return [];
    }
  }

  /**
   * Start audio recording
   * @param deviceId - Specific device ID to use (optional)
   * @param deviceType - Type of device ('computer' or 'phone')
   */
  async startRecording(deviceId?: string, deviceType: 'computer' | 'phone' = 'computer'): Promise<boolean> {
    try {
      if (this.isRecording) {
        console.warn('Recording is already active');
        return false;
      }

      this.deviceType = deviceType;

      // Request microphone access with specific device if provided
      const constraints: MediaStreamConstraints = {
        audio: deviceId ? { deviceId: { exact: deviceId } } : true
      };

      this.audioStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Create MediaRecorder with optimal settings for speech
      const options: MediaRecorderOptions = {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 16000 // Lower bitrate for speech
      };

      // Fallback to default if the preferred format isn't supported
      if (!MediaRecorder.isTypeSupported(options.mimeType!)) {
        options.mimeType = 'audio/webm';
      }

      this.mediaRecorder = new MediaRecorder(this.audioStream, options);
      
      // Set up event handlers
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.handleAudioData(event.data);
        }
      };

      this.mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        this.onError?.('Recording error occurred');
      };

      this.mediaRecorder.onstop = () => {
        console.log('Recording stopped');
        this.isRecording = false;
        this.onStatusChange?.(false);
      };

      // Start recording with small time slices for real-time processing
      this.mediaRecorder.start(1000); // 1 second chunks
      this.isRecording = true;
      this.onStatusChange?.(true);

      console.log(`Recording started on ${deviceType} device`);
      return true;

    } catch (error) {
      console.error('Error starting recording:', error);
      this.onError?.(`Failed to start recording: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  /**
   * Stop audio recording
   */
  async stopRecording(): Promise<void> {
    try {
      if (this.mediaRecorder && this.isRecording) {
        this.mediaRecorder.stop();
      }

      if (this.audioStream) {
        this.audioStream.getTracks().forEach(track => track.stop());
        this.audioStream = null;
      }

      this.mediaRecorder = null;
      this.isRecording = false;
      this.onStatusChange?.(false);

      console.log('Recording stopped');
    } catch (error) {
      console.error('Error stopping recording:', error);
      this.onError?.('Failed to stop recording');
    }
  }

  /**
   * Handle audio data chunks
   * @param audioBlob - Audio data blob
   */
  private async handleAudioData(audioBlob: Blob): Promise<void> {
    try {
      // Convert blob to base64 for transmission
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      
      // Here you would typically send the audio data to your backend
      // For now, we'll just log it
      console.log('Audio data chunk received:', {
        size: audioBlob.size,
        type: audioBlob.type,
        timestamp: new Date()
      });

      // In a real implementation, you would send this to your WebSocket connection
      // socket.emit('audio-data', { audioData: base64Audio, deviceType: this.deviceType });

    } catch (error) {
      console.error('Error handling audio data:', error);
    }
  }

  /**
   * Get current recording status
   */
  getRecordingStatus(): { isRecording: boolean; deviceType: string } {
    return {
      isRecording: this.isRecording,
      deviceType: this.deviceType
    };
  }

  /**
   * Set callback for transcript updates
   */
  setTranscriptCallback(callback: (transcript: TranscriptEntry) => void): void {
    this.onTranscriptUpdate = callback;
  }

  /**
   * Set callback for error handling
   */
  setErrorCallback(callback: (error: string) => void): void {
    this.onError = callback;
  }

  /**
   * Set callback for status changes
   */
  setStatusCallback(callback: (isActive: boolean) => void): void {
    this.onStatusChange = callback;
  }

  /**
   * Check if the browser supports audio recording
   */
  static isSupported(): boolean {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && MediaRecorder);
  }

  /**
   * Get recommended audio constraints for speech
   */
  static getSpeechConstraints(): MediaStreamConstraints {
    return {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 16000,
        channelCount: 1
      }
    };
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.stopRecording();
    this.onTranscriptUpdate = undefined;
    this.onError = undefined;
    this.onStatusChange = undefined;
  }
}

export default AudioRecorderService;
export type { AudioRecorderOptions, TranscriptEntry, TranscriptionSession };
