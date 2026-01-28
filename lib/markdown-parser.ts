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
    const rawParts = line.split('|');

    // Smart parsing: extract known columns from start and end,
    // treat everything in the middle as the Task content.
    // This handles | characters inside task text.
    // Table structure: | P | Category | Subcategory | Task | Status | Color | Created | Updated |
    // Split result:    ['', P, Category, Subcategory, ...Task parts..., Status, Color, Created, Updated, '']

    // We need at least 10 parts for a valid row (empty + 8 columns + empty)
    if (rawParts.length < 10) {
      // Fall back to simple parsing for short lines
      const parts = rawParts.map(p => p.trim());
      const getValue = (idx: number) => (idx !== -1 && parts[idx + 1] !== undefined) ? parts[idx + 1] : '';

      const priorityValue = getValue(priorityIndex);
      const parsedPriority = priorityValue !== '' ? parseInt(priorityValue, 10) : NaN;
      const priority = !isNaN(parsedPriority) ? parsedPriority : (index + 1);

      const createdValue = getValue(createdIndex);
      let created_at = new Date().toISOString();
      if (createdValue !== '') {
        const parsedDate = new Date(createdValue);
        if (!isNaN(parsedDate.getTime())) {
          created_at = parsedDate.toISOString();
        }
      }

      const updatedValue = getValue(updatedIndex);
      let updated_at = created_at;
      if (updatedValue !== '') {
        const parsedDate = new Date(updatedValue);
        if (!isNaN(parsedDate.getTime())) {
          updated_at = parsedDate.toISOString();
        }
      }

      const category = getValue(categoryIndex);
      const taskText = getValue(taskIndex).replace(/<br\s*\/?>/gi, '\n');
      const id = generateStableId(created_at, taskText, category);

      let color: TaskColor = 'white';
      if (colorIndex !== -1) {
        const colorValue = getValue(colorIndex).toLowerCase() as TaskColor;
        if (TASK_COLORS.includes(colorValue)) {
          color = colorValue;
        }
      } else if (todayIndex !== -1 && getValue(todayIndex).toLowerCase() === 'yes') {
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
    }

    // Smart parsing: extract from both ends
    // Start columns (indices 1-3): P, Category, Subcategory
    const priorityVal = rawParts[1].trim();
    const category = rawParts[2].trim();
    const subcategory = rawParts[3].trim();

    // End columns (indices -5 to -2): Status, Color, Created, Updated
    const statusVal = rawParts[rawParts.length - 5].trim();
    const colorVal = rawParts[rawParts.length - 4].trim();
    const createdVal = rawParts[rawParts.length - 3].trim();
    const updatedVal = rawParts[rawParts.length - 2].trim();

    // Task content: everything between index 4 and length-5 (exclusive), joined back with |
    const taskParts = rawParts.slice(4, rawParts.length - 5);
    const taskText = taskParts.join('|').trim().replace(/<br\s*\/?>/gi, '\n');

    // Parse priority
    const parsedPriority = priorityVal !== '' ? parseInt(priorityVal, 10) : NaN;
    const priority = !isNaN(parsedPriority) ? parsedPriority : (index + 1);

    // Parse created_at
    let created_at = new Date().toISOString();
    if (createdVal !== '') {
      const parsedDate = new Date(createdVal);
      if (!isNaN(parsedDate.getTime())) {
        created_at = parsedDate.toISOString();
      }
    }

    // Parse updated_at
    let updated_at = created_at;
    if (updatedVal !== '') {
      const parsedDate = new Date(updatedVal);
      if (!isNaN(parsedDate.getTime())) {
        updated_at = parsedDate.toISOString();
      }
    }

    // Parse color
    let color: TaskColor = 'white';
    const colorLower = colorVal.toLowerCase() as TaskColor;
    if (TASK_COLORS.includes(colorLower)) {
      color = colorLower;
    }

    // Generate stable ID
    const id = generateStableId(created_at, taskText, category);

    return {
      id,
      priority,
      category,
      subcategory,
      task: taskText,
      status: statusVal,
      color,
      created_at,
      updated_at,
    };
  }).filter((task): task is Task => task !== null);

  // Deduplicate by ID - keep first occurrence (lowest priority)
  const seenIds = new Set<string>();
  const dedupedTasks = parsedTasks.filter(task => {
    if (seenIds.has(task.id)) {
      console.log('[parseMarkdownTable] Duplicate ID filtered:', task.id, task.task.substring(0, 30));
      return false;
    }
    seenIds.add(task.id);
    return true;
  });

  if (dedupedTasks.length < parsedTasks.length) {
    console.log('[parseMarkdownTable] Removed', parsedTasks.length - dedupedTasks.length, 'duplicate tasks');
  }

  console.log('[parseMarkdownTable] Parsed tasks count:', dedupedTasks.length);
  return dedupedTasks;
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