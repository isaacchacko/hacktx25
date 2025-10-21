import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { audioUrl } = body;

    if (!process.env.ASSEMBLY_API_KEY) {
      return NextResponse.json({ error: 'AssemblyAI API key not configured' }, { status: 500 });
    }

    // Submit transcription job
    const submitResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: {
        'authorization': process.env.ASSEMBLY_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ audio_url: audioUrl }),
    });

    const submitData = await submitResponse.json();
    
    if (!submitData.id) {
      throw new Error('Failed to submit transcription job');
    }

    // Poll for results
    let result;
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds max

    while (attempts < maxAttempts) {
      const statusResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${submitData.id}`, {
        headers: { 'authorization': process.env.ASSEMBLY_API_KEY },
      });
      
      result = await statusResponse.json();
      
      if (result.status === 'completed') {
        break;
      } else if (result.status === 'error') {
        throw new Error('Transcription failed');
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }

    if (result.status !== 'completed') {
      throw new Error('Transcription timeout');
    }

    return NextResponse.json({ 
      text: result.text,
      confidence: result.confidence,
      words: result.words 
    });
  } catch (error) {
    console.error('AssemblyAI API error:', error);
    return NextResponse.json({ error: 'Failed to transcribe audio' }, { status: 500 });
  }
}
