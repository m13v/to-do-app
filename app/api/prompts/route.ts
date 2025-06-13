import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
      return NextResponse.json({ error: 'Failed to fetch prompts' }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error fetching prompts:', error);
    }
    return NextResponse.json({ error: 'Failed to fetch prompts' }, { status: 500 });
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
      return NextResponse.json({ error: 'Failed to save prompts' }, { status: 500 });
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
        return NextResponse.json({ error: 'Failed to save prompts' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error saving prompts:', error);
    }
    return NextResponse.json({ error: 'Failed to save prompts' }, { status: 500 });
  }
} 