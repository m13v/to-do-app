export type TaskColor = 'white' | 'grey' | 'red' | 'blue';

export const TASK_COLORS: TaskColor[] = ['white', 'grey', 'red', 'blue'];

export interface Task {
  id: string;
  priority: number;
  category: string;
  subcategory: string;
  task: string;
  status: string;
  color: TaskColor;
  created_at: string; // ISO 8601 timestamp
  updated_at: string; // ISO 8601 timestamp - when task was last modified
}

// Generate a stable ID based on creation time and initial content
// This ensures the same task has the same ID across devices
function generateStableId(created_at: string, task: string, category: string): string {
  // Use created_at + first 50 chars of task + category as stable identifier
  const content = `${created_at}|${task.substring(0, 50)}|${category}`;
  
  // Simple hash function (djb2 algorithm)
  let hash = 5381;
  for (let i = 0; i < content.length; i++) {
    hash = ((hash << 5) + hash) + content.charCodeAt(i);
  }
  
  // Convert to positive hex string
  const hashStr = (hash >>> 0).toString(16).padStart(8, '0');
  
  // Combine with timestamp for uniqueness
  const timestamp = new Date(created_at).getTime().toString(16);
  return `task-${timestamp}-${hashStr}`;
}

export function parseMarkdownTable(markdown: string): Task[] {
  const lines = markdown.trim().split('\n');
  console.log('[parseMarkdownTable] Total lines:', lines.length);
  if (lines.length < 2) {
    console.log('[parseMarkdownTable] Not enough lines, returning empty');
    return [];
  }

  const headerLine = lines.find(line => line.includes('| Category |'));
  console.log('[parseMarkdownTable] Header line found:', !!headerLine);
  if (!headerLine) {
    console.log('[parseMarkdownTable] No header line found, returning empty');
    return [];
  }
  
  const headers = headerLine.split('|').map(h => h.trim().toLowerCase()).filter(h => h);
  const priorityIndex = headers.indexOf('p');
  const categoryIndex = headers.indexOf('category');
  const subcategoryIndex = headers.indexOf('subcategory');
  const taskIndex = headers.indexOf('task');
  const statusIndex = headers.indexOf('status');
  const colorIndex = headers.indexOf('color');
  // Legacy support: check for 'today' column in old data
  const todayIndex = headers.indexOf('today');
  const createdIndex = headers.indexOf('created');
  const updatedIndex = headers.indexOf('updated');

  const taskLines = lines.slice(lines.indexOf(headerLine) + 2);
  console.log('[parseMarkdownTable] Task lines to parse:', taskLines.length);

  const parsedTasks = taskLines.map((line, index) => {
    if (!line.startsWith('|')) return null;
    const parts = line.split('|').map(p => p.trim());
    
    // Helper to get value from parts array by header index
    const getValue = (index: number) => (index !== -1 && parts[index + 1] !== undefined) ? parts[index + 1] : '';

    // Parse priority: handle 0 explicitly since it's falsy but valid
    const priorityValue = getValue(priorityIndex);
    const parsedPriority = priorityValue !== '' ? parseInt(priorityValue, 10) : NaN;
    const priority = !isNaN(parsedPriority) ? parsedPriority : (index + 1);
    
    // Parse created_at: use existing value if present and valid, otherwise use current time
    const createdValue = getValue(createdIndex);
    let created_at = new Date().toISOString(); // default to current time
    if (createdValue !== '') {
      const parsedDate = new Date(createdValue);
      // Check if date is valid (not NaN)
      if (!isNaN(parsedDate.getTime())) {
        created_at = parsedDate.toISOString();
      }
    }
    
    // Parse updated_at: use existing value if present and valid, otherwise use created_at
    const updatedValue = getValue(updatedIndex);
    let updated_at = created_at; // default to created_at
    if (updatedValue !== '') {
      const parsedDate = new Date(updatedValue);
      if (!isNaN(parsedDate.getTime())) {
        updated_at = parsedDate.toISOString();
      }
    }
    
    const category = getValue(categoryIndex);
    const taskText = getValue(taskIndex).replace(/<br\s*\/?>/gi, '\n');
    
    // Generate stable ID based on created_at and content
    const id = generateStableId(created_at, taskText, category);
    
    // Parse color: check new 'color' column first, then migrate from legacy 'today' column
    let color: TaskColor = 'white';
    if (colorIndex !== -1) {
      const colorValue = getValue(colorIndex).toLowerCase() as TaskColor;
      if (TASK_COLORS.includes(colorValue)) {
        color = colorValue;
      }
    } else if (todayIndex !== -1 && getValue(todayIndex).toLowerCase() === 'yes') {
      // Migrate legacy 'today' tasks to red color
      color = 'red';
    }

    return {
      id,
      priority,
      category,
      subcategory: getValue(subcategoryIndex),
      task: taskText,
      status: getValue(statusIndex),
      color,
      created_at,
      updated_at,
    };
  }).filter((task): task is Task => task !== null);
  
  console.log('[parseMarkdownTable] Parsed tasks count:', parsedTasks.length);
  return parsedTasks;
}

export function tasksToMarkdown(tasks: Task[]): string {
  let markdown = '| P | Category | Subcategory | Task | Status | Color | Created | Updated |\n';
  markdown += '|---|----------|-------------|------|--------|-------|---------|----------|\n';

  // Sort tasks by priority before converting to markdown
  const sortedTasks = [...tasks].sort((a, b) => a.priority - b.priority);

  for (const task of sortedTasks) {
    // Convert newlines to <br> tags for multi-line task support in markdown tables
    const taskWithBreaks = task.task.replace(/\n/g, '<br>');
    // Format created_at to a readable date (YYYY-MM-DD), validate date first
    let createdDate = '';
    if (task.created_at) {
      const parsedDate = new Date(task.created_at);
      if (!isNaN(parsedDate.getTime())) {
        createdDate = parsedDate.toISOString().split('T')[0];
      }
    }
    // Format updated_at to a readable date (YYYY-MM-DD), validate date first
    let updatedDate = '';
    if (task.updated_at) {
      const parsedDate = new Date(task.updated_at);
      if (!isNaN(parsedDate.getTime())) {
        updatedDate = parsedDate.toISOString().split('T')[0];
      }
    }
    markdown += `| ${task.priority} | ${task.category} | ${task.subcategory} | ${taskWithBreaks} | ${task.status} | ${task.color} | ${createdDate} | ${updatedDate} |\n`;
  }

  return markdown;
}

export function insertTaskAt(tasks: Task[], index: number, newTask: Task): Task[] {
  const result = [...tasks];
  result.splice(index, 0, newTask); // Changed to insert at the correct index
  // Re-assign priorities
  return result.map((task, idx) => ({ ...task, priority: idx + 1 }));
}

export function updateTask(tasks: Task[], index: number, updatedTask: Task): Task[] {
  const result = [...tasks];
  result[index] = updatedTask;
  return result;
}

export function deleteTask(tasks: Task[], id: string): Task[] {
  const result = tasks.filter(task => task.id !== id);
  // Re-assign priorities
  return result.map((task, idx) => ({ ...task, priority: idx + 1 }));
} 