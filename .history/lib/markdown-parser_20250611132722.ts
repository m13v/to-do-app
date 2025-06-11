export interface Task {
  category: string;
  task: string;
  status: string;
  done: string;
}

export function parseMarkdownTable(markdown: string): Task[] {
  console.log('Parsing markdown, length:', markdown.length);
  const lines = markdown.split('\n');
  const tasks: Task[] = [];
  
  // Skip header lines
  let inTable = false;
  for (const line of lines) {
    if (line.includes('| Category | Task | Status | Done |')) {
      inTable = true;
      continue;
    }
    if (line.includes('|----------|------|--------|------|')) {
      continue;
    }
    if (inTable && line.startsWith('|') && line.endsWith('|')) {
      const parts = line.split('|').map(part => part.trim());
      // Expect 6 parts due to leading/trailing empty strings from split
      if (parts.length === 6) {
        tasks.push({
          category: parts[1],
          task: parts[2],
          status: parts[3],
          done: parts[4],
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
    markdown += `| ${task.category} | ${task.task} | ${task.status} | ${task.done} |\n`;
  }
  
  return markdown;
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