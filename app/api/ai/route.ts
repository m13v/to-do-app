import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error('GEMINI_API_KEY environment variable not set');
}

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro-preview-06-05" });

export async function POST(request: NextRequest) {
  try {
    const { systemPrompt, userPrompt } = await request.json();
    
    if (!systemPrompt || !userPrompt) {
      return NextResponse.json({ error: 'Both systemPrompt and userPrompt are required.' }, { status: 400 });
    }
    
    const chat = model.startChat({
      history: [
        { role: "user", parts: [{ text: systemPrompt }] },
        { role: "model", parts: [{ text: "Understood. I will follow all rules." }] },
      ],
      generationConfig: {
        maxOutputTokens: 8000,
      },
    });

    const result = await chat.sendMessage(userPrompt);
    const response = result.response;
    const aiResponse = response.text();
    
    return NextResponse.json({ content: aiResponse });

  } catch (error) {
    console.error('Error in AI service:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    
    // Check for specific error related to oversized prompts
    if (errorMessage.includes('400 Bad Request') || errorMessage.includes('request entity too large')) {
      return NextResponse.json({ 
        error: 'The task list is too large for the AI to process. Please filter your tasks or try a different prompt.',
        details: errorMessage 
      }, { status: 413 }); // 413 Payload Too Large
    }
    
    return NextResponse.json({ error: 'Failed to get response from AI', details: errorMessage }, { status: 500 });
  }
}
