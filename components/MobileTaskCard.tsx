'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Task } from '@/lib/markdown-parser';
import { Button } from '@/components/ui/button';
import { Plus, X, ChevronDown, ChevronUp, GripVertical, WrapText } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import NumberStepper from './NumberStepper';
import { Draggable, DraggableProvided } from '@hello-pangea/dnd';

interface MobileTaskCardProps {
  task: Task;
  index: number;
  onUpdate: (id: string, field: keyof Omit<Task, 'id'> | 'today', value: string | boolean) => void;
  onDelete: (id: string) => void;
  onAdd: (id: string) => void;
  onPriorityChange: (id: string, newPriority: number) => void;
  isSelected?: boolean;
  onToggleSelect?: (taskId: string) => void;
  isDraggable?: boolean;
}

const MobileTaskCard: React.FC<MobileTaskCardProps> = ({ 
  task, 
  index, 
  onUpdate, 
  onDelete, 
  onAdd, 
  onPriorityChange, 
  isSelected = false, 
  onToggleSelect,
  isDraggable = true
}) => {
  const [editedTask, setEditedTask] = useState(task);
  // Collapse state for the metadata section
  const [isCollapsed, setIsCollapsed] = useState(false);
  // State to track if text should be wrapped or not (local UI state, not persisted)
  const [isTextWrapped, setIsTextWrapped] = useState(true);
  
  // Debounce timer refs for auto-save
  const taskDebounceTimer = useRef<NodeJS.Timeout | null>(null);
  const categoryDebounceTimer = useRef<NodeJS.Timeout | null>(null);
  const subcategoryDebounceTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setEditedTask(task);
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
  }, [editedTask, task, onUpdate]);

  // Listen for visibility changes (app going to background)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('[MobileTaskCard] Page becoming hidden, saving changes');
        savePendingChanges();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      // Also save when component unmounts
      savePendingChanges();
    };
  }, [savePendingChanges]);

  const cardContent = (provided?: DraggableProvided) => (
    <Card 
      className={cn("mb-0.5 rounded-md", task.status === 'done' && 'bg-muted')}
      ref={provided?.innerRef}
      {...(provided?.draggableProps || {})}
    >
      <CardContent className="p-1.5 space-y-1">
        <div className="flex items-start gap-0.5">
          <div {...(provided?.dragHandleProps || {})} className="cursor-grab active:cursor-grabbing mt-1">
            {isDraggable ? <GripVertical className="h-4 w-4 text-muted-foreground" /> : <div className="w-4" />}
          </div>
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggleSelect?.(task.id)}
            aria-label={`Select task ${task.task}`}
            className="mt-1"
          />
          <Textarea
            value={isTextWrapped ? editedTask.task : editedTask.task.replace(/\n/g, ' ')}
            onChange={(e) => {
              const newValue = e.target.value;
              setEditedTask(prev => ({...prev, task: newValue}));
              
              // Debounced auto-save: save after 500ms of no typing
              if (taskDebounceTimer.current) {
                clearTimeout(taskDebounceTimer.current);
              }
              taskDebounceTimer.current = setTimeout(() => {
                console.log('[MobileTaskCard] Auto-saving task after debounce');
                onUpdate(task.id, 'task', newValue);
              }, 500);
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
                }
                // Create new task (same as clicking Plus icon)
                onAdd(task.id);
              }
            }}
            className={cn(
              "flex-1 text-sm font-semibold p-1 resize-none border rounded-md shadow-none focus-visible:ring-1",
              task.status === 'done' && 'line-through',
              !isTextWrapped && "whitespace-nowrap overflow-hidden text-ellipsis"
            )}
            rows={Math.max(1, Math.floor(editedTask.task.length / 35))}
            data-task-id={task.id}
          />
          <Button
            onClick={() => setIsCollapsed(!isCollapsed)}
            size="sm"
            variant="ghost"
            className="h-5 w-5 p-0 flex-shrink-0"
            aria-label={isCollapsed ? "Expand details" : "Collapse details"}
          >
            {isCollapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
          </Button>
        </div>
        {!isCollapsed && (
          <div className="text-xs text-muted-foreground grid grid-cols-2 gap-x-3 gap-y-0.5">
          <div className="flex items-center justify-between">
            <NumberStepper
              title="Priority:"
              value={editedTask.priority}
              onChange={(newVal) => {
                setEditedTask(prev => ({ ...prev, priority: newVal }));
                // Immediately update priority when buttons are clicked
                onPriorityChange(task.id, newVal);
              }}
              onBlur={() => {
                if (editedTask.priority !== task.priority) {
                  onPriorityChange(task.id, editedTask.priority);
                }
              }}
              showLabels={true}
            />
          </div>
          <div></div>
          <div className="flex items-center justify-between">
            <strong className="text-foreground">Category:</strong>
            <Input
                value={editedTask.category}
                onChange={(e) => {
                  const newValue = e.target.value;
                  setEditedTask(prev => ({...prev, category: newValue}));
                  
                  // Debounced auto-save
                  if (categoryDebounceTimer.current) {
                    clearTimeout(categoryDebounceTimer.current);
                  }
                  categoryDebounceTimer.current = setTimeout(() => {
                    console.log('[MobileTaskCard] Auto-saving category after debounce');
                    onUpdate(task.id, 'category', newValue);
                  }, 500);
                }}
                onBlur={() => {
                  // Clear debounce and save immediately on blur
                  if (categoryDebounceTimer.current) {
                    clearTimeout(categoryDebounceTimer.current);
                    categoryDebounceTimer.current = null;
                  }
                  if (editedTask.category !== task.category) {
                    onUpdate(task.id, 'category', editedTask.category);
                  }
                }}
                className="h-6 text-xs w-24 text-right border-0"
            />
          </div>
          <div className="flex items-center justify-between">
            <strong className="text-foreground">Subcategory:</strong>
            <Input
                value={editedTask.subcategory}
                onChange={(e) => {
                  const newValue = e.target.value;
                  setEditedTask(prev => ({...prev, subcategory: newValue}));
                  
                  // Debounced auto-save
                  if (subcategoryDebounceTimer.current) {
                    clearTimeout(subcategoryDebounceTimer.current);
                  }
                  subcategoryDebounceTimer.current = setTimeout(() => {
                    console.log('[MobileTaskCard] Auto-saving subcategory after debounce');
                    onUpdate(task.id, 'subcategory', newValue);
                  }, 500);
                }}
                onBlur={() => {
                  // Clear debounce and save immediately on blur
                  if (subcategoryDebounceTimer.current) {
                    clearTimeout(subcategoryDebounceTimer.current);
                    subcategoryDebounceTimer.current = null;
                  }
                  if (editedTask.subcategory !== task.subcategory) {
                    onUpdate(task.id, 'subcategory', editedTask.subcategory);
                  }
                }}
                className="h-6 text-xs w-24 text-right border-0"
            />
          </div>
          <div className="flex items-center justify-between">
            <strong className="text-foreground">Status:</strong>
            <Select value={editedTask.status} onValueChange={(value) => onUpdate(task.id, 'status', value)}>
              <SelectTrigger className="h-6 text-xs w-24 border-0 justify-end">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="to_do">To Do</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="waiting">Waiting</SelectItem>
                <SelectItem value="done">Done</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        )}
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-1.5">
            <strong className="text-xs font-medium text-foreground">Today:</strong>
            <Checkbox
              checked={!!task.today}
              onCheckedChange={checked => onUpdate(task.id, 'today', !!checked)}
            />
          </div>
          <div className="flex items-center gap-0.5">
            <Button 
              onClick={() => setIsTextWrapped(!isTextWrapped)} 
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