import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'You must be signed in to perform this action.' }, { status: 401 });
    }

    // Read the markdown file from the project root
    const filePath = path.join(process.cwd(), 'task_categories_table.md');
    const markdownContent = await fs.readFile(filePath, 'utf-8');

    // Save this content to the user's record in Supabase
    const { error } = await supabase
      .from('todoapp_tasks')
      .upsert({ user_id: userId, content: markdownContent, updated_at: new Date().toISOString() });
    
    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, message: 'Tasks have been successfully loaded from the file into your account.' });

  } catch (error: any) {
    console.error('Error loading tasks from file:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ success: false, error: 'Failed to load tasks from file.', details: errorMessage }, { status: 500 });
  }
} 