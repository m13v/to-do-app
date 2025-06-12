export interface Task {
  id: string;
  category: string;
  task: string;
  status: string;
  effort: string;
  criticality: string;
  today?: boolean;
}

export function parseMarkdownTable(markdown: string): Task[] {
  if (process.env.NODE_ENV === 'development') {
    console.log('Parsing markdown, length:', markdown.length);
  }
  const lines = markdown.split('\n');
  const tasks: Task[] = [];
  
  let hasDoneColumn = false;
  let hasTodayColumn = false;
  let inTable = false;

  for (const line of lines) {
    if (line.includes('| Category | Task | Status |')) {
      if (line.includes('| Done |')) {
        hasDoneColumn = true;
      }
      if (line.includes('| Today |')) {
        hasTodayColumn = true;
      }
      inTable = true;
      continue;
    }
    if (line.includes('|----------|------|--------|')) {
      continue;
    }
    if (inTable && line.startsWith('|') && line.endsWith('|')) {
      const parts = line.split('|').map(part => part.trim());
      
      if (hasDoneColumn) {
        if (parts.length >= 8) { // Cat|Task|Status|Done|Effort|Crit
          tasks.push({
            id: `${Date.now()}-${Math.random()}`,
            category: parts[1],
            task: parts[2],
            status: parts[3],
            effort: parts[5],
            criticality: parts[6],
            today: parts[7].toLowerCase() === 'yes',
          });
        } else if (parts.length >= 7) { // Cat|Task|Status|Done|Effort
          tasks.push({
            id: `${Date.now()}-${Math.random()}`,
            category: parts[1],
            task: parts[2],
            status: parts[3],
            effort: parts[5],
            criticality: '',
            today: false,
          });
        } else if (parts.length >= 6) { // Cat|Task|Status|Done
          tasks.push({
            id: `${Date.now()}-${Math.random()}`,
            category: parts[1],
            task: parts[2],
            status: parts[3],
            effort: '',
            criticality: '',
            today: false,
          });
        }
      } else {
        if (hasTodayColumn) {
          // Cat|Task|Status|Effort|Crit|Today
          if (parts.length >= 8) {
            tasks.push({
              id: `${Date.now()}-${Math.random()}`,
              category: parts[1],
              task: parts[2],
              status: parts[3],
              effort: parts[4],
              criticality: parts[5],
              today: parts[6].toLowerCase() === 'yes',
            });
          }
        } else {
          // New format without Done column
          if (parts.length >= 7) { // Cat|Task|Status|Effort|Crit
             tasks.push({
              id: `${Date.now()}-${Math.random()}`,
              category: parts[1],
              task: parts[2],
              status: parts[3],
              effort: parts[4],
              criticality: parts[5],
              today: false,
            });
          }
        }
      }
    }
  }
  
  if (process.env.NODE_ENV === 'development') {
    console.log('Parsed tasks count:', tasks.length);
  }
  return tasks;
}

export function tasksToMarkdown(tasks: Task[]): string {
  if (process.env.NODE_ENV === 'development') {
    console.log('Converting tasks to markdown, count:', tasks.length);
  }
  let markdown = '# Task Categories Table\n\n';
  markdown += '| Category | Task | Status | Effort | Criticality | Today |\n';
  markdown += '|----------|------|--------|--------|-------------|-------|\n';
  
  for (const task of tasks) {
    markdown += `| ${task.category} | ${task.task} | ${task.status} | ${task.effort} | ${task.criticality} | ${task.today ? 'yes' : ''} |\n`;
  }
  
  return markdown;
}

export function insertTaskAt(tasks: Task[], index: number, newTask: Task): Task[] {
  if (process.env.NODE_ENV === 'development') {
    console.log('Inserting task at index:', index);
  }
  const result = [...tasks];
  result.splice(index + 1, 0, newTask);
  return result;
}

export function updateTask(tasks: Task[], index: number, updatedTask: Task): Task[] {
  if (process.env.NODE_ENV === 'development') {
    console.log('Updating task at index:', index);
  }
  const result = [...tasks];
  result[index] = updatedTask;
  return result;
}

export function deleteTask(tasks: Task[], index: number): Task[] {
  if (process.env.NODE_ENV === 'development') {
    console.log('Deleting task at index:', index);
  }
  const result = [...tasks];
  result.splice(index, 1);
  return result;
}

export function migrateTasksWithEffort(tasks: Task[]): Task[] {
  if (process.env.NODE_ENV === 'development') {
    console.log('Migrating tasks with effort values');
  }
  
  // Check if any tasks need effort values assigned
  const tasksNeedingEffort = tasks.filter(task => !task.effort || task.effort === '');
  
  if (tasksNeedingEffort.length === 0) {
    if (process.env.NODE_ENV === 'development') {
      console.log('All tasks already have effort values');
    }
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
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`Migrated ${tasksNeedingEffort.length} tasks with effort values`);
  }
  return migratedTasks;
}

export function migrateTasksWithCriticality(tasks: Task[]): Task[] {
  if (process.env.NODE_ENV === 'development') {
    console.log('Migrating tasks with criticality values');
  }
  
  // Check if any tasks need criticality values assigned
  const tasksNeedingCriticality = tasks.filter(task => !task.criticality || task.criticality === '');
  
  if (tasksNeedingCriticality.length === 0) {
    if (process.env.NODE_ENV === 'development') {
      console.log('All tasks already have criticality values');
    }
    return tasks;
  }
  
  // Calculate how many tasks should get each criticality level for even distribution
  const totalTasks = tasksNeedingCriticality.length;
  const criticalityLevels = 3;
  const tasksPerLevel = Math.floor(totalTasks / criticalityLevels);
  const remainder = totalTasks % criticalityLevels;
  
  // Create an array of criticality values with even distribution
  const criticalityValues: number[] = [];
  for (let level = 1; level <= criticalityLevels; level++) {
    const count = tasksPerLevel + (level <= remainder ? 1 : 0);
    for (let i = 0; i < count; i++) {
      criticalityValues.push(level);
    }
  }
  
  // Shuffle the criticality values to distribute them randomly
  for (let i = criticalityValues.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [criticalityValues[i], criticalityValues[j]] = [criticalityValues[j], criticalityValues[i]];
  }
  
  // Assign criticality values to tasks
  let criticalityIndex = 0;
  const migratedTasks = tasks.map(task => {
    if (!task.criticality || task.criticality === '') {
      return {
        ...task,
        criticality: criticalityValues[criticalityIndex++].toString()
      };
    }
    return task;
  });
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`Migrated ${tasksNeedingCriticality.length} tasks with criticality values`);
  }
  return migratedTasks;
} 