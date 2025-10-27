import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// Using service role key to bypass RLS since we authenticate with Clerk
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('Supabase Config:', {
  url: supabaseUrl,
  hasKey: !!supabaseServiceKey,
  keyPrefix: supabaseServiceKey.substring(0, 10)
});

export async function GET() {
  try {
    const { userId } = await auth();
    console.log('[GET /api/tasks] userId:', userId);
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
      console.error('[GET /api/tasks] Supabase error:', JSON.stringify(error));
      return NextResponse.json({ error: 'Failed to fetch tasks', details: error.message }, { status: 500 });
    }
    console.log('[GET /api/tasks] Success, data:', !!data);
    return NextResponse.json(data || {});
  } catch (error) {
    console.error('[GET /api/tasks] Catch error:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    console.log('[POST /api/tasks] userId:', userId);
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
      console.error('[POST /api/tasks] Supabase error:', JSON.stringify(error));
      return NextResponse.json({ error: 'Failed to save tasks', details: error.message }, { status: 500 });
    }
    console.log('[POST /api/tasks] Success');
    // Return the timestamp so frontend can track it
    return NextResponse.json({ success: true, updated_at: timestamp });
  } catch (error) {
    console.error('[POST /api/tasks] Catch error:', error);
    return NextResponse.json({ error: 'Failed to save tasks', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
} 