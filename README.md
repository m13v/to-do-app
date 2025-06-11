# AI Task Manager

A Next.js application that displays a task list from a markdown file with AI-powered editing capabilities.

## Features

- **Editable Table**: Click on any cell to edit tasks or categories directly
- **AI Assistant**: Use natural language to modify your tasks via Gemini AI
- **Real-time Updates**: Changes are saved to the markdown file automatically
- **Clean UI**: Hover effects show action buttons only when needed
- **Keyboard Shortcuts**: 
  - Press `Enter` to save edits
  - Press `Escape` to cancel editing
  - Press `Cmd+Enter` in the AI prompt to submit

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure Gemini API**:
   - Edit `.env.local` and add your Gemini API key:
   ```
   GEMINI_API_KEY=your_actual_gemini_api_key_here
   ```

3. **Run the development server**:
   ```bash
   npm run dev
   ```

4. **Open the app**:
   - Navigate to [http://localhost:3000](http://localhost:3000)

## Usage

### Editing Tasks Manually
- Click on any category or task cell to edit it
- Type your changes
- Press `Enter` to save or `Escape` to cancel

### Adding/Removing Tasks
- Hover over any row to see action buttons
- Click the `+` button to add a new task below
- Click the trash icon to delete a task

### Using AI Assistant
- Type a natural language command in the prompt box at the top
- Examples:
  - "Add a new task for code review in the BUSINESS category"
  - "Change all DASHBOARD tasks to UI category"
  - "Remove all tasks related to legal"
  - "Organize tasks by alphabetical order"
- Click "Apply" or press `Cmd+Enter` to execute

## File Structure

- `/app/page.tsx` - Main UI component
- `/app/api/gemini/route.ts` - Gemini AI API endpoint
- `/app/api/file/route.ts` - File read/write API endpoint
- `/lib/markdown-parser.ts` - Markdown parsing utilities
- `/public/task_categories_table.md` - The task data file

## Notes

- The app reads and writes directly to the markdown file in the public directory
- All changes are logged to the console for debugging
- The AI uses the `gemini-2.5-pro-preview-06-05` model as specified
