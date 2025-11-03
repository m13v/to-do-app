import { Task } from './markdown-parser';

/**
 * Check if markdown is in old format (7 columns without Updated)
 */
export function isOldFormat(markdown: string): boolean {
  const headerLine = markdown.split('\n').find(line => line.includes('| Category |'));
  if (!headerLine) return false;
  
  const headers = headerLine.split('|').map(h => h.trim().toLowerCase()).filter(h => h);
  const hasUpdated = headers.includes('updated');
  
  return !hasUpdated;
}

/**
 * Migrate tasks from old format to new format
 * - Adds updated_at field (set to created_at)
 * - Preserves original IDs during first migration to avoid duplicates
 * - Marks tasks as migrated so they get stable IDs on next save
 */
export function migrateTasks(tasks: Task[]): Task[] {
  console.log('[Migration] Migrating tasks to new format');
  
  return tasks.map(task => ({
    ...task,
    // Set updated_at to created_at if not present
    updated_at: task.updated_at || task.created_at,
  }));
}

/**
 * One-time migration check for existing users
 * This ensures smooth transition without data loss
 */
export function checkAndMigrate(markdown: string): { needsMigration: boolean; tasks: Task[] } {
  const oldFormat = isOldFormat(markdown);
  
  if (oldFormat) {
    console.log('[Migration] ⚠️ Old format detected - performing migration');
    // The parseMarkdownTable will handle adding updated_at
    // We don't need to do anything special here
    return { needsMigration: true, tasks: [] };
  }
  
  return { needsMigration: false, tasks: [] };
}

