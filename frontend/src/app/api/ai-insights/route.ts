import { NextRequest, NextResponse } from 'next/server';
import { analyzeQuestionConfusion, AIInsightsRequest } from '../../../utils/geminiApi';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { questions, pdfText, totalPages, overallSummary } = body;

    // Validate required fields
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Questions array is required and must not be empty' },
        { status: 400 }
      );
    }

    if (!pdfText || typeof pdfText !== 'string') {
      return NextResponse.json(
        { success: false, error: 'PDF text is required' },
        { status: 400 }
      );
    }

    if (!totalPages || typeof totalPages !== 'number' || totalPages <= 0) {
      return NextResponse.json(
        { success: false, error: 'Valid total pages number is required' },
        { status: 400 }
      );
    }

    console.log('🤖 AI Insights API called with:', {
      questionsCount: questions.length,
      pdfTextLength: pdfText.length,
      totalPages,
      hasSummary: !!overallSummary
    });

    // Prepare the request
    const insightsRequest: AIInsightsRequest = {
      questions,
      pdfText,
      totalPages,
      overallSummary
    };

    // Call the Gemini API to analyze questions
    const insights = await analyzeQuestionConfusion(insightsRequest);

    console.log('✅ AI insights generated:', insights);

    return NextResponse.json(insights);
  } catch (error) {
    console.error('❌ AI insights API error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error during AI insights analysis',
        confusedAreas: [],
        suggestedSlideNumbers: [],
        analysis: 'Unable to analyze questions at this time.'
      },
      { status: 500 }
    );
  }
}
