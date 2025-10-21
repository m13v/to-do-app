'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Settings } from 'lucide-react';

interface QuickPrompt {
  id: string;
  title: string;
  prompt: string;
}

const defaultPrompts: QuickPrompt[] = [
  { id: '1', title: 'Consolidate Categories', prompt: "Are any of the categories seem repetative, can we cut the number of categories by 3 pieces?" },
  { id: '2', title: 'Improve Categories Names', prompt: "Are the category names good? Each cateogry should be 2 words or less, can you improve the names?" },
  { id: '3', title: 'Find categories Misaligned', prompt: "Are any of crucial categories are totally misaligned with tasks? Create then, but not more than 1-3 categories, 2 words or less for each" },
  { id: '6', title: "Today's Tasks", prompt: "Select today's most critical 10 tasks total from different categories. Include a mix of recently added tasks and a couple of older tasks. Mark these tasks by setting their 'Today' column to 'yes'. Prioritize tasks that are most important and urgent. Do not select more than 10 tasks. Do not modify anything else." },
];

interface QuickPromptsProps {
  onPromptSelect: (prompt: string) => void;
}

const QuickPrompts: React.FC<QuickPromptsProps> = ({ onPromptSelect }) => {
  const [prompts, setPrompts] = useState<QuickPrompt[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editedPrompts, setEditedPrompts] = useState<QuickPrompt[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPrompts = useCallback(async () => {
    try {
      const localPrompts = localStorage.getItem('quickPrompts');
      if (localPrompts) {
        setPrompts(JSON.parse(localPrompts));
      }

      const response = await fetch('/api/prompts');
      if (response.ok) {
        const serverPrompts = await response.json();
        if (serverPrompts.length > 0) {
          setPrompts(serverPrompts);
          localStorage.setItem('quickPrompts', JSON.stringify(serverPrompts));
        } else if (!localPrompts) {
          setPrompts(defaultPrompts);
        }
      } else if (!localPrompts) {
        setPrompts(defaultPrompts);
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to fetch prompts, using defaults/local', error);
      }
      if (!localStorage.getItem('quickPrompts')) {
        setPrompts(defaultPrompts);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrompts();
  }, [fetchPrompts]);

  const handleOpenDialog = () => {
    setEditedPrompts(JSON.parse(JSON.stringify(prompts)));
    setIsDialogOpen(true);
  };

  const handleSavePrompts = async () => {
    setPrompts(editedPrompts);
    localStorage.setItem('quickPrompts', JSON.stringify(editedPrompts));
    setIsDialogOpen(false);

    await fetch('/api/prompts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editedPrompts),
    });
  };

  const handlePromptChange = (index: number, field: 'title' | 'prompt', value: string) => {
    const newPrompts = [...editedPrompts];
    newPrompts[index] = { ...newPrompts[index], [field]: value };
    setEditedPrompts(newPrompts);
  };

  const handleAddPrompt = () => {
    setEditedPrompts([...editedPrompts, { id: `new-${Date.now()}`, title: 'New Prompt', prompt: '' }]);
  };

  const handleDeletePrompt = (index: number) => {
    const newPrompts = [...editedPrompts];
    newPrompts.splice(index, 1);
    setEditedPrompts(newPrompts);
  };

  const handleRestoreDefaults = () => {
    if (window.confirm("Are you sure you want to restore the default prompts? This will overwrite your custom prompts.")) {
      setEditedPrompts(defaultPrompts);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-wrap gap-2 mb-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-gray-200 dark:bg-gray-700 h-8 w-36 rounded-md animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {prompts.map(prompt => (
          <Button
            key={prompt.id}
            variant="outline"
            size="sm"
            onClick={() => onPromptSelect(prompt.prompt)}
            className="text-xs"
          >
            {prompt.title}
          </Button>
        ))}
        <Button variant="ghost" size="sm" onClick={handleOpenDialog} className="h-8 w-8 p-0">
          <Settings className="h-4 w-4" />
        </Button>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Manage Quick Prompts</DialogTitle>
            <DialogDescription>
              Add, edit, or delete your custom AI prompts.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto p-1 space-y-4">
            {editedPrompts.map((prompt, index) => (
              <div key={index} className="flex items-start gap-2 p-3 border rounded-md">
                <div className="flex-grow space-y-2">
                  <Input
                    placeholder="Prompt Title"
                    value={prompt.title}
                    onChange={(e) => handlePromptChange(index, 'title', e.target.value)}
                  />
                  <Textarea
                    placeholder="Prompt content..."
                    value={prompt.prompt}
                    onChange={(e) => handlePromptChange(index, 'prompt', e.target.value)}
                    rows={3}
                  />
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleDeletePrompt(index)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <DialogFooter className="flex justify-between items-center">
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleAddPrompt}>
                <Plus className="h-4 w-4 mr-2" />
                Add Prompt
              </Button>
              <Button variant="secondary" onClick={handleRestoreDefaults}>
                Restore Defaults
              </Button>
            </div>
            <div>
              <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSavePrompts}>Save</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default QuickPrompts; 