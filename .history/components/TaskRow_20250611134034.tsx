import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { Task } from '@/lib/markdown-parser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { TableRow, TableCell } from '@/components/ui/table';
import { GripVertical, Plus, Copy, X } from 'lucide-react';

interface TaskRowProps {
  task: Task & { originalIndex: number };
  index: number;
  handleTaskUpdate: (index: number, field: keyof Task, value: string) => void;
  handleSaveChanges: (tasks: Task[]) => void;
  handleAddTask: (index: number) => void;
  handleDuplicateTask: (index: number) => void;
  handleDeleteTask: (index: number) => void;
  tasks: Task[];
}

const TaskRow = React.memo(({
  task,
  index,
  handleTaskUpdate,
  handleSaveChanges,
  handleAddTask,
  handleDuplicateTask,
  handleDeleteTask,
  tasks,
}: TaskRowProps) => {
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
              value={task.category}
              onChange={(e) => handleTaskUpdate(task.originalIndex, 'category', e.target.value)}
              onBlur={() => handleSaveChanges(tasks)}
              className="h-7 py-0"
            />
          </TableCell>
          <TableCell className="py-1 px-2">
            <Textarea
              value={task.task}
              onChange={(e) => handleTaskUpdate(task.originalIndex, 'task', e.target.value)}
              onBlur={() => handleSaveChanges(tasks)}
              className="min-h-[28px] py-0.5 resize-none"
              rows={1}
            />
          </TableCell>
          <TableCell className="py-1 px-2">
            <Input
              value={task.status}
              onChange={(e) => handleTaskUpdate(task.originalIndex, 'status', e.target.value)}
              onBlur={() => handleSaveChanges(tasks)}
              className="h-7 py-0"
            />
          </TableCell>
          <TableCell className="py-1 px-2">
            <Input
              value={task.done}
              onChange={(e) => handleTaskUpdate(task.originalIndex, 'done', e.target.value)}
              onBlur={() => handleSaveChanges(tasks)}
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