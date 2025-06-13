import { Task } from './markdown-parser';

export function generateDiff(oldTasks: Task[], newTasks: Task[]): string {
  const oldTasksMap = new Map(oldTasks.map(t => [t.id, t]));
  const newTasksMap = new Map(newTasks.map(t => [t.id, t]));
  const diffLines: string[] = [];

  // Check for added tasks
  for (const newTask of newTasks) {
    if (!oldTasksMap.has(newTask.id)) {
      diffLines.push(`- Added task: "${newTask.task}" in category "${newTask.category}"`);
    }
  }

  // Check for removed and changed tasks
  for (const oldTask of oldTasks) {
    const newTask = newTasksMap.get(oldTask.id);
    if (!newTask) {
      diffLines.push(`- Removed task: "${oldTask.task}" from category "${oldTask.category}"`);
    } else {
      const changes: string[] = [];
      if (oldTask.task !== newTask.task) {
        changes.push(`description changed from "${oldTask.task}" to "${newTask.task}"`);
      }
      if (oldTask.category !== newTask.category) {
        changes.push(`category changed from "${oldTask.category}" to "${newTask.category}"`);
      }
      if (oldTask.status !== newTask.status) {
        changes.push(`status changed from "${oldTask.status}" to "${newTask.status}"`);
      }
       if (oldTask.priority !== newTask.priority) {
        changes.push(`priority changed from ${oldTask.priority} to ${newTask.priority}`);
      }
      if (oldTask.effort !== newTask.effort) {
        changes.push(`effort changed from ${oldTask.effort} to ${newTask.effort}`);
      }
      if (oldTask.criticality !== newTask.criticality) {
        changes.push(`criticality changed from ${oldTask.criticality} to ${newTask.criticality}`);
      }
      if (oldTask.today !== newTask.today) {
        changes.push(`marked as ${newTask.today ? 'today' : 'not today'}`);
      }
      if (changes.length > 0) {
        diffLines.push(`- For task "${oldTask.task}", ${changes.join(', ')}`);
      }
    }
  }

  return diffLines.length > 0 ? diffLines.join('\n') : "No changes detected.";
} 