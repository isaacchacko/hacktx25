# Slide Summary Feature

This feature allows both presenters and attendees to generate intelligent summaries of each slide based on the transcriptions captured during the presentation.

## Features

- **Download Summary Button**: Available on both presenter and attendee sides
- **Intelligent Summarization**: Uses Google's Gemini API to create concise, professional summaries
- **Per-Slide Summaries**: Each slide gets its own summary based on its transcriptions
- **Console Output**: Summaries are output to the browser console for easy viewing
- **Blank Slide Handling**: Slides with no transcriptions are marked as "Blank"

## Setup

1. **Get a Gemini API Key**:
   - Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Create a new API key
   - Copy the API key

2. **Configure Environment**:
   - Open `/frontend/.env.local`
   - Add your Gemini API key:
     ```
     NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here
     ```

3. **Restart the Development Server**:
   ```bash
   cd frontend
   npm run dev
   ```

## How to Use

1. **Start a Presentation**:
   - Create a room with a PDF presentation
   - Start voice recording (as presenter)
   - Navigate through slides while speaking

2. **Generate Summaries**:
   - Look for the "📝 Slide Summaries" section
   - Click the "📥 Download Summary" button
   - Open browser console (F12) to view the generated summaries

3. **View Results**:
   - Summaries will be displayed in the console
   - Each slide shows its intelligent summary
   - Blank slides are clearly marked

## Example Output

```
📝 SUMMARY GENERATED:
==================
Slide 1: Introduction to our new product features and market analysis
Slide 2: Technical specifications and implementation details
Slide 3: Blank
Slide 4: Q&A session covering user feedback and next steps
==================
```

## Technical Details

- **API Integration**: Uses Google's Gemini Pro model for summarization
- **Rate Limiting**: Includes delays between API calls to respect rate limits
- **Error Handling**: Gracefully handles API errors and missing transcriptions
- **Transcription Processing**: Combines all transcriptions for each slide before summarization

## Future Enhancements

- Download summaries as text files
- Export to PDF format
- Email summaries to participants
- Real-time summary updates during presentation
- Custom summary templates

