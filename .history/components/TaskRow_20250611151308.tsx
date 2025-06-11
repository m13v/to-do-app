import React, { useState, useEffect } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { Task } from '@/lib/markdown-parser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { TableRow, TableCell } from '@/components/ui/table';
import { GripVertical, Plus, Copy, X } from 'lucide-react';
import { useDebouncedCallback } from 'use-debounce';
import { Checkbox } from '@/components/ui/checkbox';

interface TaskRowProps {
  task: Task;
  index: number;
  handleTaskUpdate: (id: string, field: keyof Omit<Task, 'id'>, value: string) => void;
  handleAddTask: (id: string) => void;
  handleDuplicateTask: (id: string) => void;
  handleDeleteTask: (id: string) => void;
}

const TaskRow: React.FC<TaskRowProps> = ({
  task,
  index,
  handleTaskUpdate,
  handleAddTask,
  handleDuplicateTask,
  handleDeleteTask,
}) => {
  const [editedTask, setEditedTask] = useState(task);

  useEffect(() => {
    setEditedTask(task);
  }, [task]);

  const debouncedUpdate = useDebouncedCallback(
    (field: keyof Omit<Task, 'id'>, value: string) => {
      handleTaskUpdate(task.id, field, value);
    },
    300
  );

  const handleChange = (field: keyof Omit<Task, 'id'>, value: string) => {
    setEditedTask(prev => ({ ...prev, [field]: value }));
    debouncedUpdate(field, value);
  };

  const handleBlur = (field: keyof Omit<Task, 'id'>) => {
    debouncedUpdate.flush();
    if (editedTask[field] !== task[field]) {
      handleTaskUpdate(task.id, field, editedTask[field]);
    }
  };

  return (
    <Draggable key={task.id} draggableId={task.id} index={index}>
      {(provided) => (
        <TableRow
          ref={provided.innerRef}
          {...provided.draggableProps}
          className="group"
        >
          <TableCell {...provided.dragHandleProps} className="cursor-grab px-1">
            <GripVertical className="h-4 w-4" />
          </TableCell>
          <TableCell className="py-1 px-1">
            {index + 1}
          </TableCell>
          <TableCell className="font-medium py-1 px-1">
            <Input
              value={editedTask.category}
              onChange={(e) => handleChange('category', e.target.value)}
              onBlur={() => handleBlur('category')}
              className="h-7 py-0"
            />
          </TableCell>
          <TableCell className="py-1 px-1">
            <Input
              value={editedTask.status}
              onChange={(e) => handleChange('status', e.target.value)}
              onBlur={() => handleBlur('status')}
              className="h-7 py-0 text-center"
              title={editedTask.status}
            />
          </TableCell>
          <TableCell className="py-1 px-1 text-center">
            <Checkbox
              checked={editedTask.done.trim() !== ''}
              onCheckedChange={(checked) => handleChange('done', checked ? 'x' : '')}
            />
          </TableCell>
          <TableCell className="py-1 px-1">
            <Input
              type="number"
              min="1"
              max="10"
              value={editedTask.effort}
              onChange={(e) => handleChange('effort', e.target.value)}
              onBlur={() => handleBlur('effort')}
              className="h-7 py-0 px-0 text-center"
              placeholder="1-10"
              title={`Effort: ${editedTask.effort}`}
            />
          </TableCell>
          <TableCell className="py-1 px-1">
            <Input
              type="number"
              min="1"
              max="3"
              value={editedTask.criticality}
              onChange={(e) => handleChange('criticality', e.target.value)}
              onBlur={() => handleBlur('criticality')}
              className="h-7 py-0 px-0 text-center"
              placeholder="1-3"
              title={`Criticality: ${editedTask.criticality}`}
            />
          </TableCell>
          <TableCell className="py-1 px-1">
            <Textarea
              value={editedTask.task}
              onChange={(e) => handleChange('task', e.target.value)}
              onBlur={() => handleBlur('task')}
              className="min-h-[28px] py-0.5 resize-none"
              rows={1}
            />
          </TableCell>
          <TableCell className="py-1 px-1 text-right">
            <div className="flex items-center justify-end gap-0.5">
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
      )}
    </Draggable>
  );
};

TaskRow.displayName = 'TaskRow';

export default React.memo(TaskRow); 