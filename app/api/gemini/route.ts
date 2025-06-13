import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: NextRequest) {
  try {
    console.log('API route called');
    
    const { prompt, currentContent } = await request.json();
    console.log('Received prompt:', prompt);
    console.log('Current content length:', currentContent?.length);

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro-preview-06-05' });

    const systemPrompt = `You are a task management assistant. You have a markdown table with categories and tasks.

Current markdown content:
${currentContent}

User's request: ${prompt}

Please modify the markdown table according to the user's request. You can:
- Add new tasks
- Remove tasks
- Change categories
- Reorganize tasks
- Update task descriptions

IMPORTANT: Return ONLY the updated markdown table content in the exact same format. Do not include any explanations or additional text.`;

    console.log('Calling Gemini API...');
    const result = await model.generateContent(systemPrompt);
    const response = await result.response;
    const text = response.text();
    console.log('Gemini response received, length:', text.length);

    return NextResponse.json({ updatedContent: text });
  } catch (error) {
    console.error('Error in Gemini API:', error);
    return NextResponse.json(
      { error: 'Failed to process request', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 