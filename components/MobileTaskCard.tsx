'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Task } from '@/lib/markdown-parser';
import { Button } from '@/components/ui/button';
import { Plus, X } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import NumberStepper from './NumberStepper';

interface MobileTaskCardProps {
  task: Task;
  onUpdate: (id: string, field: keyof Omit<Task, 'id'> | 'today', value: string | boolean) => void;
  onDelete: (id: string) => void;
  onAdd: (id: string) => void;
  onPriorityChange: (id: string, newPriority: number) => void;
}

const MobileTaskCard: React.FC<MobileTaskCardProps> = ({ task, onUpdate, onDelete, onAdd, onPriorityChange }) => {
  const [editedTask, setEditedTask] = useState(task);

  useEffect(() => {
    setEditedTask(task);
  }, [task]);

  return (
    <Card className={cn("mb-1 rounded-md", task.status === 'done' && 'bg-muted')}>
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
            <NumberStepper title="Priority:" value={task.priority} onChange={(newVal) => onPriorityChange(task.id, newVal)} />
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
            <Input
                value={editedTask.category}
                onChange={(e) => setEditedTask(prev => ({...prev, category: e.target.value}))}
                onBlur={() => onUpdate(task.id, 'category', editedTask.category)}
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
                <SelectItem value="done">Done</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2">
           <Button onClick={() => onAdd(task.id)} size="sm" variant="ghost" className="h-6 px-2">
             <Plus className="h-4 w-4 mr-1" />
             Add
            </Button>
           <Button onClick={() => onDelete(task.id)} size="sm" variant="ghost" className="h-6 px-2">
             <X className="h-4 w-4 mr-1" />
             Delete
            </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default MobileTaskCard; 