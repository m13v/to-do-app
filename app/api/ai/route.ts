import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, Schema, SchemaType } from '@google/generative-ai';

// --- Reusable Gemini Setup ---

const MODEL_NAME = "gemini-1.5-flash"; // Sticking with the flash model as requested

function getGenAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set.');
  }
  return new GoogleGenerativeAI(apiKey);
}

const safetySettings: Array<{category: HarmCategory, threshold: HarmBlockThreshold}> = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

// --- API Route ---

export async function POST(request: NextRequest) {
  try {
    const { systemPrompt, userPrompt } = await request.json();
    
    if (!systemPrompt || !userPrompt) {
      return NextResponse.json({ error: 'Both systemPrompt and userPrompt are required.' }, { status: 400 });
    }
    
    const genAI = getGenAI();
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const markdownTableSchema: Schema = {
      type: SchemaType.OBJECT,
      properties: {
        markdown_table: {
          type: SchemaType.STRING,
          description: "The complete, updated markdown table. It must start with `| Category |` and include all rows."
        }
      },
      required: ['markdown_table']
    };

    const generationConfig = {
      temperature: 0.2,
      responseMimeType: "application/json",
      responseSchema: markdownTableSchema
    };
    
    const chat = model.startChat({
      history: [
        { role: "user", parts: [{ text: systemPrompt }] },
        { role: "model", parts: [{ text: "Understood. I will follow all rules and return only a JSON object with the 'markdown_table' key." }] },
      ],
      generationConfig,
      safetySettings
    });

    const result = await chat.sendMessage(userPrompt);
    const response = result.response;

    if (response?.candidates?.[0]?.content?.parts?.[0]?.text) {
      const jsonString = response.candidates[0].content.parts[0].text;
      const parsedJson = JSON.parse(jsonString);
      // We return the content of the markdown_table property, not the whole JSON object
      return NextResponse.json({ content: parsedJson.markdown_table });
    }
    
    throw new Error('Failed to get a valid response structure from the AI.');

  } catch (error) {
    console.error('Error in AI service:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    
    if (errorMessage.includes('400 Bad Request') || errorMessage.includes('request entity too large')) {
      return NextResponse.json({ 
        error: 'The task list is too large for the AI to process. Please filter your tasks or try a different prompt.',
        details: errorMessage 
      }, { status: 413 });
    }
    
    return NextResponse.json({ error: 'Failed to get response from AI', details: errorMessage }, { status: 500 });
  }
}
