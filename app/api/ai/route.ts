import { NextRequest, NextResponse } from 'next/server';

// This is a placeholder for a real AI service
async function getAICompletion(systemPrompt: string, userPrompt: string) {
  // In a real application, you would make a call to an AI service like OpenAI,
  // passing both the system and user prompts.
  
  // For now, we'll simulate a response that just returns the user's prompt
  // as if it were the AI's answer.
  console.log('AI System Prompt:', systemPrompt);
  console.log('AI User Prompt:', userPrompt);
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // A more realistic simulation might try to apply the prompt's instructions
  // to the provided content, but for now, we'll keep it simple.
  
  return userPrompt;
}

export async function POST(request: NextRequest) {
  try {
    const { systemPrompt, userPrompt } = await request.json();
    
    if (!systemPrompt || !userPrompt) {
      return NextResponse.json({ error: 'Both systemPrompt and userPrompt are required.' }, { status: 400 });
    }
    
    const aiResponse = await getAICompletion(systemPrompt, userPrompt);
    
    return NextResponse.json({ content: aiResponse });
  } catch (error) {
    console.error('Error in AI service:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to get response from AI', details: errorMessage }, { status: 500 });
  }
} 