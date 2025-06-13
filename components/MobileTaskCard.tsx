'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Task } from '@/lib/markdown-parser';
import { Button } from '@/components/ui/button';
import { ArrowUp, ArrowDown, Plus, Copy, X, ChevronUp, ChevronDown } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';

interface MobileTaskCardProps {
  task: Task;
  isFirst: boolean;
  isLast: boolean;
  onUpdate: (id: string, field: keyof Omit<Task, 'id'>, value: string | boolean) => void;
  onDelete: (id: string) => void;
  onAdd: (id: string) => void;
  onDuplicate: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onPriorityChange: (id: string, newPriority: number) => void;
}

const NumberStepper: React.FC<{ value: number | string; onChange: (newValue: number) => void; min?: number; max?: number; }> = ({ value, onChange, min, max }) => (
  <div className="flex items-center gap-1">
    <span>{value}</span>
    <div className="flex flex-col">
      <Button onClick={() => onChange(Math.min(max ?? Infinity, Number(value) + 1))} size="sm" variant="ghost" className="h-4 w-4 p-0"><ChevronUp className="h-3 w-3" /></Button>
      <Button onClick={() => onChange(Math.max(min ?? -Infinity, Number(value) - 1))} size="sm" variant="ghost" className="h-4 w-4 p-0"><ChevronDown className="h-3 w-3" /></Button>
    </div>
  </div>
);

const MobileTaskCard: React.FC<MobileTaskCardProps> = ({ task, isFirst, isLast, onUpdate, onDelete, onAdd, onDuplicate, onMoveUp, onMoveDown, onPriorityChange }) => {
  const [editedTask, setEditedTask] = useState(task);

  useEffect(() => {
    setEditedTask(task);
  }, [task]);

  return (
    <Card className={cn("mb-1", task.status === 'done' && 'bg-muted')}>
      <CardContent className="p-2 space-y-2">
        <Textarea
          value={editedTask.task}
          onChange={(e) => setEditedTask(prev => ({...prev, task: e.target.value}))}
          onBlur={() => {
            if(editedTask.task !== task.task) {
              onUpdate(task.id, 'task', editedTask.task);
            }
          }}
          className={cn(
            "w-full text-sm font-semibold p-1 resize-none border rounded-md shadow-none focus-visible:ring-1",
            task.status === 'done' && 'line-through'
          )}
          rows={Math.max(1, Math.floor(editedTask.task.length / 35))}
        />
        <div className="text-xs text-muted-foreground grid grid-cols-2 gap-x-4 gap-y-1">
          <div className="flex items-center justify-between">
            <strong className="text-foreground">Priority:</strong>
            <NumberStepper value={task.priority} onChange={(newVal) => onPriorityChange(task.id, newVal)} />
          </div>
          <div className="flex items-center justify-between">
            <strong className="text-foreground">Today:</strong>
            <Checkbox
              checked={!!task.today}
              onCheckedChange={checked => onUpdate(task.id, 'today', !!checked)}
            />
          </div>
          <div className="flex items-center justify-between">
            <strong className="text-foreground">Category:</strong>
            <span>{task.category}</span>
          </div>
          <div className="flex items-center justify-between">
            <strong className="text-foreground">Status:</strong>
            <span>{task.status}</span>
          </div>
          <div className="flex items-center justify-between">
            <strong className="text-foreground">Effort:</strong>
            <NumberStepper value={task.effort} onChange={(newVal) => onUpdate(task.id, 'effort', String(newVal))} min={1} max={10} />
          </div>
          <div className="flex items-center justify-between">
            <strong className="text-foreground">Criticality:</strong>
            <NumberStepper value={task.criticality} onChange={(newVal) => onUpdate(task.id, 'criticality', String(newVal))} min={1} max={3} />
          </div>
        </div>
        <div className="pt-1 border-t flex items-center justify-end gap-0">
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