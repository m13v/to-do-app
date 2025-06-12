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

    console.log('Making request to:', `${supabaseUrl}/rest/v1/todoapp_tasks?user_id=eq.${userId}&select=content`);
    console.log('With headers:', { ...customHeaders, 'user-id': userId });

    const response = await fetch(`${supabaseUrl}/rest/v1/todoapp_tasks?user_id=eq.${userId}&select=content`, {
      headers: customHeaders
    });

    if (!response.ok) {
      const responseText = await response.text();
      console.error('Supabase REST error response:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: responseText
      });
      
      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch (_) {
        errorData = { message: responseText };
      }
      
      throw new Error(JSON.stringify(errorData));
    }

    const responseText = await response.text();
    console.log('Raw response:', responseText);
    
    const data = responseText ? JSON.parse(responseText) : [];
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

    console.log('Making POST request to:', `${supabaseUrl}/rest/v1/todoapp_tasks`);
    console.log('With payload:', {
      user_id: userId,
      content: content ? 'present' : 'missing',
      updated_at: new Date().toISOString()
    });

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
      const responseText = await response.text();
      console.error('Supabase REST error response:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: responseText
      });
      
      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch (_) {
        errorData = { message: responseText };
      }
      
      throw new Error(JSON.stringify(errorData));
    }

    const responseText = await response.text();
    console.log('Raw response:', responseText);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error saving tasks:', error);
    return NextResponse.json({ error: 'Failed to save tasks' }, { status: 500 });
  }
} 