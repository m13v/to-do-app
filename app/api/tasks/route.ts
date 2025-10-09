import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('Supabase Config:', {
  url: supabaseUrl,
  hasKey: !!supabaseAnonKey,
  keyPrefix: supabaseAnonKey.substring(0, 10)
});

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { data, error } = await supabase
      .from('todoapp_tasks')
      .select('content, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();
    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Supabase error fetching tasks:', error);
      }
      return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
    }
    return NextResponse.json(data || {});
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error fetching tasks:', error);
    }
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { content } = await request.json();
    const timestamp = new Date().toISOString();
    const { error } = await supabase
      .from('todoapp_tasks')
      .upsert([
        {
          user_id: userId,
          content,
          updated_at: timestamp,
        },
      ], { onConflict: 'user_id' });
    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Supabase error saving tasks:', error);
      }
      return NextResponse.json({ error: 'Failed to save tasks' }, { status: 500 });
    }
    // Return the timestamp so frontend can track it
    return NextResponse.json({ success: true, updated_at: timestamp });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error saving tasks:', error);
    }
    return NextResponse.json({ error: 'Failed to save tasks' }, { status: 500 });
  }
} 