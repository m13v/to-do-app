'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Sparkles, Send, ArrowUpDown, ArrowUp, ArrowDown, Search } from 'lucide-react';
import { DragDropContext, Droppable, DropResult } from '@hello-pangea/dnd';
import { parseMarkdownTable, tasksToMarkdown, insertTaskAt, deleteTask, Task } from '@/lib/markdown-parser';
import TaskRow from '@/components/TaskRow';
import QuickPrompts from '@/components/QuickPrompts';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

type SortField = 'number' | 'category' | 'task';
type SortDirection = 'asc' | 'desc';

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [prompt, setPrompt] = useState('');
  const [processingAI, setProcessingAI] = useState(false);
  const [aiGeneratedContent, setAiGeneratedContent] = useState<string | null>(null);
  const [lastGoodState, setLastGoodState] = useState<Task[] | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('number');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const saveTasks = useCallback((updatedTasks: Task[]) => {
    try {
      console.log('Saving tasks to localStorage...');
      const markdown = tasksToMarkdown(updatedTasks);
      localStorage.setItem('markdownContent', markdown);
    } catch (error) {
      console.error('Error saving tasks to localStorage:', error);
    }
  }, []);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const storedMarkdown = localStorage.getItem('markdownContent');
      if (storedMarkdown) {
        const parsedTasks = parseMarkdownTable(storedMarkdown);
        setTasks(parsedTasks);
      } else {
        const response = await fetch('/task_categories_table.md');
        const initialMarkdown = await response.text();
        const parsedTasks = parseMarkdownTable(initialMarkdown);
        setTasks(parsedTasks);
        localStorage.setItem('markdownContent', initialMarkdown);
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    if (loading) return;
    const handler = setTimeout(() => {
      saveTasks(tasks);
    }, 500);
    return () => clearTimeout(handler);
  }, [tasks, loading, saveTasks]);

  const handleAIPrompt = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setProcessingAI(true);
    setLastGoodState(tasks);

    const systemPrompt = `You are an AI assistant helping to manage a todo list in a markdown file. The file content is a markdown table.
The table has the following columns: | Category | Task | Status | Done |
The user will provide a prompt to modify the content.
You must return the full markdown content, including the header.
Do not change the table structure. Do not add or remove columns.
Do not add any text outside of the markdown table.
Your response will be parsed by the application, so it's critical to maintain the format.`;

    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemPrompt,
          userPrompt: `${prompt}\n\n${tasksToMarkdown(tasks)}`,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response from AI');
      }

      const data = await response.json();
      const parsed = parseMarkdownTable(data.content);

      if (parsed.length === 0 && data.content.trim() !== '') {
        throw new Error('AI response is not a valid markdown table.');
      }
      
      setAiGeneratedContent(data.content);

    } catch (error) {
      console.error('Error processing AI prompt:', error);
      // You could show an error toast here
    } finally {
      setProcessingAI(false);
    }
  }, [prompt, tasks]);

  const handleConfirmAIChanges = () => {
    if (aiGeneratedContent) {
      const parsedTasks = parseMarkdownTable(aiGeneratedContent);
      setTasks(parsedTasks);
      saveTasks(parsedTasks);
      setAiGeneratedContent(null);
    }
  };

  const handleCancelAIChanges = () => {
    setAiGeneratedContent(null);
  };
  
  const handleRevert = () => {
    if (lastGoodState) {
      setTasks(lastGoodState);
      saveTasks(lastGoodState);
      setLastGoodState(null);
    }
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || result.destination.index === result.source.index) {
      return;
    }

    const newTasks = Array.from(tasks);
    
    const sourceItem = sortedTasks[result.source.index];
    const sourceIndex = newTasks.indexOf(sourceItem);
    
    const [movedItem] = newTasks.splice(sourceIndex, 1);
    
    let destinationIndex;
    if (result.destination.index === sortedTasks.length) {
        const lastItem = sortedTasks[sortedTasks.length - 1];
        destinationIndex = newTasks.indexOf(lastItem) + 1;
    } else {
        const destinationItem = sortedTasks[result.destination.index];
        destinationIndex = newTasks.indexOf(destinationItem);
    }

    newTasks.splice(destinationIndex, 0, movedItem);

    setTasks(newTasks);
    saveTasks(newTasks);
  };

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    handleAIPrompt(e);
  }, [handleAIPrompt]);

  const handleTaskUpdate = useCallback((index: number, field: keyof Task, value: string) => {
    setTasks(currentTasks =>
      currentTasks.map((task, i) =>
        i === index ? { ...task, [field]: value } : task
      )
    );
  }, []);
  
  const handleAddTask = useCallback((afterIndex: number) => {
    setTasks(currentTasks => {
      const category = currentTasks[afterIndex]?.category || 'NEW';
      const newTask: Task = { category, task: '', status: 'to_do', done: '' };
      return insertTaskAt(currentTasks, afterIndex, newTask);
    });
  }, []);

  const handleDeleteTask = useCallback((index: number) => {
    setTasks(currentTasks => deleteTask(currentTasks, index));
  }, []);

  const handleDuplicateTask = useCallback((index: number) => {
    setTasks(currentTasks => {
      const taskToDuplicate = currentTasks[index];
      const duplicatedTask = { ...taskToDuplicate };
      return insertTaskAt(currentTasks, index, duplicatedTask);
    });
  }, []);

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField, sortDirection]);

  const filteredTasks = useMemo(() => tasks.filter(task => 
    task.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    task.task.toLowerCase().includes(searchQuery.toLowerCase())
  ), [tasks, searchQuery]);

  const sortedTasks = useMemo(() => {
    const tasksWithOriginalIndex = filteredTasks.map(task => ({
      ...task,
      originalIndex: tasks.indexOf(task)
    }));

    tasksWithOriginalIndex.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'number':
          comparison = a.originalIndex - b.originalIndex;
          break;
        case 'category':
          comparison = a.category.localeCompare(b.category);
          break;
        case 'task':
          comparison = a.task.localeCompare(b.task);
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return tasksWithOriginalIndex;
  }, [filteredTasks, sortField, sortDirection, tasks]);


  const getSortIcon = useCallback((field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3" />;
    return sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  }, [sortField, sortDirection]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full px-2 py-2">
      <div className="z-10 bg-white dark:bg-gray-900">
        <Card className="mb-3">
          <CardHeader className="py-2">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Sparkles className="h-4 w-4 text-purple-600" />
                AI Assistant
              </div>
              <form onSubmit={handleSubmit} className="flex gap-2 flex-1 ml-4">
                <Textarea
                  placeholder="Ask the AI to modify your tasks..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="min-h-[36px] h-9 py-1.5 resize-none"
                  rows={1}
                  disabled={processingAI}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                />
                <Button type="submit" disabled={processingAI || !prompt.trim()} size="sm">
                  {processingAI ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Send className="h-3 w-3" />
                  )}
                </Button>
              </form>
            </CardTitle>
          </CardHeader>
        </Card>

        <QuickPrompts onPromptSelect={setPrompt} />

        <div className="mb-3 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
          {lastGoodState && (
            <Button onClick={handleRevert} variant="outline" size="sm">
              Revert Last Change
            </Button>
          )}
          <div className="text-sm text-gray-500">
            {filteredTasks.length} of {tasks.length} tasks
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="py-2">
          <CardTitle className="text-sm">Task Categories ({filteredTasks.length} tasks)</CardTitle>
        </CardHeader>
        <CardContent className="py-2">
          <div className="overflow-x-auto">
            <DragDropContext onDragEnd={handleDragEnd}>
              <Table className="table-fixed w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead 
                      className="w-[60px] cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={() => handleSort('number')}
                    >
                      <div className="flex items-center gap-1">
                        # {getSortIcon('number')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="w-[150px] cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={() => handleSort('category')}
                    >
                      <div className="flex items-center gap-1">
                        Category {getSortIcon('category')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="w-auto cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={() => handleSort('task')}
                    >
                      <div className="flex items-center gap-1">
                        Task {getSortIcon('task')}
                      </div>
                    </TableHead>
                    <TableHead className="w-[120px]">Status</TableHead>
                    <TableHead className="w-[80px]">Done</TableHead>
                    <TableHead className="w-[120px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <Droppable droppableId="tasks">
                  {(provided) => (
                    <TableBody ref={provided.innerRef} {...provided.droppableProps}>
                      {sortedTasks.map((task, index) => (
                        <TaskRow
                          key={task.originalIndex}
                          task={task}
                          index={index}
                          handleTaskUpdate={handleTaskUpdate}
                          handleAddTask={handleAddTask}
                          handleDuplicateTask={handleDuplicateTask}
                          handleDeleteTask={handleDeleteTask}
                        />
                      ))}
                      {provided.placeholder}
                    </TableBody>
                  )}
                </Droppable>
              </Table>
            </DragDropContext>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!aiGeneratedContent} onOpenChange={(isOpen) => !isOpen && setAiGeneratedContent(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Confirm AI Changes</DialogTitle>
            <DialogDescription>
              Review the changes below. The left side is the current version, and the right side is the AI-generated version.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto">
            <div>
              <h3 className="font-bold mb-2">Current</h3>
              <pre className="text-xs p-2 bg-gray-100 rounded">{tasksToMarkdown(tasks)}</pre>
            </div>
            <div>
              <h3 className="font-bold mb-2">Proposed</h3>
              <pre className="text-xs p-2 bg-gray-100 rounded">{aiGeneratedContent}</pre>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={handleCancelAIChanges}>Cancel</Button>
            <Button onClick={handleConfirmAIChanges}>Confirm and Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
