export interface Task {
  id: string;
  priority: number;
  category: string;
  task: string;
  status: string;
  effort: string;
  criticality: string;
  today: boolean;
}

export function parseMarkdownTable(markdown: string): Task[] {
  const lines = markdown.trim().split('\n');
  if (lines.length < 2) return [];

  const headerLine = lines.find(line => line.includes('| Category |'));
  if (!headerLine) return [];
  
  const headers = headerLine.split('|').map(h => h.trim().toLowerCase()).filter(h => h);
  const priorityIndex = headers.indexOf('p');
  const categoryIndex = headers.indexOf('category');
  const taskIndex = headers.indexOf('task');
  const statusIndex = headers.indexOf('status');
  const effortIndex = headers.indexOf('effort');
  const criticalityIndex = headers.indexOf('criticality');
  const todayIndex = headers.indexOf('today');

  const taskLines = lines.slice(lines.indexOf(headerLine) + 2);

  return taskLines.map((line, index) => {
    if (!line.startsWith('|')) return null;
    const parts = line.split('|').map(p => p.trim());
    
    // Helper to get value from parts array by header index
    const getValue = (index: number) => (index !== -1 && parts[index + 1] !== undefined) ? parts[index + 1] : '';

    return {
      id: `${Date.now()}-${Math.random()}-${index}`,
      priority: priorityIndex !== -1 ? parseInt(getValue(priorityIndex), 10) || (index + 1) : (index + 1),
      category: getValue(categoryIndex),
      task: getValue(taskIndex),
      status: getValue(statusIndex),
      effort: getValue(effortIndex),
      criticality: getValue(criticalityIndex),
      today: todayIndex !== -1 ? getValue(todayIndex).toLowerCase() === 'yes' : false,
    };
  }).filter((task): task is Task => task !== null);
}

export function tasksToMarkdown(tasks: Task[]): string {
  let markdown = '| P | Category | Task | Status | Effort | Criticality | Today |\n';
  markdown += '|---|----------|------|--------|--------|-------------|-------|\n';
  
  // Sort tasks by priority before converting to markdown
  const sortedTasks = [...tasks].sort((a, b) => a.priority - b.priority);

  for (const task of sortedTasks) {
    markdown += `| ${task.priority} | ${task.category} | ${task.task} | ${task.status} | ${task.effort} | ${task.criticality} | ${task.today ? 'yes' : ''} |\n`;
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