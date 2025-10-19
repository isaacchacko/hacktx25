# Live Transcript Feature

This document describes the live transcript functionality implemented for the presentation platform.

## Overview

The live transcript feature provides real-time speech-to-text transcription for presentations, allowing attendees to view live captions and download transcripts at the end of sessions. The system is designed with accessibility in mind and provides multiple device options for presenters.

## Features

### For Presenters
- **Device Selection**: Choose between computer microphone or phone for recording
- **Real-time Control**: Start/stop transcription with visual feedback
- **Slide Association**: Transcripts are automatically linked to current slide
- **Audio Device Management**: Select specific microphone devices
- **Session Management**: Monitor transcription status and session info

### For Attendees
- **Live Captions**: View real-time transcript with confidence indicators
- **Captions Toggle**: Turn captions on/off as needed
- **Delay Warning**: Visual indicator when transcription delay is high (>5s)
- **Slide Context**: See which slide each transcript segment belongs to
- **Download Options**: Download complete transcript or current slide only
- **Confidence Indicators**: Color-coded confidence levels for transcript accuracy

## Technical Implementation

### Backend Components

#### TranscriptService (`backend/services/transcriptService.js`)
- Manages Assembly AI integration
- Handles real-time transcription sessions
- Associates transcripts with slides
- Provides transcript storage and retrieval
- Calculates transcription delays

#### Socket.IO Events
- `start-transcription`: Start new transcription session
- `stop-transcription`: End transcription session
- `slide-changed`: Update current slide for transcript association
- `get-transcript`: Retrieve transcript data
- `get-slide-transcripts`: Get slide-specific transcripts
- `get-transcription-status`: Check transcription status
- `transcript-update`: Real-time transcript updates
- `transcription-status`: Broadcast status changes
- `transcription-error`: Handle transcription errors

### Frontend Components

#### AudioRecorderService (`frontend/src/services/audioRecorderService.ts`)
- Browser audio recording management
- Device enumeration and selection
- Real-time audio data handling
- Error handling and status management

#### TranscriptDisplay (`frontend/src/components/TranscriptDisplay.tsx`)
- Live transcript visualization
- Captions toggle functionality
- Delay warning system
- Confidence indicators
- Auto-scrolling transcript

#### PresenterTranscriptControls (`frontend/src/components/PresenterTranscriptControls.tsx`)
- Device selection interface
- Transcription start/stop controls
- Slide navigation
- Audio device management
- Session status display

#### useTranscript Hook (`frontend/src/hooks/useTranscript.ts`)
- Centralized transcript state management
- Socket.IO event handling
- Transcript operations (start, stop, update, download)
- Error handling and status tracking

## Setup Instructions

### 1. Backend Setup

1. Install dependencies:
```bash
cd backend
npm install assemblyai ws
```

2. Set up Assembly AI API key:
```bash
# Add to your environment variables
export ASSEMBLYAI_API_KEY=your-assemblyai-api-key-here
```

3. Start the backend server:
```bash
npm run dev
```

### 2. Frontend Setup

The frontend components are already integrated into the room page (`frontend/src/app/[joinCode]/page.tsx`).

### 3. Assembly AI Configuration

1. Sign up for Assembly AI at https://www.assemblyai.com/
2. Get your API key from the dashboard
3. Add the key to your backend environment variables

## Usage Flow

### Presenter Workflow
1. Join room as presenter
2. Click "Start Transcription" in the presenter controls
3. Select recording device (computer or phone)
4. Choose specific microphone if using computer
5. Navigate slides using quick controls or external presentation software
6. Stop transcription when presentation ends

### Attendee Workflow
1. Join room as attendee
2. View live transcript automatically (if transcription is active)
3. Toggle captions on/off as needed
4. Monitor delay warnings if transcription is slow
5. Download transcript at the end of session

## Data Structure

### TranscriptEntry
```typescript
interface TranscriptEntry {
  id: string;
  text: string;
  confidence: number;
  timestamp: Date;
  slideNumber: number;
  wordTimings?: Array<{
    word: string;
    start: number;
    end: number;
  }>;
}
```

### TranscriptionSession
```typescript
interface TranscriptionSession {
  isActive: boolean;
  deviceType: 'computer' | 'phone';
  startTime?: Date;
  endTime?: Date;
  transcript: TranscriptEntry[];
  currentSlide: number;
}
```

## Browser Compatibility

- **Chrome**: Full support
- **Firefox**: Full support
- **Safari**: Full support
- **Edge**: Full support

Requires modern browsers with WebRTC support for audio recording.

## Security Considerations

- Audio data is processed in real-time and not stored permanently
- Transcripts are stored in memory during sessions
- API keys should be kept secure and not exposed to frontend
- User permissions are required for microphone access

## Future Enhancements

1. **Multi-language Support**: Add language detection and translation
2. **Speaker Identification**: Distinguish between multiple speakers
3. **Offline Mode**: Cache transcripts for offline viewing
4. **Export Formats**: Support for PDF, Word, and other formats
5. **Integration**: Connect with external presentation software
6. **Analytics**: Track transcription accuracy and usage patterns

## Troubleshooting

### Common Issues

1. **Microphone Access Denied**
   - Check browser permissions
   - Ensure HTTPS connection
   - Try refreshing the page

2. **Transcription Not Starting**
   - Verify Assembly AI API key
   - Check backend server connection
   - Ensure presenter permissions

3. **High Delay**
   - Check internet connection
   - Verify Assembly AI service status
   - Consider using computer instead of phone

4. **Audio Quality Issues**
   - Test different microphones
   - Check audio device settings
   - Ensure quiet environment

## API Limits

- Assembly AI has rate limits based on your plan
- Free tier includes limited monthly minutes
- Consider upgrading for production use

## Support

For technical support or questions about the transcript feature, please refer to:
- Assembly AI documentation: https://www.assemblyai.com/docs
- Browser WebRTC documentation
- Project repository issues section
