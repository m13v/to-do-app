import React, { useState, useEffect } from 'react';
import { Draggable, DraggableProvided } from '@hello-pangea/dnd';
import { Task } from '@/lib/markdown-parser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { TableRow, TableCell } from '@/components/ui/table';
import { GripVertical, Plus, Copy, X, ArrowUp, ArrowDown } from 'lucide-react';
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

interface TaskRowProps {
  task: Task;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  isDraggable?: boolean;
  handleTaskUpdate: (id: string, field: keyof Omit<Task, 'id' | 'priority'>, value: string | boolean) => void;
  handlePriorityChange: (id: string, priority: number) => void;
  handleAddTask: (id: string) => void;
  handleDuplicateTask: (id: string) => void;
  handleDeleteTask: (id: string) => void;
  handleMoveTaskUp: (id: string) => void;
  handleMoveTaskDown: (id: string) => void;
  focusCell: (rowIndex: number, colIndex: number) => void;
}

const TaskRow: React.FC<TaskRowProps> = ({
  task,
  index,
  isFirst,
  isLast,
  isDraggable = true,
  handleTaskUpdate,
  handlePriorityChange,
  handleAddTask,
  handleDuplicateTask,
  handleDeleteTask,
  handleMoveTaskUp,
  handleMoveTaskDown,
  focusCell,
}) => {
  const [editedTask, setEditedTask] = useState(task);

  const numCols = 4; // Category, Status, Task, Today

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>, colIndex: number) => {
    const target = e.target as HTMLInputElement | HTMLTextAreaElement;
    
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      focusCell(Math.max(0, index - 1), colIndex);
    } else if (e.key === 'ArrowDown') {
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
    (field: keyof Omit<Task, 'id' | 'priority'>, value: string | boolean) => {
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
    if (editedTask[field] !== task[field]) {
      handleTaskUpdate(task.id, field, String(editedTask[field]));
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
      <TableCell {...(provided?.dragHandleProps || {})} className="cursor-grab px-0.5">
        {isDraggable ? <GripVertical className="h-4 w-4" /> : <div className="w-4" />}
          </TableCell>
      <TableCell className="py-0.5 px-0.5">
        <Input
          type="number"
          value={editedTask.priority}
          onChange={(e) => {
            setEditedTask(prev => ({ ...prev, priority: parseInt(e.target.value, 10) || 0 }));
          }}
          onBlur={() => {
            if (editedTask.priority !== task.priority) {
              handlePriorityChange(task.id, editedTask.priority);
            }
          }}
          className="h-6 py-0 text-center"
        />
          </TableCell>
      <TableCell className="font-medium py-0.5 px-0">
            <Input
              id={`cell-${index}-0`}
              value={editedTask.category}
              onChange={(e) => handleChange('category', e.target.value)}
              onBlur={() => handleBlur('category')}
              onKeyDown={(e) => handleKeyDown(e, 0)}
          className="h-6 py-0 px-1"
            />
          </TableCell>
      <TableCell className="py-0.5 px-1">
            <Select value={editedTask.status} onValueChange={(value) => handleChange('status', value)}>
          <SelectTrigger id={`cell-${index}-1`} onFocus={() => focusCell(index, 1)} className="h-6 py-0 px-2">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="to_do">To Do</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="done">Done</SelectItem>
              </SelectContent>
            </Select>
          </TableCell>
      <TableCell className="py-0.5 px-1">
            <Textarea
              id={`cell-${index}-2`}
              value={editedTask.task}
              onChange={(e) => handleChange('task', e.target.value)}
              onBlur={() => handleBlur('task')}
              onKeyDown={(e) => handleKeyDown(e, 2)}
          className="min-h-[24px] py-0.5 resize-none"
              rows={1}
            />
          </TableCell>
      <TableCell className="py-0.5 px-1 text-center">
            <Checkbox
              id={`cell-${index}-3`}
              checked={!!editedTask.today}
              onCheckedChange={checked => {
                if (process.env.NODE_ENV === 'development') {
                  console.log('Today checkbox changed:', checked, editedTask.id);
                }
                handleChange('today', !!checked);
              }}
              onFocus={() => focusCell(index, 3)}
              aria-label="Mark as today"
            />
          </TableCell>
      <TableCell className="py-0.5 px-0 text-right">
        <div className="flex items-center justify-end gap-0">
              <Button
                onClick={() => handleMoveTaskUp(task.id)}
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                title="Move up"
                disabled={isFirst}
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => handleMoveTaskDown(task.id)}
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                title="Move down"
                disabled={isLast}
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => handleAddTask(task.id)}
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                title="Add task below"
              >
                <Plus className="h-3 w-3" />
              </Button>
              <Button
                onClick={() => handleDuplicateTask(task.id)}
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                title="Duplicate"
              >
                <Copy className="h-3 w-3" />
              </Button>
              <Button
                onClick={() => handleDeleteTask(task.id)}
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
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