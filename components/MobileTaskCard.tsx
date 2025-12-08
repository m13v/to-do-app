'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Task, TaskColor, TASK_COLORS } from '@/lib/markdown-parser';
import { Button } from '@/components/ui/button';
import { Plus, X, ChevronDown, ChevronUp, WrapText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Draggable, DraggableProvided } from '@hello-pangea/dnd';

// Color button background colors
const COLOR_BG_CLASSES: Record<TaskColor, string> = {
  white: 'bg-white border border-gray-300',
  grey: 'bg-gray-400',
  red: 'bg-red-400',
  blue: 'bg-blue-400',
};

// Card background colors
const CARD_BG_CLASSES: Record<TaskColor, string> = {
  white: '',
  grey: 'bg-gray-200 dark:bg-gray-700',
  red: 'bg-red-100 dark:bg-red-900',
  blue: 'bg-blue-100 dark:bg-blue-900',
};

interface MobileTaskCardProps {
  task: Task;
  index: number;
  onUpdate: (id: string, field: keyof Omit<Task, 'id' | 'priority'>, value: string) => void;
  onDelete: (id: string) => void;
  onAdd: (id: string) => void;
  onPriorityChange: (id: string, newPriority: number) => void;
  isDraggable?: boolean;
  isTextWrapped?: boolean;
  onToggleTextWrap?: () => void;
}

const MobileTaskCard: React.FC<MobileTaskCardProps> = ({ 
  task, 
  index, 
  onUpdate, 
  onDelete, 
  onAdd, 
  onPriorityChange, 
  isDraggable = true,
  isTextWrapped = true,
  onToggleTextWrap
}) => {
  const [editedTask, setEditedTask] = useState(task);
  // Collapse state for the metadata section (collapsed by default)
  const [isCollapsed, setIsCollapsed] = useState(true);
  
  // Debounce timer refs for auto-save
  const taskDebounceTimer = useRef<NodeJS.Timeout | null>(null);
  const categoryDebounceTimer = useRef<NodeJS.Timeout | null>(null);
  const subcategoryDebounceTimer = useRef<NodeJS.Timeout | null>(null);
  
  // Track if THIS card has unsaved changes to prevent unnecessary saves on re-render
  const hasPendingChanges = useRef(false);

  useEffect(() => {
    // Only sync with prop if local state matches incoming prop
    // If they differ, user has unsaved changes - don't reset their input
    // This prevents input reset during active typing on mobile
    setEditedTask(prev => {
      const hasLocalChanges = 
        prev.task !== task.task ||
        prev.category !== task.category ||
        prev.subcategory !== task.subcategory;
      
      // Only sync from props if no local changes exist
      return hasLocalChanges ? prev : task;
    });
  }, [task]);

  // Save pending changes immediately (called before navigation/backgrounding)
  const savePendingChanges = useCallback(() => {
    console.log('[MobileTaskCard] Saving pending changes for task:', task.id);
    
    // Clear any pending debounce timers
    if (taskDebounceTimer.current) {
      clearTimeout(taskDebounceTimer.current);
      taskDebounceTimer.current = null;
    }
    if (categoryDebounceTimer.current) {
      clearTimeout(categoryDebounceTimer.current);
      categoryDebounceTimer.current = null;
    }
    if (subcategoryDebounceTimer.current) {
      clearTimeout(subcategoryDebounceTimer.current);
      subcategoryDebounceTimer.current = null;
    }
    
    // Save all pending changes
    if (editedTask.task !== task.task) {
      console.log('[MobileTaskCard] Saving task field:', editedTask.task);
      onUpdate(task.id, 'task', editedTask.task);
    }
    if (editedTask.category !== task.category) {
      console.log('[MobileTaskCard] Saving category field:', editedTask.category);
      onUpdate(task.id, 'category', editedTask.category);
    }
    if (editedTask.subcategory !== task.subcategory) {
      console.log('[MobileTaskCard] Saving subcategory field:', editedTask.subcategory);
      onUpdate(task.id, 'subcategory', editedTask.subcategory);
    }
    
    // Clear dirty flag after saving
    hasPendingChanges.current = false;
  }, [editedTask, task, onUpdate]);

  // Listen for visibility changes (app going to background)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && hasPendingChanges.current) {
        console.log('[MobileTaskCard] Page becoming hidden, saving changes');
        savePendingChanges();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      // Only save when component unmounts if THIS card has unsaved changes
      if (hasPendingChanges.current) {
        savePendingChanges();
      }
    };
  }, [savePendingChanges]);

  // Cycle to the next color
  const handleColorCycle = () => {
    const currentIndex = TASK_COLORS.indexOf(editedTask.color);
    const nextIndex = (currentIndex + 1) % TASK_COLORS.length;
    const nextColor = TASK_COLORS[nextIndex];
    setEditedTask(prev => ({ ...prev, color: nextColor }));
    onUpdate(task.id, 'color', nextColor);
  };

  // Get the next color to show on the button
  const getNextColor = (): TaskColor => {
    const currentIndex = TASK_COLORS.indexOf(editedTask.color);
    return TASK_COLORS[(currentIndex + 1) % TASK_COLORS.length];
  };

  const cardContent = (provided?: DraggableProvided) => (
    <Card
      className={cn("mb-0.5 rounded-md", CARD_BG_CLASSES[editedTask.color], task.status === 'done' && 'bg-muted')}
      ref={provided?.innerRef}
      {...(provided?.draggableProps || {})}
    >
      <CardContent className="p-1.5">
        {/* First line: Task name only */}
        <div>
          <Textarea
            value={isTextWrapped ? editedTask.task : editedTask.task.replace(/\n/g, ' ')}
            onChange={(e) => {
              const newValue = e.target.value;
              setEditedTask(prev => ({...prev, task: newValue}));
              hasPendingChanges.current = true; // Mark as dirty
              
              // Debounced auto-save: save after 500ms of no typing
              if (taskDebounceTimer.current) {
                clearTimeout(taskDebounceTimer.current);
              }
              taskDebounceTimer.current = setTimeout(() => {
                console.log('[MobileTaskCard] Auto-saving task after debounce');
                onUpdate(task.id, 'task', newValue);
                hasPendingChanges.current = false; // Clear after save
              }, 500);
            }}
            onFocus={(e) => {
              // Delay to let keyboard fully open, then scroll into view
              const target = e.target;
              setTimeout(() => {
                target.scrollIntoView({ block: 'center', behavior: 'smooth' });
              }, 300);
            }}
            onBlur={() => {
              // Clear debounce timer and save immediately on blur
              if (taskDebounceTimer.current) {
                clearTimeout(taskDebounceTimer.current);
                taskDebounceTimer.current = null;
              }
              if(editedTask.task !== task.task) {
                console.log('[MobileTaskCard] Saving task on blur');
                onUpdate(task.id, 'task', editedTask.task);
                hasPendingChanges.current = false; // Clear after save
              }
            }}
            onKeyDown={(e) => {
              // Enter without Shift creates a new task (Shift+Enter adds new line)
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                // Clear debounce and save immediately
                if (taskDebounceTimer.current) {
                  clearTimeout(taskDebounceTimer.current);
                  taskDebounceTimer.current = null;
                }
                if(editedTask.task !== task.task) {
                  onUpdate(task.id, 'task', editedTask.task);
                  hasPendingChanges.current = false; // Clear after save
                }
                // Create new task (same as clicking Plus icon)
                onAdd(task.id);
              }
            }}
            className={cn(
              "w-full text-sm font-semibold p-1 resize-none border rounded-md shadow-none focus-visible:ring-1",
              task.status === 'done' && 'line-through',
              !isTextWrapped && "whitespace-nowrap overflow-hidden text-ellipsis"
            )}
            rows={isTextWrapped ? Math.max(2, Math.ceil(editedTask.task.length / 40)) : 1}
            data-task-id={task.id}
          />
        </div>
        
        {/* Second line: Priority, Status, Category, and Expand toggle */}
        <div className="flex items-center gap-2 text-xs mt-1">
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">Priority:</span>
            <Input
              type="number"
              value={editedTask.priority}
              onChange={(e) => {
                const newVal = parseInt(e.target.value) || 0;
                setEditedTask(prev => ({ ...prev, priority: newVal }));
                onPriorityChange(task.id, newVal);
              }}
              onFocus={(e) => {
                const target = e.target;
                setTimeout(() => {
                  target.scrollIntoView({ block: 'center', behavior: 'smooth' });
                }, 300);
              }}
              className="h-5 w-6 text-xs text-center border rounded px-1"
            />
          </div>
          
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">Status:</span>
            <Select value={editedTask.status} onValueChange={(value) => onUpdate(task.id, 'status', value)}>
              <SelectTrigger className="h-5 text-xs w-20 border-0 p-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="to_do">To Do</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="waiting">Waiting</SelectItem>
                <SelectItem value="testing">Testing</SelectItem>
                <SelectItem value="done">Done</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">Cat:</span>
            <Input
              value={editedTask.category}
              onChange={(e) => {
                const newValue = e.target.value;
                setEditedTask(prev => ({...prev, category: newValue}));
                hasPendingChanges.current = true;
                
                if (categoryDebounceTimer.current) {
                  clearTimeout(categoryDebounceTimer.current);
                }
                categoryDebounceTimer.current = setTimeout(() => {
                  onUpdate(task.id, 'category', newValue);
                  hasPendingChanges.current = false;
                }, 500);
              }}
              onFocus={(e) => {
                const target = e.target;
                setTimeout(() => {
                  target.scrollIntoView({ block: 'center', behavior: 'smooth' });
                }, 300);
              }}
              onBlur={() => {
                if (categoryDebounceTimer.current) {
                  clearTimeout(categoryDebounceTimer.current);
                  categoryDebounceTimer.current = null;
                }
                if (editedTask.category !== task.category) {
                  onUpdate(task.id, 'category', editedTask.category);
                  hasPendingChanges.current = false;
                }
              }}
              className="h-5 text-xs w-16 border rounded px-1"
            />
          </div>
          
          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={handleColorCycle}
              className={cn(
                "w-4 h-4 rounded-sm cursor-pointer transition-colors",
                COLOR_BG_CLASSES[getNextColor()]
              )}
              title={`Click to change to ${getNextColor()}`}
              aria-label={`Change color to ${getNextColor()}`}
            />
            <Button
              onClick={() => setIsCollapsed(!isCollapsed)}
              size="sm"
              variant="ghost"
              className="h-5 w-5 p-0"
              aria-label={isCollapsed ? "Expand details" : "Collapse details"}
            >
              {isCollapsed ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
            </Button>
          </div>
        </div>
        {/* Third line: Collapsible area with additional controls */}
        {!isCollapsed && (
          <div className="pt-1 border-t border-muted">
            <div className="flex items-center gap-1 text-xs">
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Subcategory:</span>
                <Input
                  value={editedTask.subcategory}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    setEditedTask(prev => ({...prev, subcategory: newValue}));
                    hasPendingChanges.current = true;
                    
                    if (subcategoryDebounceTimer.current) {
                      clearTimeout(subcategoryDebounceTimer.current);
                    }
                    subcategoryDebounceTimer.current = setTimeout(() => {
                      onUpdate(task.id, 'subcategory', newValue);
                      hasPendingChanges.current = false;
                    }, 500);
                  }}
                  onFocus={(e) => {
                    const target = e.target;
                    setTimeout(() => {
                      target.scrollIntoView({ block: 'center', behavior: 'smooth' });
                    }, 300);
                  }}
                  onBlur={() => {
                    if (subcategoryDebounceTimer.current) {
                      clearTimeout(subcategoryDebounceTimer.current);
                      subcategoryDebounceTimer.current = null;
                    }
                    if (editedTask.subcategory !== task.subcategory) {
                      onUpdate(task.id, 'subcategory', editedTask.subcategory);
                      hasPendingChanges.current = false;
                    }
                  }}
                  className="h-5 text-xs w-16 border rounded px-1"
                />
              </div>
              
              <Button 
                onClick={() => onToggleTextWrap?.()} 
                size="sm" 
                variant="ghost" 
                className="h-5 px-1.5"
                title={isTextWrapped ? "Unwrap text (fit to one line)" : "Wrap text (show all lines)"}
              >
                <WrapText className={cn("h-3.5 w-3.5", !isTextWrapped && "text-blue-600")} />
              </Button>
              
              <Button onClick={() => onAdd(task.id)} size="sm" variant="ghost" className="h-5 px-1.5">
                <Plus className="h-3.5 w-3.5 mr-0.5" />
                <span className="text-xs">Add</span>
              </Button>
              
              <Button onClick={() => onDelete(task.id)} size="sm" variant="ghost" className="h-5 px-1.5">
                <X className="h-3.5 w-3.5 mr-0.5" />
                <span className="text-xs">Delete</span>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (!isDraggable) {
    return cardContent();
  }

  return (
    <Draggable key={task.id} draggableId={task.id} index={index}>
      {(provided) => cardContent(provided)}
    </Draggable>
  );
};

export default MobileTaskCard; 