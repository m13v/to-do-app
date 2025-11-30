import React, { useState, useEffect, useRef } from 'react';
import { Draggable, DraggableProvided } from '@hello-pangea/dnd';
import { Task, TaskColor, TASK_COLORS } from '@/lib/markdown-parser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { TableRow, TableCell } from '@/components/ui/table';
import { GripVertical, Plus, X, WrapText } from 'lucide-react';
import { useDebouncedCallback } from 'use-debounce';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import NumberStepper from './NumberStepper';

// Color button background colors (what's shown when that color is active)
const COLOR_BG_CLASSES: Record<TaskColor, string> = {
  white: 'bg-white border border-gray-300',
  grey: 'bg-gray-400',
  red: 'bg-red-400',
  blue: 'bg-blue-400',
};

// Row background colors (using ! prefix to override hover states)
const ROW_BG_CLASSES: Record<TaskColor, string> = {
  white: '',
  grey: '!bg-gray-200 dark:!bg-gray-700',
  red: '!bg-red-100 dark:!bg-red-900',
  blue: '!bg-blue-100 dark:!bg-blue-900',
};

interface TaskRowProps {
  task: Task;
  index: number;
  isDraggable?: boolean;
  handleTaskUpdate: (id: string, field: keyof Omit<Task, 'id' | 'priority'>, value: string) => void;
  handlePriorityChange: (id: string, priority: number) => void;
  handleAddTask: (id: string) => void;
  handleDeleteTask: (id: string) => void;
  focusCell: (rowIndex: number, colIndex: number) => void;
  columnWidths?: {
    drag: number;
    priority: number;
    category: number;
    subcategory: number;
    status: number;
    task: number;
    color: number;
    actions: number;
  };
  isTextWrapped?: boolean;
  onToggleTextWrap?: () => void;
  isEditing?: boolean;
  onEditingComplete?: () => void;
}

const TaskRow: React.FC<TaskRowProps> = ({
  task,
  index,
  isDraggable = true,
  handleTaskUpdate,
  handlePriorityChange,
  handleAddTask,
  handleDeleteTask,
  focusCell,
  columnWidths,
  isTextWrapped = true,
  onToggleTextWrap,
  isEditing = false,
  onEditingComplete,
}) => {
  const [editedTask, setEditedTask] = useState(task);
  // Track if user is actively editing to prevent cursor position loss during re-renders
  const hasPendingChanges = useRef(false);

  const numCols = 5; // Category, Subcategory, Status, Task, Today

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>, colIndex: number) => {
    const target = e.target as HTMLInputElement | HTMLTextAreaElement;
    
    // Enter key (without Shift) creates a new task when in the Task field (colIndex 3, updated from 2 due to subcategory)
    // Shift+Enter allows adding new lines in the textarea
    if (e.key === 'Enter' && !e.shiftKey && colIndex === 3) {
      e.preventDefault();
      // Flush any pending debounced updates and save current changes
      debouncedUpdate.flush();
      if (editedTask.task !== task.task) {
        handleTaskUpdate(task.id, 'task', editedTask.task);
      }
      // Clear pending changes flag before creating new task
      hasPendingChanges.current = false;
      // Create new task (same as clicking Plus icon)
      handleAddTask(task.id);
      return;
    }
    
    if (e.key === 'ArrowUp') {
      // For textareas, only navigate to previous row if cursor is at the very start of the text
      // This handles both hard line breaks (newlines) and soft-wrapped lines
      const isTextarea = target.tagName === 'TEXTAREA';
      if (isTextarea) {
        const cursorPos = target.selectionStart || 0;
        
        // Only navigate to previous row if cursor is at position 0 (absolute start)
        // Let browser handle all internal navigation (both newlines and wrapped lines)
        if (cursorPos > 0) {
          return;
        }
      }
      e.preventDefault();
      focusCell(Math.max(0, index - 1), colIndex);
    } else if (e.key === 'ArrowDown') {
      // For textareas, only navigate to next row if cursor is at the very end of the text
      // This handles both hard line breaks (newlines) and soft-wrapped lines
      const isTextarea = target.tagName === 'TEXTAREA';
      if (isTextarea) {
        const cursorPos = target.selectionStart || 0;
        const textLength = target.value.length;
        
        // Only navigate to next row if cursor is at the end (absolute end)
        // Let browser handle all internal navigation (both newlines and wrapped lines)
        if (cursorPos < textLength) {
          return;
        }
      }
      e.preventDefault();
      focusCell(Math.min(Infinity, index + 1), colIndex); // Assume large number for row count, parent will handle bounds
    } else if (e.key === 'ArrowLeft') {
      if (target.selectionStart === 0) {
        e.preventDefault();
        focusCell(index, Math.max(0, colIndex - 1));
      }
    } else if (e.key === 'ArrowRight') {
      if (target.selectionEnd === target.value.length) {
        e.preventDefault();
        focusCell(index, Math.min(numCols - 1, colIndex + 1));
      }
    }
  };

  useEffect(() => {
    // Only sync with prop if local state matches incoming prop
    // If they differ, user has unsaved changes - don't reset cursor position
    // This prevents input reset during active editing
    setEditedTask(prev => {
      const hasLocalChanges =
        prev.task !== task.task ||
        prev.category !== task.category ||
        prev.subcategory !== task.subcategory ||
        prev.status !== task.status ||
        prev.color !== task.color;

      // Only sync from props if no local changes exist
      return hasLocalChanges ? prev : task;
    });
  }, [task]);

  const debouncedUpdate = useDebouncedCallback(
    (field: keyof Omit<Task, 'id' | 'priority'>, value: string) => {
      handleTaskUpdate(task.id, field, value);
      // Clear pending changes flag after update completes
      hasPendingChanges.current = false;
    },
    300
  );

  const handleChange = (field: keyof Omit<Task, 'id' | 'priority'>, value: string) => {
    // Mark that we have pending changes to prevent cursor position loss
    hasPendingChanges.current = true;
    setEditedTask(prev => ({ ...prev, [field]: value }));
    debouncedUpdate(field, value);
  };

  // Cycle to the next color
  const handleColorCycle = () => {
    const currentIndex = TASK_COLORS.indexOf(editedTask.color);
    const nextIndex = (currentIndex + 1) % TASK_COLORS.length;
    const nextColor = TASK_COLORS[nextIndex];
    setEditedTask(prev => ({ ...prev, color: nextColor }));
    handleTaskUpdate(task.id, 'color', nextColor);
  };

  // Get the next color to show on the button (what clicking will change to)
  const getNextColor = (): TaskColor => {
    const currentIndex = TASK_COLORS.indexOf(editedTask.color);
    return TASK_COLORS[(currentIndex + 1) % TASK_COLORS.length];
  };

  const handleBlur = (field: keyof Omit<Task, 'id' | 'priority'>) => {
    debouncedUpdate.flush();
    if (editedTask[field as keyof Task] !== task[field as keyof Task]) {
      handleTaskUpdate(task.id, field, String(editedTask[field as keyof Task]));
    }
    // Clear pending changes flag after blur to allow syncing from props again
    hasPendingChanges.current = false;
    // If this task was being edited (newly created), signal completion to apply sorting
    if (isEditing && onEditingComplete) {
      onEditingComplete();
    }
  };

  const rowContent = (provided?: DraggableProvided) => (
        <TableRow
      ref={provided?.innerRef}
      {...(provided?.draggableProps || {})}
          className={cn(
            "group",
            ROW_BG_CLASSES[editedTask.color],
            task.status === 'done' && "text-muted-foreground line-through"
          )}
        >
      <TableCell {...(provided?.dragHandleProps || {})} className="cursor-grab" style={columnWidths ? { width: `${columnWidths.drag}px` } : undefined}>
        {isDraggable ? <GripVertical className="h-4 w-4" /> : <div className="w-4" />}
          </TableCell>
      <TableCell style={columnWidths ? { width: `${columnWidths.priority}px` } : undefined}>
        <NumberStepper
          value={editedTask.priority}
          onChange={(newVal) => {
            setEditedTask(prev => ({ ...prev, priority: newVal }));
            // Immediately call handlePriorityChange when buttons are clicked or value changes
            handlePriorityChange(task.id, newVal);
          }}
          onBlur={() => {
            if (editedTask.priority !== task.priority) {
              handlePriorityChange(task.id, editedTask.priority);
            }
          }}
        />
          </TableCell>
      <TableCell className="font-medium" style={columnWidths ? { width: `${columnWidths.category}px` } : undefined}>
            <Input
              id={`cell-${index}-0`}
              value={editedTask.category}
              onChange={(e) => handleChange('category', e.target.value)}
              onBlur={() => handleBlur('category')}
              onKeyDown={(e) => handleKeyDown(e, 0)}
          className="py-0 px-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-xs leading-tight"
          style={{ height: "21px" }}
            />
          </TableCell>
      <TableCell className="font-medium" style={columnWidths ? { width: `${columnWidths.subcategory}px` } : undefined}>
            <Input
              id={`cell-${index}-1`}
              value={editedTask.subcategory}
              onChange={(e) => handleChange('subcategory', e.target.value)}
              onBlur={() => handleBlur('subcategory')}
              onKeyDown={(e) => handleKeyDown(e, 1)}
          className="py-0 px-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-xs leading-tight"
          style={{ height: "21px" }}
            />
          </TableCell>
      <TableCell style={columnWidths ? { width: `${columnWidths.status}px` } : undefined}>
            <Select value={editedTask.status} onValueChange={(value) => handleChange('status', value)}>
          <SelectTrigger id={`cell-${index}-2`} onFocus={() => focusCell(index, 2)} size="xs" className="px-2 border-0 focus:ring-0">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="to_do">To Do</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="waiting">Waiting</SelectItem>
                <SelectItem value="testing">Testing</SelectItem>
                <SelectItem value="done">Done</SelectItem>
              </SelectContent>
            </Select>
          </TableCell>
      <TableCell style={columnWidths ? { width: `${columnWidths.task}px` } : undefined}>
            <Textarea
              id={`cell-${index}-3`}
              value={isTextWrapped ? editedTask.task : editedTask.task.replace(/\n/g, ' ')}
              onChange={(e) => handleChange('task', e.target.value)}
              onBlur={() => handleBlur('task')}
              onKeyDown={(e) => handleKeyDown(e, 3)}
          className={cn(
            "min-h-[21px] py-0 px-1 border-0 resize-none focus-visible:ring-0 focus-visible:ring-offset-0 text-xs leading-tight",
            !isTextWrapped && "whitespace-nowrap overflow-hidden text-ellipsis"
          )}
              rows={1}
              data-task-id={task.id}
            />
          </TableCell>
      <TableCell className="text-center" style={columnWidths ? { width: `${columnWidths.color}px` } : undefined}>
            <button
              id={`cell-${index}-4`}
              onClick={handleColorCycle}
              onFocus={() => focusCell(index, 4)}
              className={cn(
                "w-4 h-4 rounded-sm cursor-pointer transition-colors",
                COLOR_BG_CLASSES[getNextColor()]
              )}
              title={`Click to change to ${getNextColor()}`}
              aria-label={`Change color to ${getNextColor()}`}
            />
          </TableCell>
      <TableCell className="text-right" style={columnWidths ? { width: `${columnWidths.actions}px` } : undefined}>
        <div className="flex items-center justify-end gap-0">
              <Button
                onClick={() => onToggleTextWrap?.()}
                size="sm"
                variant="ghost"
                className="h-5 w-5 p-0"
                title={isTextWrapped ? "Unwrap text (fit to one line)" : "Wrap text (show all lines)"}
              >
                <WrapText className={cn("h-3 w-3", !isTextWrapped && "text-blue-600")} />
              </Button>
              <Button
                onClick={() => handleAddTask(task.id)}
                size="sm"
                variant="ghost"
                className="h-5 w-5 p-0"
                title="Add task below"
              >
                <Plus className="h-3 w-3" />
              </Button>
              <Button
                onClick={() => handleDeleteTask(task.id)}
                size="sm"
                variant="ghost"
                className="h-5 w-5 p-0"
                title="Delete"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </TableCell>
        </TableRow>
  );

  if (!isDraggable) {
    return rowContent();
  }

  return (
    <Draggable key={task.id} draggableId={task.id} index={index}>
      {(provided) => rowContent(provided)}
    </Draggable>
  );
};

TaskRow.displayName = 'TaskRow';

export default React.memo(TaskRow); 