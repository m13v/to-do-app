'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Task } from '@/lib/markdown-parser';
import { Button } from '@/components/ui/button';
import { Plus, X, ChevronDown, ChevronUp, GripVertical } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import NumberStepper from './NumberStepper';
import { Draggable, DraggableProvided } from '@hello-pangea/dnd';

interface MobileTaskCardProps {
  task: Task;
  index: number;
  onUpdate: (id: string, field: keyof Omit<Task, 'id'> | 'today', value: string | boolean) => void;
  onDelete: (id: string) => void;
  onAdd: (id: string) => void;
  onPriorityChange: (id: string, newPriority: number) => void;
  isSelected?: boolean;
  onToggleSelect?: (taskId: string) => void;
  isDraggable?: boolean;
}

const MobileTaskCard: React.FC<MobileTaskCardProps> = ({ 
  task, 
  index, 
  onUpdate, 
  onDelete, 
  onAdd, 
  onPriorityChange, 
  isSelected = false, 
  onToggleSelect,
  isDraggable = true
}) => {
  const [editedTask, setEditedTask] = useState(task);
  // Collapse state for the metadata section
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    setEditedTask(task);
  }, [task]);

  const cardContent = (provided?: DraggableProvided) => (
    <Card 
      className={cn("mb-1 rounded-md", task.status === 'done' && 'bg-muted')}
      ref={provided?.innerRef}
      {...(provided?.draggableProps || {})}
    >
      <CardContent className="p-2 space-y-2">
        <div className="flex items-start gap-1">
          <div {...(provided?.dragHandleProps || {})} className="cursor-grab active:cursor-grabbing mt-1">
            {isDraggable ? <GripVertical className="h-4 w-4 text-muted-foreground" /> : <div className="w-4" />}
          </div>
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggleSelect?.(task.id)}
            aria-label={`Select task ${task.task}`}
            className="mt-1"
          />
          <Textarea
            value={editedTask.task}
            onChange={(e) => setEditedTask(prev => ({...prev, task: e.target.value}))}
            onBlur={() => {
              if(editedTask.task !== task.task) {
                onUpdate(task.id, 'task', editedTask.task);
              }
            }}
            onKeyDown={(e) => {
              // Enter without Shift creates a new task (Shift+Enter adds new line)
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                // Save any pending changes first
                if(editedTask.task !== task.task) {
                  onUpdate(task.id, 'task', editedTask.task);
                }
                // Create new task (same as clicking Plus icon)
                onAdd(task.id);
              }
            }}
            className={cn(
              "flex-1 text-sm font-semibold p-1 resize-none border rounded-md shadow-none focus-visible:ring-1",
              task.status === 'done' && 'line-through'
            )}
            rows={Math.max(1, Math.floor(editedTask.task.length / 35))}
          />
          <Button
            onClick={() => setIsCollapsed(!isCollapsed)}
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 flex-shrink-0"
            aria-label={isCollapsed ? "Expand details" : "Collapse details"}
          >
            {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </Button>
        </div>
        {!isCollapsed && (
          <div className="text-xs text-muted-foreground grid grid-cols-2 gap-x-4 gap-y-1">
          <div className="flex items-center justify-between">
            <NumberStepper
              title="Priority:"
              value={editedTask.priority}
              onChange={(newVal) => {
                setEditedTask(prev => ({ ...prev, priority: newVal }));
                // Immediately update priority when buttons are clicked
                onPriorityChange(task.id, newVal);
              }}
              onBlur={() => {
                if (editedTask.priority !== task.priority) {
                  onPriorityChange(task.id, editedTask.priority);
                }
              }}
              showLabels={true}
            />
          </div>
          <div></div>
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
                <SelectItem value="waiting">Waiting</SelectItem>
                <SelectItem value="done">Done</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        )}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2">
            <strong className="text-sm font-medium text-foreground">Today:</strong>
            <Checkbox
              checked={!!task.today}
              onCheckedChange={checked => onUpdate(task.id, 'today', !!checked)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => onAdd(task.id)} size="sm" variant="ghost" className="h-6 px-2">
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
            <Button onClick={() => onDelete(task.id)} size="sm" variant="ghost" className="h-6 px-2">
              <X className="h-4 w-4 mr-1" />
              Delete
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (!isDraggable) {
    return cardContent();
  }

  return (
    <Draggable key={task.id} draggableId={task.id} index={index}>
      {(provided) => cardContent(provided)}
    </Draggable>
  );
};

export default MobileTaskCard; 