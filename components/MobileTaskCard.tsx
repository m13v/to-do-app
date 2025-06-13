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
    <Card className={cn("mb-2", task.status === 'done' && 'bg-muted')}>
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <div className="flex flex-col items-center pt-1">
            <span className="text-sm font-bold">{task.priority}</span>
            <Checkbox
              checked={!!task.today}
              onCheckedChange={checked => onUpdate(task.id, 'today', !!checked)}
              className="mt-1"
            />
          </div>
          <div className="flex-grow">
            <Textarea
              value={editedTask.task}
              onChange={(e) => {
                setEditedTask(prev => ({...prev, task: e.target.value}));
              }}
              onBlur={() => {
                if(editedTask.task !== task.task) {
                  onUpdate(task.id, 'task', editedTask.task);
                }
              }}
              className={cn("font-semibold min-h-[28px] p-1 resize-none", task.status === 'done' && 'line-through')}
              rows={1}
            />
            <div className="text-xs text-muted-foreground mt-2 flex items-center gap-2 flex-wrap">
              <span><strong className="text-foreground">Category:</strong> {task.category}</span>
              <span><strong className="text-foreground">Status:</strong> {task.status}</span>
              <span><strong className="text-foreground">Effort:</strong> {task.effort}</span>
              <span><strong className="text-foreground">Crit:</strong> {task.criticality}</span>
            </div>
          </div>
        </div>
        <div className="mt-2 pt-2 border-t flex items-center justify-end gap-1">
           <Button onClick={() => onMoveUp(task.id)} size="sm" variant="ghost" className="h-7 w-7 p-0" disabled={isFirst}><ArrowUp className="h-4 w-4" /></Button>
           <Button onClick={() => onMoveDown(task.id)} size="sm" variant="ghost" className="h-7 w-7 p-0" disabled={isLast}><ArrowDown className="h-4 w-4" /></Button>
           <Button onClick={() => onAdd(task.id)} size="sm" variant="ghost" className="h-7 w-7 p-0"><Plus className="h-4 w-4" /></Button>
           <Button onClick={() => onDuplicate(task.id)} size="sm" variant="ghost" className="h-7 w-7 p-0"><Copy className="h-4 w-4" /></Button>
           <Button onClick={() => onDelete(task.id)} size="sm" variant="ghost" className="h-7 w-7 p-0"><X className="h-4 w-4" /></Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default MobileTaskCard; 