import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || '');

export interface SummaryRequest {
  pageNumber: number;
  transcriptionText: string;
  // Enhanced context fields
  slideText?: string;           // Text content from the actual slide
  overallSummary?: string;      // Overall PDF summary for context
  totalPages?: number;          // Total number of slides
  currentPage?: number;         // Current slide being viewed
  isPresenter?: boolean;        // Whether user is presenter
}

export interface SummaryResponse {
  pageNumber: number;
  summary: string;
  success: boolean;
  error?: string;
}

/**
 * Generate a summary for a single slide using Gemini API with enhanced context
 */
export async function generateSlideSummary(
  pageNumber: number, 
  transcriptionText: string,
  context?: {
    slideText?: string;
    overallSummary?: string;
    totalPages?: number;
    currentPage?: number;
    isPresenter?: boolean;
  }
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

    // Build context-aware prompt
    let contextInfo = '';
    if (context) {
      contextInfo = `
CONTEXT:
- Overall Presentation Summary: "${context.overallSummary || 'Not available'}"
- Total Slides: ${context.totalPages || 'Unknown'}
- Current Slide: ${context.currentPage || pageNumber} of ${context.totalPages || 'Unknown'}
- User Role: ${context.isPresenter ? 'Presenter' : 'Attendee'}

SLIDE CONTENT:
"${context.slideText || 'No slide content available'}"`;
    }

    const prompt = `Please create a concise, professional summary of the following presentation slide transcription. 
Use the provided slide content and overall presentation context to create a more accurate and relevant summary.
Remove filler words, unnecessary repetitions, and make it more concise while preserving the key information.
If the transcription is empty or contains only filler words, respond with "Blank".

${contextInfo}

TRANSCRIPTION FOR SLIDE ${pageNumber}:
"${transcriptionText}"

INSTRUCTIONS:
- Use the slide content to better understand what was being discussed
- Reference specific slide elements when relevant
- Consider the overall presentation context for better accuracy
- Make it more concise while preserving key information
- If the transcription is empty or contains only filler words, respond with "Blank"

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
 * Generate summaries for multiple slides with enhanced context
 */
export async function generateMultipleSummaries(
  requests: SummaryRequest[]
): Promise<SummaryResponse[]> {
  const results: SummaryResponse[] = [];
  
  // Process slides sequentially to avoid rate limiting
  for (const request of requests) {
    const context = {
      slideText: request.slideText,
      overallSummary: request.overallSummary,
      totalPages: request.totalPages,
      currentPage: request.currentPage,
      isPresenter: request.isPresenter
    };
    
    const result = await generateSlideSummary(request.pageNumber, request.transcriptionText, context);
    results.push(result);
    
    // Add a small delay between requests to be respectful to the API
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return results;
}

export interface PDFSummaryRequest {
  pdfText: string;
  fileName?: string;
}

export interface PDFSummaryResponse {
  summary: string;
  success: boolean;
  error?: string;
}

export interface QuestionSuggestionsResponse {
  suggestions: string[];
  success: boolean;
  error?: string;
}

export interface QuestionSuggestionsContext {
  slideText?: string;
  overallSummary?: string;
  currentPage?: number;
  totalPages?: number;
  recentQuestions?: string[];
  transcriptionText?: string;
  transcriptionHistory?: Array<{text: string; confidence: number; timestamp: number}>;
}

export interface AIInsightsRequest {
  questions: string[];
  pdfText: string;
  totalPages: number;
  overallSummary?: string;
}

export interface AIInsightsResponse {
  confusedAreas: string[];
  suggestedSlideNumbers: number[];
  analysis: string;
  success: boolean;
  error?: string;
}

/**
 * Generate a comprehensive summary of a PDF document using Gemini API
 */
export async function generatePDFSummary(
  pdfText: string,
  fileName?: string
): Promise<PDFSummaryResponse> {
  try {
    if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
      throw new Error('Gemini API key not found. Please add NEXT_PUBLIC_GEMINI_API_KEY to your .env.local file.');
    }

    console.log('🔑 Gemini API key found for PDF summarization');
    console.log('📄 PDF text length:', pdfText.length);

    if (!pdfText || pdfText.trim() === '') {
      return {
        summary: 'No text content found in the PDF document.',
        success: true
      };
    }

    // Try different Gemini models
    let model;
    const modelsToTry = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash', 'gemini-pro-latest'];
    
    for (const modelName of modelsToTry) {
      try {
        model = genAI.getGenerativeModel({ model: modelName });
        console.log(`✅ Using model for PDF summary: ${modelName}`);
        break;
      } catch (modelError) {
        console.log(`❌ ${modelName} not available for PDF summary, trying next...`);
      }
    }
    
    if (!model) {
      throw new Error('No available Gemini models found for PDF summarization');
    }

    const prompt = `Please create a comprehensive, well-structured summary of the following PDF document. 
    The summary should be informative and useful for presentation participants to understand the document's content.
    
    Guidelines:
    - Provide a clear overview of the main topics and themes
    - Highlight key points, findings, or conclusions
    - Maintain a professional tone
    - Keep it concise but comprehensive (aim for 2-4 paragraphs)
    - If the document appears to be a presentation, note the main sections or slides
    - If it's a report or document, summarize the main findings and recommendations
    
    ${fileName ? `Document: ${fileName}` : 'PDF Document'}
    
    Content:
    "${pdfText.substring(0, 8000)}"${pdfText.length > 8000 ? '\n\n[Content truncated for API limits]' : ''}
    
    Summary:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const summary = response.text().trim();

    return {
      summary: summary || 'Unable to generate summary from the PDF content.',
      success: true
    };
  } catch (error) {
    console.error('Error generating PDF summary:', error);
    
    // If API fails, provide a basic summary as fallback
    const fallbackSummary = pdfText.length > 500 
      ? `Document Summary (Basic): ${pdfText.substring(0, 500)}...`
      : `Document Summary (Basic): ${pdfText}`;
    
    return {
      summary: `[Fallback] ${fallbackSummary}`,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during PDF summarization'
    };
  }
}

/**
 * Generate question suggestions based on user input using Gemini API
 */
export async function getQuestionSuggestions(
  prompt: string,
  context?: QuestionSuggestionsContext
): Promise<QuestionSuggestionsResponse> {
  try {
    if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
      throw new Error('Gemini API key not found. Please add NEXT_PUBLIC_GEMINI_API_KEY to your .env.local file.');
    }

    console.log('🔑 Gemini API key found for question suggestions');
    console.log('💭 Prompt length:', prompt.length);

    if (!prompt || prompt.trim().length < 3) {
      return {
        suggestions: [],
        success: true
      };
    }

    // Try different Gemini models
    let model;
    const modelsToTry = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash', 'gemini-pro-latest'];
    
    for (const modelName of modelsToTry) {
      try {
        model = genAI.getGenerativeModel({ model: modelName });
        console.log(`✅ Using model for question suggestions: ${modelName}`);
        break;
      } catch (modelError) {
        console.log(`❌ ${modelName} not available for question suggestions, trying next...`);
      }
    }
    
    if (!model) {
      throw new Error('No available Gemini models found for question suggestions');
    }

    // Build context-aware prompt
    let contextInfo = '';
    
    // Add PDF context if available
    if (context?.overallSummary) {
      contextInfo += `\n\nPRESENTATION OVERVIEW:\n${context.overallSummary}`;
    }
    
    if (context?.slideText && context?.currentPage && context?.totalPages) {
      const trimmedSlideText = context.slideText.length > 1000 
        ? context.slideText.substring(0, 1000) + '...' 
        : context.slideText;
      contextInfo += `\n\nCURRENT SLIDE (${context.currentPage}/${context.totalPages}):\n${trimmedSlideText}`;
    }
    
    if (context?.transcriptionText) {
      const trimmedTranscription = context.transcriptionText.length > 500 
        ? context.transcriptionText.substring(0, 500) + '...' 
        : context.transcriptionText;
      contextInfo += `\n\nCURRENT PRESENTATION TRANSCRIPTION:\n${trimmedTranscription}`;
    }
    
    if (context?.transcriptionHistory && context.transcriptionHistory.length > 0) {
      const recentTranscriptions = context.transcriptionHistory
        .slice(-3) // Last 3 transcriptions
        .map(t => t.text)
        .join('\n');
      contextInfo += `\n\nRECENT PRESENTATION TRANSCRIPTIONS:\n${recentTranscriptions}`;
    }
    
    if (context?.recentQuestions && context.recentQuestions.length > 0) {
      contextInfo += `\n\nRECENT QUESTIONS IN THIS ROOM:\n${context.recentQuestions.slice(0, 5).map((q, i) => `${i + 1}. ${q}`).join('\n')}`;
    }

    const geminiPrompt = `Generate exactly 3 short, distinct, and relevant question suggestions based on the user's partial input. 
These should be complete questions that someone might ask in a presentation Q&A session.

Guidelines:
- Each question should be 5-80 characters long
- Make them specific and actionable
- Avoid generic questions like "Can you explain more?"
- Focus on the topic implied by the user's input
- Return ONLY a JSON array of strings, no other text
- Example: ["What are the main benefits?", "How does this compare to alternatives?", "What are the implementation challenges?"]

User's partial input: "${prompt}"${contextInfo}

Return 3 question suggestions as a JSON array:`;

    const result = await model.generateContent(geminiPrompt);
    const response = await result.response;
    const text = response.text().trim();

    console.log('🤖 Raw Gemini response:', text);

    // Parse the response robustly
    let suggestions: string[] = [];
    
    // Preprocess: remove markdown code fences
    let cleanedText = text
      .replace(/^```json\s*/gm, '')  // Remove opening ```json
      .replace(/^```\s*$/gm, '')     // Remove closing ```
      .replace(/```json\s*/g, '')    // Remove inline ```json
      .replace(/```\s*/g, '')        // Remove inline ```
      .trim();
    
    console.log('🧹 Cleaned response:', cleanedText);
    
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(cleanedText);
      if (Array.isArray(parsed)) {
        suggestions = parsed.slice(0, 3).filter(s => typeof s === 'string' && s.length >= 5 && s.length <= 80);
      }
    } catch (jsonError) {
      console.log('❌ Failed to parse as JSON, trying line splitting...');
      
      // Fallback: split by lines and clean up
      const lines = cleanedText.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .filter(line => !line.match(/^[0-9]+\./)) // Remove numbered lists
        .filter(line => !line.includes('[') && !line.includes(']')) // Remove JSON artifacts
        .filter(line => !line.match(/^["']/) || !line.match(/["']$/)) // Remove quoted strings
        .slice(0, 3);
      
      suggestions = lines.filter(s => s.length >= 5 && s.length <= 80);
    }

    // Ensure we have at most 3 suggestions
    suggestions = suggestions.slice(0, 3);

    console.log('✅ Processed suggestions:', suggestions);

    return {
      suggestions,
      success: true
    };
  } catch (error) {
    console.error('Error generating question suggestions:', error);
    
    return {
      suggestions: [],
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during question suggestion generation'
    };
  }
}

/**
 * Analyze student questions to identify confused content areas and suggest slides to revisit
 */
export async function analyzeQuestionConfusion(
  request: AIInsightsRequest
): Promise<AIInsightsResponse> {
  try {
    if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
      throw new Error('Gemini API key not found. Please add NEXT_PUBLIC_GEMINI_API_KEY to your .env.local file.');
    }

    console.log('🔑 Gemini API key found for AI insights analysis');
    console.log('📊 Questions count:', request.questions.length);
    console.log('📄 PDF text length:', request.pdfText.length);

    if (!request.questions || request.questions.length === 0) {
      return {
        confusedAreas: [],
        suggestedSlideNumbers: [],
        analysis: 'No questions available for analysis.',
        success: true
      };
    }

    // Try different Gemini models
    let model;
    const modelsToTry = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash', 'gemini-pro-latest'];
    
    for (const modelName of modelsToTry) {
      try {
        model = genAI.getGenerativeModel({ model: modelName });
        console.log(`✅ Using model for AI insights: ${modelName}`);
        break;
      } catch (modelError) {
        console.log(`❌ ${modelName} not available for AI insights, trying next...`);
      }
    }
    
    if (!model) {
      throw new Error('No available Gemini models found for AI insights');
    }

    // Prepare the questions list
    const questionsList = request.questions
      .map((q, i) => `${i + 1}. ${q}`)
      .join('\n');

    // Truncate PDF text if too long (keep first 6000 chars to leave room for other content)
    const truncatedPdfText = request.pdfText.length > 6000 
      ? request.pdfText.substring(0, 6000) + '\n\n[Content truncated for API limits]'
      : request.pdfText;

    const prompt = `You are an AI assistant helping a presenter understand what content areas students are most confused about based on their questions.

ANALYSIS TASK:
Analyze the student questions and the presentation content to identify 1-2 main content areas where students seem confused. Then suggest specific slide numbers the presenter should revisit to clarify these areas.

STUDENT QUESTIONS:
${questionsList}

PRESENTATION CONTENT:
${request.overallSummary ? `\nOVERALL SUMMARY:\n${request.overallSummary}` : ''}

FULL PDF TEXT:
${truncatedPdfText}

TOTAL SLIDES: ${request.totalPages}

INSTRUCTIONS:
1. Identify 1-2 main content areas where students are most confused (be specific and concise)
2. For each confused area, suggest 1-2 specific slide numbers that best address that confusion
3. Provide a brief analysis explaining why these areas are confusing and why those slides should be revisited
4. Focus on content clarity issues, not just any questions asked
5. Be specific about slide numbers (1-${request.totalPages})

RESPONSE FORMAT (return as valid JSON):
{
  "confusedAreas": ["Area 1 description", "Area 2 description"],
  "suggestedSlideNumbers": [slide1, slide2],
  "analysis": "Brief explanation of the confusion patterns and why these slides should be revisited"
}

Example response:
{
  "confusedAreas": ["Machine learning algorithm selection criteria", "Data preprocessing steps"],
  "suggestedSlideNumbers": [3, 7],
  "analysis": "Students are asking many questions about how to choose between different ML algorithms and the specific steps for data cleaning. Slides 3 and 7 cover these topics but may need more detailed examples."
}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();

    console.log('🤖 Raw AI insights response:', text);

    // Parse the response
    let insights: AIInsightsResponse;
    
    try {
      // Clean up the response
      let cleanedText = text
        .replace(/^```json\s*/gm, '')  // Remove opening ```json
        .replace(/^```\s*$/gm, '')     // Remove closing ```
        .replace(/```json\s*/g, '')    // Remove inline ```json
        .replace(/```\s*/g, '')        // Remove inline ```
        .trim();

      console.log('🧹 Cleaned AI insights response:', cleanedText);
      
      const parsed = JSON.parse(cleanedText);
      
      // Validate the response structure
      if (parsed.confusedAreas && Array.isArray(parsed.confusedAreas) &&
          parsed.suggestedSlideNumbers && Array.isArray(parsed.suggestedSlideNumbers) &&
          parsed.analysis && typeof parsed.analysis === 'string') {
        
        // Ensure slide numbers are within valid range
        const validSlideNumbers = parsed.suggestedSlideNumbers
          .filter((num: number) => typeof num === 'number' && num >= 1 && num <= request.totalPages)
          .slice(0, 2); // Limit to 2 slides max
        
        insights = {
          confusedAreas: parsed.confusedAreas.slice(0, 2), // Limit to 2 areas max
          suggestedSlideNumbers: validSlideNumbers,
          analysis: parsed.analysis,
          success: true
        };
      } else {
        throw new Error('Invalid response structure from AI');
      }
    } catch (parseError) {
      console.error('❌ Failed to parse AI insights response:', parseError);
      
      // Fallback response
      insights = {
        confusedAreas: ['Content understanding needs clarification'],
        suggestedSlideNumbers: [1],
        analysis: 'Students have questions that suggest some content areas need further explanation. Consider reviewing the presentation flow.',
        success: false,
        error: 'Failed to parse AI response'
      };
    }

    console.log('✅ Processed AI insights:', insights);
    return insights;

  } catch (error) {
    console.error('Error analyzing question confusion:', error);
    
    return {
      confusedAreas: [],
      suggestedSlideNumbers: [],
      analysis: 'Unable to analyze questions at this time.',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during AI insights analysis'
    };
  }
}

