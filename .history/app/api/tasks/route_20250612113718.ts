import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

console.log('Supabase Config:', {
  url: supabaseUrl,
  hasKey: !!supabaseAnonKey,
  keyPrefix: supabaseAnonKey.substring(0, 10)
});

// Add custom headers to all requests
const customHeaders = {
  'apikey': supabaseAnonKey,
  'Authorization': `Bearer ${supabaseAnonKey}`
};

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const response = await fetch(`${supabaseUrl}/rest/v1/todoapp_tasks?user_id=eq.${userId}&select=content`, {
      headers: customHeaders
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Supabase REST error:', error);
      throw new Error(JSON.stringify(error));
    }

    const data = await response.json();
    return NextResponse.json(data[0] || {});

  } catch (error) {
    console.error('Error fetching tasks:', error);
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

    const response = await fetch(`${supabaseUrl}/rest/v1/todoapp_tasks`, {
      method: 'POST',
      headers: {
        ...customHeaders,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({
        user_id: userId,
        content: content,
        updated_at: new Date().toISOString()
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Supabase REST error:', error);
      throw new Error(JSON.stringify(error));
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error saving tasks:', error);
    return NextResponse.json({ error: 'Failed to save tasks' }, { status: 500 });
  }
} 