import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || '');

export interface SummaryRequest {
  pageNumber: number;
  transcriptionText: string;
}

export interface SummaryResponse {
  pageNumber: number;
  summary: string;
  success: boolean;
  error?: string;
}

/**
 * Generate a summary for a single slide using Gemini API
 */
export async function generateSlideSummary(
  pageNumber: number, 
  transcriptionText: string
): Promise<SummaryResponse> {
  try {
    if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
      throw new Error('Gemini API key not found. Please add NEXT_PUBLIC_GEMINI_API_KEY to your .env.local file.');
    }

    console.log('🔑 Gemini API key found, length:', process.env.NEXT_PUBLIC_GEMINI_API_KEY.length);
    console.log('🔑 API key starts with:', process.env.NEXT_PUBLIC_GEMINI_API_KEY.substring(0, 10) + '...');

    if (!transcriptionText || transcriptionText.trim() === '') {
      return {
        pageNumber,
        summary: 'Blank',
        success: true
      };
    }

    // Try gemini-2.5-flash first, fallback to other models if needed
    let model;
    const modelsToTry = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash', 'gemini-pro-latest'];
    
    for (const modelName of modelsToTry) {
      try {
        model = genAI.getGenerativeModel({ model: modelName });
        console.log(`✅ Using model: ${modelName}`);
        break;
      } catch (modelError) {
        console.log(`❌ ${modelName} not available, trying next...`);
      }
    }
    
    if (!model) {
      throw new Error('No available Gemini models found');
    }

    const prompt = `Please create a concise, professional summary of the following presentation slide transcription. 
    Remove filler words, unnecessary repetitions, and make it more concise while preserving the key information.
    If the transcription is empty or contains only filler words, respond with "Blank".
    
    Slide ${pageNumber} Transcription:
    "${transcriptionText}"
    
    Summary:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const summary = response.text().trim();

    return {
      pageNumber,
      summary: summary || 'Blank',
      success: true
    };
  } catch (error) {
    console.error(`Error generating summary for slide ${pageNumber}:`, error);
    
    // If API fails, provide a basic summary as fallback
    const fallbackSummary = transcriptionText.length > 100 
      ? transcriptionText.substring(0, 100) + '...'
      : transcriptionText || 'Blank';
    
    return {
      pageNumber,
      summary: `[Fallback] ${fallbackSummary}`,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Generate summaries for multiple slides
 */
export async function generateMultipleSummaries(
  requests: SummaryRequest[]
): Promise<SummaryResponse[]> {
  const results: SummaryResponse[] = [];
  
  // Process slides sequentially to avoid rate limiting
  for (const request of requests) {
    const result = await generateSlideSummary(request.pageNumber, request.transcriptionText);
    results.push(result);
    
    // Add a small delay between requests to be respectful to the API
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return results;
}

