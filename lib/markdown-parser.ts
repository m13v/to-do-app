export interface Task {
  id: string;
  priority: number;
  category: string;
  subcategory: string;
  task: string;
  status: string;
  today: boolean;
  created_at: string; // ISO 8601 timestamp
}

export function parseMarkdownTable(markdown: string): Task[] {
  const lines = markdown.trim().split('\n');
  if (lines.length < 2) return [];

  const headerLine = lines.find(line => line.includes('| Category |'));
  if (!headerLine) return [];
  
  const headers = headerLine.split('|').map(h => h.trim().toLowerCase()).filter(h => h);
  const priorityIndex = headers.indexOf('p');
  const categoryIndex = headers.indexOf('category');
  const subcategoryIndex = headers.indexOf('subcategory');
  const taskIndex = headers.indexOf('task');
  const statusIndex = headers.indexOf('status');
  const todayIndex = headers.indexOf('today');
  const createdIndex = headers.indexOf('created');

  const taskLines = lines.slice(lines.indexOf(headerLine) + 2);

  return taskLines.map((line, index) => {
    if (!line.startsWith('|')) return null;
    const parts = line.split('|').map(p => p.trim());
    
    // Helper to get value from parts array by header index
    const getValue = (index: number) => (index !== -1 && parts[index + 1] !== undefined) ? parts[index + 1] : '';

    // Parse priority: handle 0 explicitly since it's falsy but valid
    const priorityValue = getValue(priorityIndex);
    const parsedPriority = priorityValue !== '' ? parseInt(priorityValue, 10) : NaN;
    const priority = !isNaN(parsedPriority) ? parsedPriority : (index + 1);
    
    // Parse created_at: use existing value if present, otherwise use current time for backward compatibility
    const createdValue = getValue(createdIndex);
    const created_at = createdValue !== '' ? createdValue : new Date().toISOString();
    
    return {
      id: `${Date.now()}-${Math.random()}-${index}`,
      priority,
      category: getValue(categoryIndex),
      subcategory: getValue(subcategoryIndex),
      // Convert <br> tags back to newlines for multi-line task support
      task: getValue(taskIndex).replace(/<br\s*\/?>/gi, '\n'),
      status: getValue(statusIndex),
      today: todayIndex !== -1 ? getValue(todayIndex).toLowerCase() === 'yes' : false,
      created_at,
    };
  }).filter((task): task is Task => task !== null);
}

export function tasksToMarkdown(tasks: Task[]): string {
  let markdown = '| P | Category | Subcategory | Task | Status | Today | Created |\n';
  markdown += '|---|----------|-------------|------|--------|-------|----------|\n';
  
  // Sort tasks by priority before converting to markdown
  const sortedTasks = [...tasks].sort((a, b) => a.priority - b.priority);

  for (const task of sortedTasks) {
    // Convert newlines to <br> tags for multi-line task support in markdown tables
    const taskWithBreaks = task.task.replace(/\n/g, '<br>');
    // Format created_at to a readable date (YYYY-MM-DD)
    const createdDate = task.created_at ? new Date(task.created_at).toISOString().split('T')[0] : '';
    markdown += `| ${task.priority} | ${task.category} | ${task.subcategory} | ${taskWithBreaks} | ${task.status} | ${task.today ? 'yes' : ''} | ${createdDate} |\n`;
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