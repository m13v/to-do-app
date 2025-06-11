export interface Task {
  category: string;
  task: string;
  status: 'waiting_for_other' | 'come_back_tomorrow' | 'to_do_today' | 'to_do';
  done: boolean;
}

export function parseMarkdownTable(markdown: string): Task[] {
  console.log('Parsing markdown, length:', markdown.length);
  const lines = markdown.split('\n');
  const tasks: Task[] = [];
  
  // Skip header lines
  let inTable = false;
  for (const line of lines) {
    if (line.includes('| Category | Task |')) {
      inTable = true;
      continue;
    }
    if (line.includes('|----------|------|')) {
      continue;
    }
    if (inTable && line.startsWith('|') && line.endsWith('|')) {
      const parts = line.split('|').map(part => part.trim()).filter(Boolean);
      if (parts.length >= 2) {
        // Handle both old format (2 columns) and new format (4 columns)
        tasks.push({
          category: parts[0],
          task: parts[1],
          status: (parts[2] as Task['status']) || 'to_do',
          done: parts[3] === 'true' || parts[3] === '✓'
        });
      }
    }
  }
  
  console.log('Parsed tasks count:', tasks.length);
  return tasks;
}

export function tasksToMarkdown(tasks: Task[]): string {
  console.log('Converting tasks to markdown, count:', tasks.length);
  let markdown = '# Task Categories Table\n\n';
  markdown += '| Category | Task | Status | Done |\n';
  markdown += '|----------|------|--------|------|\n';
  
  for (const task of tasks) {
    const doneMarker = task.done ? '✓' : '';
    markdown += `| ${task.category} | ${task.task} | ${task.status} | ${doneMarker} |\n`;
  }
  
  return markdown;
}

export function insertTaskAt(tasks: Task[], index: number, newTask: Task): Task[] {
  console.log('Inserting task at index:', index);
  const result = [...tasks];
  result.splice(index + 1, 0, newTask);
  return result;
}

export function updateTask(tasks: Task[], index: number, updatedTask: Task): Task[] {
  console.log('Updating task at index:', index);
  const result = [...tasks];
  result[index] = updatedTask;
  return result;
}

export function deleteTask(tasks: Task[], index: number): Task[] {
  console.log('Deleting task at index:', index);
  const result = [...tasks];
  result.splice(index, 1);
  return result;
} 