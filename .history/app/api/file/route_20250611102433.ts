import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const FILE_PATH = path.join(process.cwd(), 'public', 'task_categories_table.md');

export async function GET() {
  try {
    console.log('Reading file from:', FILE_PATH);
    const content = await fs.readFile(FILE_PATH, 'utf-8');
    console.log('File read successfully, length:', content.length);
    return NextResponse.json({ content });
  } catch (error) {
    console.error('Error reading file:', error);
    return NextResponse.json(
      { error: 'Failed to read file', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { content } = await request.json();
    console.log('Writing file, content length:', content.length);
    await fs.writeFile(FILE_PATH, content, 'utf-8');
    console.log('File written successfully');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error writing file:', error);
    return NextResponse.json(
      { error: 'Failed to write file', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 