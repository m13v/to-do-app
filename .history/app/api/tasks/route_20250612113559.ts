import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Extract project reference from the URL
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const projectRef = supabaseUrl.match(/https:\/\/(.*?)\.supabase\.co/)?.[1] || '';

console.log('Initializing Supabase client with:');
console.log('Project ref:', projectRef);
console.log('URL:', supabaseUrl);
console.log('Key type:', supabaseAnonKey ? 'anon' : 'missing');
console.log('Key starts with:', supabaseAnonKey.substring(0, 10) + '...');
console.log('URL ends with:', supabaseUrl.split('.').pop());

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'x-supabase-project': projectRef
    }
  }
});

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('todoapp_tasks')
      .select('content')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // Ignore "row not found" error
      throw error;
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error('Error fetching tasks:', error);
    console.error('Error details:', {
      error,
      stack: error instanceof Error ? error.stack : 'No stack trace',
      message: error instanceof Error ? error.message : String(error)
    });
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

    const { error } = await supabase
      .from('todoapp_tasks')
      .upsert(
        { user_id: userId, content: content, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      );

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error saving tasks:', error);
    console.error('Error details:', {
      error,
      stack: error instanceof Error ? error.stack : 'No stack trace',
      message: error instanceof Error ? error.message : String(error)
    });
    return NextResponse.json({ error: 'Failed to save tasks' }, { status: 500 });
  }
} 