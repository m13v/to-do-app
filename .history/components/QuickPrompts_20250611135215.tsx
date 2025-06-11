'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Pencil, Trash2 } from 'lucide-react';

interface QuickPrompt {
  id: string;
  title: string;
  prompt: string;
}

interface QuickPromptsProps {
  onPromptSelect: (prompt: string) => void;
}

const initialPrompts: QuickPrompt[] = [
    { id: '1', title: 'Create Table', prompt: "i have categories of tasks in capital letter followed by list of tasks attributed to this category, convert the task list into a table where first column is the cateogry, and second is the task. Do not make any changes to task names. Only create this table" },
    { id: '2', title: 'Consolidate Categories', prompt: "Are any of the categories seems repetative, can we cut the number of categories by 3 pieces?" },
    { id: '3', title: 'Improve Categories', prompt: "Are the category names good? Each cateogry should be 2 words or less, can you improve the names?" },
    { id: '4', title: 'Find Misaligned', prompt: "Are any of crucial categories are totally misaligned with tasks? Create then, but not more than 1-3 categories, 2 words or less for each" },
    { id: '5', title: 'Format Table', prompt: "Can you format md file so it looks like a table where each column is vertically aligned?" },
    { id: '6', title: 'Reassign Categories', prompt: "Then review the categories list, review each task and check if the category is assigned correctly, if category needs to change, create a new second column \"new category assignment\" and put there category you'd like to change it to. Do NOT create new cateogires, only use existing ones from my list" },
    { id: '7', title: 'Estimate Effort', prompt: "Next: create a new column: effort: and classify each task by it on the scale from 1 to 10, make sure the distribution is subjective but even across all tasks distributing them across the entire scale from 1 to 10, even amount for each grade." },
    { id: '8', title: 'Estimate Criticality', prompt: "Next: create a new column: criticality: and classify each task by it on the scale from 1 to 3, make distribution even" },
];

export default function QuickPrompts({ onPromptSelect }: QuickPromptsProps) {
  const [prompts, setPrompts] = useState<QuickPrompt[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<QuickPrompt | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newPrompt, setNewPrompt] = useState('');

  useEffect(() => {
    const storedPrompts = localStorage.getItem('quickPrompts');
    if (storedPrompts) {
      setPrompts(JSON.parse(storedPrompts));
    } else {
      setPrompts(initialPrompts);
    }
  }, []);

  useEffect(() => {
    if (prompts.length > 0) {
        localStorage.setItem('quickPrompts', JSON.stringify(prompts));
    }
  }, [prompts]);

  const handleEdit = (prompt: QuickPrompt) => {
    setEditingPrompt(prompt);
    setNewTitle(prompt.title);
    setNewPrompt(prompt.prompt);
    setIsDialogOpen(true);
  };

  const handleAddNew = () => {
    setEditingPrompt(null);
    setNewTitle('');
    setNewPrompt('');
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setPrompts(prompts.filter((p) => p.id !== id));
  };

  const handleSave = () => {
    if (editingPrompt) {
      setPrompts(
        prompts.map((p) =>
          p.id === editingPrompt.id ? { ...p, title: newTitle, prompt: newPrompt } : p
        )
      );
    } else {
      setPrompts([...prompts, { id: Date.now().toString(), title: newTitle, prompt: newPrompt }]);
    }
    setIsDialogOpen(false);
  };

  return (
    <TooltipProvider>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {prompts.map((prompt) => (
          <div key={prompt.id} className="group relative">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={() => onPromptSelect(prompt.prompt)}>
                  {prompt.title}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">{prompt.prompt}</p>
              </TooltipContent>
            </Tooltip>
            <div className="absolute top-0 right-0 -mt-2 -mr-2 hidden group-hover:flex gap-1">
              <Button size="icon" variant="ghost" className="h-5 w-5 rounded-full bg-white" onClick={() => handleEdit(prompt)}>
                <Pencil className="h-3 w-3" />
              </Button>
              <Button size="icon" variant="ghost" className="h-5 w-5 rounded-full bg-white" onClick={() => handleDelete(prompt.id)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={handleAddNew}>
          <Plus className="h-4 w-4 mr-1" />
          New
        </Button>
      </div>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPrompt ? 'Edit Prompt' : 'Add New Prompt'}</DialogTitle>
            <DialogDescription>
              {editingPrompt ? 'Edit the title and prompt below.' : 'Create a new quick prompt for the AI assistant.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Input
              placeholder="Button Title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
            <Textarea
              placeholder="AI Prompt"
              value={newPrompt}
              onChange={(e) => setNewPrompt(e.target.value)}
              rows={5}
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost">Cancel</Button>
            </DialogClose>
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
} 