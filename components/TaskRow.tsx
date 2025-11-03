import React, { useState, useEffect } from 'react';
import { Draggable, DraggableProvided } from '@hello-pangea/dnd';
import { Task } from '@/lib/markdown-parser';
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
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import NumberStepper from './NumberStepper';

interface TaskRowProps {
  task: Task;
  index: number;
  isDraggable?: boolean;
  handleTaskUpdate: (id: string, field: keyof Omit<Task, 'id' | 'priority'> | 'today', value: string | boolean) => void;
  handlePriorityChange: (id: string, priority: number) => void;
  handleAddTask: (id: string) => void;
  handleDeleteTask: (id: string) => void;
  focusCell: (rowIndex: number, colIndex: number) => void;
  isSelected?: boolean;
  onToggleSelect?: (taskId: string) => void;
  columnWidths?: {
    checkbox: number;
    drag: number;
    priority: number;
    category: number;
    subcategory: number;
    status: number;
    task: number;
    today: number;
    actions: number;
  };
  isTextWrapped?: boolean;
  onToggleTextWrap?: () => void;
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
  isSelected = false,
  onToggleSelect,
  columnWidths,
  isTextWrapped = true,
  onToggleTextWrap,
}) => {
  const [editedTask, setEditedTask] = useState(task);

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
    setEditedTask(task);
  }, [task]);

  const debouncedUpdate = useDebouncedCallback(
    (field: keyof Omit<Task, 'id' | 'priority'> | 'today', value: string | boolean) => {
      handleTaskUpdate(task.id, field, value);
    },
    300
  );

  const handleChange = (field: keyof Omit<Task, 'id' | 'priority'>, value: string | boolean) => {
    setEditedTask(prev => ({ ...prev, [field]: value }));
    debouncedUpdate(field, value);
  };

  const handleBlur = (field: keyof Omit<Task, 'id' | 'priority'>) => {
    debouncedUpdate.flush();
    if (editedTask[field as keyof Task] !== task[field as keyof Task]) {
      handleTaskUpdate(task.id, field, String(editedTask[field as keyof Task]));
    }
  };

  const rowContent = (provided?: DraggableProvided) => (
        <TableRow
      ref={provided?.innerRef}
      {...(provided?.draggableProps || {})}
          className={cn(
            "group",
            task.status === 'done' && "text-muted-foreground line-through"
          )}
        >
      <TableCell style={columnWidths ? { width: `${columnWidths.checkbox}px` } : undefined}>
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggleSelect?.(task.id)}
          aria-label={`Select task ${task.task}`}
        />
      </TableCell>
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
      <TableCell className="text-center" style={columnWidths ? { width: `${columnWidths.today}px` } : undefined}>
            <Checkbox
              id={`cell-${index}-4`}
              checked={!!editedTask.today}
              onCheckedChange={checked => {
                if (process.env.NODE_ENV === 'development') {
                  console.log('Today checkbox changed:', checked, editedTask.id);
                }
                handleChange('today', !!checked);
              }}
              onFocus={() => focusCell(index, 4)}
              aria-label="Mark as today"
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