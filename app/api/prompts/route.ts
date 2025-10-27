import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// Using service role key to bypass RLS since we authenticate with Clerk
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('todoapp_prompts')
      .select('id, title, prompt')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Supabase error fetching prompts:', error);
      }
      const errorMessage = process.env.NODE_ENV === 'development' ? error.message : 'Failed to fetch prompts';
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }

    const filteredData = data?.filter(prompt => 
      prompt.title !== 'Update Effort column' && 
      prompt.title !== 'Update Criticality column'
    ) || [];

    return NextResponse.json(filteredData);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error fetching prompts:', error);
    }
    const errorMessage = error instanceof Error && process.env.NODE_ENV === 'development' ? error.message : 'Failed to fetch prompts';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const prompts = await request.json();

    const { error: deleteError } = await supabase
      .from('todoapp_prompts')
      .delete()
      .eq('user_id', userId);

    if (deleteError) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Supabase error deleting old prompts:', deleteError);
      }
      const errorMessage = process.env.NODE_ENV === 'development' ? deleteError.message : 'Failed to save prompts';
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
    
    const promptsToInsert = prompts.map((p: { title: string; prompt: string }) => ({
      user_id: userId,
      title: p.title,
      prompt: p.prompt,
    }));

    if (promptsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('todoapp_prompts')
        .insert(promptsToInsert);

      if (insertError) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Supabase error inserting new prompts:', insertError);
        }
        const errorMessage = process.env.NODE_ENV === 'development' ? insertError.message : 'Failed to save prompts';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error saving prompts:', error);
    }
    const errorMessage = error instanceof Error && process.env.NODE_ENV === 'development' ? error.message : 'Failed to save prompts';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
} 