import React, { useState, useEffect, useCallback } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { Task } from '@/lib/markdown-parser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { TableRow, TableCell } from '@/components/ui/table';
import { GripVertical, Plus, Copy, X } from 'lucide-react';
import { useDebouncedCallback } from 'use-debounce';

interface TaskRowProps {
  task: Task & { originalIndex: number };
  index: number;
  handleTaskUpdate: (index: number, field: keyof Task, value: string) => void;
  handleAddTask: (index: number) => void;
  handleDuplicateTask: (index: number) => void;
  handleDeleteTask: (index: number) => void;
}

const TaskRow = React.memo(({
  task,
  index,
  handleTaskUpdate,
  handleAddTask,
  handleDuplicateTask,
  handleDeleteTask,
}: TaskRowProps) => {
  const [editedTask, setEditedTask] = useState(task);

  useEffect(() => {
    setEditedTask(task);
  }, [task]);

  const debouncedUpdate = useDebouncedCallback(
    (field: keyof Omit<Task, 'id'>, value: string) => {
      handleTaskUpdate(task.originalIndex, field, value);
    },
    300
  );

  const handleChange = (field: keyof Omit<Task, 'id'>, value: string) => {
    setEditedTask(prev => ({ ...prev, [field]: value }));
    debouncedUpdate(field, value);
  };
  
  const handleBlur = (field: keyof Omit<Task, 'id'>) => {
    debouncedUpdate.flush();
    // Check if the value has actually changed before updating
    if (editedTask[field] !== task[field]) {
      handleTaskUpdate(task.originalIndex, field, editedTask[field]);
    }
  };

  return (
    <Draggable key={task.originalIndex} draggableId={String(task.originalIndex)} index={index}>
      {(provided) => (
        <TableRow
          ref={provided.innerRef}
          {...provided.draggableProps}
          className="group"
        >
          <TableCell {...provided.dragHandleProps} className="cursor-grab">
            <GripVertical className="h-4 w-4" />
          </TableCell>
          <TableCell className="py-1 px-2">
            {task.originalIndex + 1}
          </TableCell>
          <TableCell className="font-medium py-1 px-2">
            <Input
              value={editedTask.category}
              onChange={(e) => handleChange('category', e.target.value)}
              onBlur={() => handleBlur('category')}
              className="h-7 py-0"
            />
          </TableCell>
          <TableCell className="py-1 px-2">
            <Textarea
              value={editedTask.task}
              onChange={(e) => handleChange('task', e.target.value)}
              onBlur={() => handleBlur('task')}
              className="min-h-[28px] py-0.5 resize-none"
              rows={1}
            />
          </TableCell>
          <TableCell className="py-1 px-2">
            <Input
              value={editedTask.status}
              onChange={(e) => handleChange('status', e.target.value)}
              onBlur={() => handleBlur('status')}
              className="h-7 py-0"
            />
          </TableCell>
          <TableCell className="py-1 px-2">
            <Input
              value={editedTask.done}
              onChange={(e) => handleChange('done', e.target.value)}
              onBlur={() => handleBlur('done')}
              className="h-7 py-0"
            />
          </TableCell>
          <TableCell className="py-1 px-1 text-right">
            <div className="flex items-center justify-end gap-0.5">
              <Button
                onClick={() => handleAddTask(task.originalIndex)}
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                title="Add task below"
              >
                <Plus className="h-3 w-3" />
              </Button>
              <Button
                onClick={() => handleDuplicateTask(task.originalIndex)}
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                title="Duplicate"
              >
                <Copy className="h-3 w-3" />
              </Button>
              <Button
                onClick={() => handleDeleteTask(task.originalIndex)}
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
      )}
    </Draggable>
  );
});

TaskRow.displayName = 'TaskRow';

export default TaskRow; 