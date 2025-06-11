export interface Task {
  id: string;
  category: string;
  task: string;
  status: string;
  done: string;
  effort: string;
}

export function parseMarkdownTable(markdown: string): Task[] {
  console.log('Parsing markdown, length:', markdown.length);
  const lines = markdown.split('\n');
  const tasks: Task[] = [];
  
  // Skip header lines
  let inTable = false;
  for (const line of lines) {
    if (line.includes('| Category | Task | Status | Done |') || 
        line.includes('| Category | Task | Status | Done | Effort |')) {
      inTable = true;
      continue;
    }
    if (line.includes('|----------|------|--------|------|') ||
        line.includes('|----------|------|--------|------|--------|')) {
      continue;
    }
    if (inTable && line.startsWith('|') && line.endsWith('|')) {
      const parts = line.split('|').map(part => part.trim());
      if (parts.length === 6) {
        tasks.push({
          id: `${Date.now()}-${Math.random()}`,
          category: parts[1],
          task: parts[2],
          status: parts[3],
          done: parts[4],
          effort: '',
        });
      } else if (parts.length === 7) {
        tasks.push({
          id: `${Date.now()}-${Math.random()}`,
          category: parts[1],
          task: parts[2],
          status: parts[3],
          done: parts[4],
          effort: parts[5],
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
  markdown += '| Category | Task | Status | Done | Effort |\n';
  markdown += '|----------|------|--------|------|--------|\n';
  
  for (const task of tasks) {
    markdown += `| ${task.category} | ${task.task} | ${task.status} | ${task.done} | ${task.effort} |\n`;
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

export function migrateTasksWithEffort(tasks: Task[]): Task[] {
  console.log('Migrating tasks with effort values');
  
  // Check if any tasks need effort values assigned
  const tasksNeedingEffort = tasks.filter(task => !task.effort || task.effort === '');
  
  if (tasksNeedingEffort.length === 0) {
    console.log('All tasks already have effort values');
    return tasks;
  }
  
  // Calculate how many tasks should get each effort level for even distribution
  const totalTasks = tasksNeedingEffort.length;
  const effortLevels = 10;
  const tasksPerLevel = Math.floor(totalTasks / effortLevels);
  const remainder = totalTasks % effortLevels;
  
  // Create an array of effort values with even distribution
  const effortValues: number[] = [];
  for (let level = 1; level <= effortLevels; level++) {
    const count = tasksPerLevel + (level <= remainder ? 1 : 0);
    for (let i = 0; i < count; i++) {
      effortValues.push(level);
    }
  }
  
  // Shuffle the effort values to distribute them randomly
  for (let i = effortValues.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [effortValues[i], effortValues[j]] = [effortValues[j], effortValues[i]];
  }
  
  // Assign effort values to tasks
  let effortIndex = 0;
  const migratedTasks = tasks.map(task => {
    if (!task.effort || task.effort === '') {
      return {
        ...task,
        effort: effortValues[effortIndex++].toString()
      };
    }
    return task;
  });
  
  console.log(`Migrated ${tasksNeedingEffort.length} tasks with effort values`);
  return migratedTasks;
} 