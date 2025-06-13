'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Task } from '@/lib/markdown-parser';
import { Button } from '@/components/ui/button';
import { ArrowUp, ArrowDown, Plus, Copy, X } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';

interface MobileTaskCardProps {
  task: Task;
  isFirst: boolean;
  isLast: boolean;
  onUpdate: (id: string, field: keyof Omit<Task, 'id' | 'priority'>, value: string | boolean) => void;
  onDelete: (id: string) => void;
  onAdd: (id: string) => void;
  onDuplicate: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
}

const MobileTaskCard: React.FC<MobileTaskCardProps> = ({ task, isFirst, isLast, onUpdate, onDelete, onAdd, onDuplicate, onMoveUp, onMoveDown }) => {
  const [editedTask, setEditedTask] = useState(task);

  useEffect(() => {
    setEditedTask(task);
  }, [task]);

  return (
    <Card className={cn("mb-1", task.status === 'done' && 'bg-muted')}>
      <CardContent className="p-2">
        <Textarea
          value={editedTask.task}
          onChange={(e) => setEditedTask(prev => ({...prev, task: e.target.value}))}
          onBlur={() => {
            if(editedTask.task !== task.task) {
              onUpdate(task.id, 'task', editedTask.task);
            }
          }}
          className={cn(
            "w-full text-sm font-semibold p-1 resize-none border-0 shadow-none focus-visible:ring-0",
            task.status === 'done' && 'line-through'
          )}
          rows={Math.max(1, Math.floor(editedTask.task.length / 35))}
        />
        <div className="text-xs text-muted-foreground mt-1 grid grid-cols-2 gap-x-2 gap-y-1">
          <div className="flex items-center gap-1">
            <strong className="text-foreground">P:</strong>
            <span>{task.priority}</span>
          </div>
          <div className="flex items-center gap-1">
            <strong className="text-foreground">Today:</strong>
            <Checkbox
              checked={!!task.today}
              onCheckedChange={checked => onUpdate(task.id, 'today', !!checked)}
              className="ml-1"
            />
          </div>
          <div><strong className="text-foreground">Category:</strong> {task.category}</div>
          <div><strong className="text-foreground">Status:</strong> {task.status}</div>
          <div><strong className="text-foreground">Effort:</strong> {task.effort}</div>
          <div><strong className="text-foreground">Crit:</strong> {task.criticality}</div>
        </div>
        <div className="mt-1 pt-1 border-t flex items-center justify-end gap-0">
           <Button onClick={() => onMoveUp(task.id)} size="sm" variant="ghost" className="h-6 w-6 p-0" disabled={isFirst}><ArrowUp className="h-4 w-4" /></Button>
           <Button onClick={() => onMoveDown(task.id)} size="sm" variant="ghost" className="h-6 w-6 p-0" disabled={isLast}><ArrowDown className="h-4 w-4" /></Button>
           <Button onClick={() => onAdd(task.id)} size="sm" variant="ghost" className="h-6 w-6 p-0"><Plus className="h-4 w-4" /></Button>
           <Button onClick={() => onDuplicate(task.id)} size="sm" variant="ghost" className="h-6 w-6 p-0"><Copy className="h-4 w-4" /></Button>
           <Button onClick={() => onDelete(task.id)} size="sm" variant="ghost" className="h-6 w-6 p-0"><X className="h-4 w-4" /></Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default MobileTaskCard; 