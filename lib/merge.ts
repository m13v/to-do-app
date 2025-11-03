import { Task } from './markdown-parser';

// Three-way merge result with detailed information
export interface MergeResult {
  merged: Task[];
  conflicts: MergeConflict[];
  changes: MergeChange[];
}

export interface MergeConflict {
  taskId: string;
  taskName: string;
  field: string;
  localValue: string | number | boolean;
  serverValue: string | number | boolean;
  resolution: 'local' | 'server';
}

export interface MergeChange {
  type: 'added' | 'deleted' | 'modified';
  source: 'local' | 'server';
  taskId: string;
  taskName: string;
  details?: string;
}

/**
 * Three-way merge algorithm for tasks
 * 
 * @param base - The last known common state (what both devices had)
 * @param local - Current device's state
 * @param server - Server state (from other device)
 * @returns Merged task list with conflict information
 */
export function mergeTasks(
  base: Task[] | null,
  local: Task[],
  server: Task[]
): MergeResult {
  console.log('[Merge] Starting three-way merge');
  console.log('[Merge] Base tasks:', base?.length ?? 'null');
  console.log('[Merge] Local tasks:', local.length);
  console.log('[Merge] Server tasks:', server.length);

  // If no base version, fall back to simple merge
  if (!base || base.length === 0) {
    console.log('[Merge] No base version, performing simple merge');
    return simpleMerge(local, server);
  }

  // Create maps for quick lookup
  const baseMap = new Map(base.map(t => [t.id, t]));
  const localMap = new Map(local.map(t => [t.id, t]));
  const serverMap = new Map(server.map(t => [t.id, t]));

  const merged: Task[] = [];
  const conflicts: MergeConflict[] = [];
  const changes: MergeChange[] = [];
  const processedIds = new Set<string>();

  // Process all unique task IDs
  const allIds = new Set([
    ...baseMap.keys(),
    ...localMap.keys(),
    ...serverMap.keys()
  ]);

  for (const id of allIds) {
    const baseTask = baseMap.get(id);
    const localTask = localMap.get(id);
    const serverTask = serverMap.get(id);

    processedIds.add(id);

    // Case 1: Task exists in all three versions
    if (baseTask && localTask && serverTask) {
      const mergedTask = mergeTask(baseTask, localTask, serverTask, conflicts);
      merged.push(mergedTask);
      
      // Track if task was modified
      if (hasTaskChanged(baseTask, localTask)) {
        changes.push({
          type: 'modified',
          source: 'local',
          taskId: id,
          taskName: localTask.task,
          details: getChangeDetails(baseTask, localTask)
        });
      }
      if (hasTaskChanged(baseTask, serverTask)) {
        changes.push({
          type: 'modified',
          source: 'server',
          taskId: id,
          taskName: serverTask.task,
          details: getChangeDetails(baseTask, serverTask)
        });
      }
    }
    // Case 2: Task deleted locally, exists on server
    else if (baseTask && !localTask && serverTask) {
      // Check if server also modified it
      if (hasTaskChanged(baseTask, serverTask)) {
        // Conflict: deleted locally but modified on server
        // Resolution: Keep server version (modification wins over deletion)
        console.log(`[Merge] Conflict: Task "${baseTask.task}" deleted locally but modified on server - keeping server version`);
        merged.push(serverTask);
        changes.push({
          type: 'modified',
          source: 'server',
          taskId: id,
          taskName: serverTask.task,
          details: 'Modified on server (wins over local deletion)'
        });
      } else {
        // Local deletion wins - don't add to merged
        console.log(`[Merge] Task "${baseTask.task}" deleted locally`);
        changes.push({
          type: 'deleted',
          source: 'local',
          taskId: id,
          taskName: baseTask.task
        });
      }
    }
    // Case 3: Task deleted on server, exists locally
    else if (baseTask && localTask && !serverTask) {
      // Check if local also modified it
      if (hasTaskChanged(baseTask, localTask)) {
        // Conflict: deleted on server but modified locally
        // Resolution: Keep local version (modification wins over deletion)
        console.log(`[Merge] Conflict: Task "${baseTask.task}" deleted on server but modified locally - keeping local version`);
        merged.push(localTask);
        changes.push({
          type: 'modified',
          source: 'local',
          taskId: id,
          taskName: localTask.task,
          details: 'Modified locally (wins over server deletion)'
        });
      } else {
        // Server deletion wins - don't add to merged
        console.log(`[Merge] Task "${baseTask.task}" deleted on server`);
        changes.push({
          type: 'deleted',
          source: 'server',
          taskId: id,
          taskName: baseTask.task
        });
      }
    }
    // Case 4: Task deleted on both sides
    else if (baseTask && !localTask && !serverTask) {
      // Both deleted - don't add to merged
      console.log(`[Merge] Task "${baseTask.task}" deleted on both sides`);
    }
    // Case 5: New task added locally only
    else if (!baseTask && localTask && !serverTask) {
      console.log(`[Merge] New task added locally: "${localTask.task}"`);
      merged.push(localTask);
      changes.push({
        type: 'added',
        source: 'local',
        taskId: id,
        taskName: localTask.task
      });
    }
    // Case 6: New task added on server only
    else if (!baseTask && !localTask && serverTask) {
      console.log(`[Merge] New task added on server: "${serverTask.task}"`);
      merged.push(serverTask);
      changes.push({
        type: 'added',
        source: 'server',
        taskId: id,
        taskName: serverTask.task
      });
    }
    // Case 7: New task added on both sides (same ID, shouldn't happen with stable IDs)
    else if (!baseTask && localTask && serverTask) {
      console.log(`[Merge] New task with same ID on both sides: "${localTask.task}"`);
      // This shouldn't happen with our stable ID generation, but handle it
      const mergedTask = mergeTask(localTask, localTask, serverTask, conflicts);
      merged.push(mergedTask);
    }
  }

  // Recalculate priorities based on merge result
  const finalMerged = recalculatePriorities(merged);

  console.log('[Merge] Merge complete');
  console.log('[Merge] Final merged tasks:', finalMerged.length);
  console.log('[Merge] Conflicts:', conflicts.length);
  console.log('[Merge] Changes:', changes.length);

  return { merged: finalMerged, conflicts, changes };
}

/**
 * Simple merge when no base version is available
 * Merges local and server tasks, preferring the most recently updated version
 */
function simpleMerge(local: Task[], server: Task[]): MergeResult {
  console.log('[Merge] Performing simple merge without base version');
  
  const localMap = new Map(local.map(t => [t.id, t]));
  const serverMap = new Map(server.map(t => [t.id, t]));
  
  const merged: Task[] = [];
  const conflicts: MergeConflict[] = [];
  const changes: MergeChange[] = [];
  
  // Get all unique IDs
  const allIds = new Set([...localMap.keys(), ...serverMap.keys()]);
  
  for (const id of allIds) {
    const localTask = localMap.get(id);
    const serverTask = serverMap.get(id);
    
    if (localTask && serverTask) {
      // Both exist - use most recently updated
      const localTime = new Date(localTask.updated_at).getTime();
      const serverTime = new Date(serverTask.updated_at).getTime();
      
      if (localTime >= serverTime) {
        merged.push(localTask);
        changes.push({
          type: 'modified',
          source: 'local',
          taskId: id,
          taskName: localTask.task,
          details: 'Kept local version (more recent)'
        });
      } else {
        merged.push(serverTask);
        changes.push({
          type: 'modified',
          source: 'server',
          taskId: id,
          taskName: serverTask.task,
          details: 'Kept server version (more recent)'
        });
      }
    } else if (localTask) {
      merged.push(localTask);
      changes.push({
        type: 'added',
        source: 'local',
        taskId: id,
        taskName: localTask.task
      });
    } else if (serverTask) {
      merged.push(serverTask);
      changes.push({
        type: 'added',
        source: 'server',
        taskId: id,
        taskName: serverTask.task
      });
    }
  }
  
  return { merged: recalculatePriorities(merged), conflicts, changes };
}

/**
 * Merge a single task using Last-Write-Wins (LWW) strategy per field
 */
function mergeTask(
  base: Task,
  local: Task,
  server: Task,
  conflicts: MergeConflict[]
): Task {
  const localTime = new Date(local.updated_at).getTime();
  const serverTime = new Date(server.updated_at).getTime();
  
  // Merge each field individually using LWW
  const merged: Task = {
    id: base.id, // Immutable
    created_at: base.created_at, // Immutable
    priority: mergeSingleField('priority', base.priority, local.priority, server.priority, localTime, serverTime, conflicts, base),
    category: mergeSingleField('category', base.category, local.category, server.category, localTime, serverTime, conflicts, base),
    subcategory: mergeSingleField('subcategory', base.subcategory, local.subcategory, server.subcategory, localTime, serverTime, conflicts, base),
    task: mergeSingleField('task', base.task, local.task, server.task, localTime, serverTime, conflicts, base),
    status: mergeSingleField('status', base.status, local.status, server.status, localTime, serverTime, conflicts, base),
    today: mergeSingleField('today', base.today, local.today, server.today, localTime, serverTime, conflicts, base),
    updated_at: mergeSingleField('updated_at', base.updated_at, local.updated_at, server.updated_at, localTime, serverTime, conflicts, base),
  };
  
  return merged;
}

/**
 * Merge a single field using LWW strategy
 */
function mergeSingleField<T extends string | number | boolean>(
  fieldName: string,
  baseValue: T,
  localValue: T,
  serverValue: T,
  localTime: number,
  serverTime: number,
  conflicts: MergeConflict[],
  baseTask: Task
): T {
  // If both sides changed from base
  if (localValue !== baseValue && serverValue !== baseValue) {
    if (localValue !== serverValue) {
      // Real conflict - record it
      conflicts.push({
        taskId: baseTask.id,
        taskName: baseTask.task,
        field: fieldName,
        localValue,
        serverValue,
        resolution: localTime >= serverTime ? 'local' : 'server'
      });
    }
    
    // LWW: Use most recent
    return localTime >= serverTime ? localValue : serverValue;
  }
  // Only local changed
  else if (localValue !== baseValue) {
    return localValue;
  }
  // Only server changed
  else if (serverValue !== baseValue) {
    return serverValue;
  }
  // Neither changed - keep base
  return baseValue;
}

/**
 * Check if a task has changed between two versions
 */
function hasTaskChanged(oldTask: Task, newTask: Task): boolean {
  return (
    oldTask.priority !== newTask.priority ||
    oldTask.category !== newTask.category ||
    oldTask.subcategory !== newTask.subcategory ||
    oldTask.task !== newTask.task ||
    oldTask.status !== newTask.status ||
    oldTask.today !== newTask.today
  );
}

/**
 * Get human-readable description of changes
 */
function getChangeDetails(oldTask: Task, newTask: Task): string {
  const changes: string[] = [];
  
  if (oldTask.task !== newTask.task) {
    changes.push(`text changed`);
  }
  if (oldTask.status !== newTask.status) {
    changes.push(`status: ${oldTask.status} → ${newTask.status}`);
  }
  if (oldTask.category !== newTask.category) {
    changes.push(`category: ${oldTask.category} → ${newTask.category}`);
  }
  if (oldTask.priority !== newTask.priority) {
    changes.push(`priority: ${oldTask.priority} → ${newTask.priority}`);
  }
  if (oldTask.today !== newTask.today) {
    changes.push(`today: ${oldTask.today ? 'yes' : 'no'} → ${newTask.today ? 'yes' : 'no'}`);
  }
  
  return changes.join(', ');
}

/**
 * Recalculate priorities to ensure sequential ordering
 */
function recalculatePriorities(tasks: Task[]): Task[] {
  // Sort by existing priority first
  const sorted = [...tasks].sort((a, b) => a.priority - b.priority);
  
  // Reassign sequential priorities
  return sorted.map((task, index) => ({
    ...task,
    priority: index + 1
  }));
}

