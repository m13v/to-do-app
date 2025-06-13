'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from '@/components/ui/table';
import { Loader2, Sparkles, Send, ArrowUpDown, ArrowUp, ArrowDown, Search, ChevronDown, ChevronRight } from 'lucide-react';
import { DragDropContext, Droppable, DropResult } from '@hello-pangea/dnd';
import { parseMarkdownTable, tasksToMarkdown, insertTaskAt, Task } from '@/lib/markdown-parser';
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useUser, UserButton, SignedIn, SignedOut, SignInButton } from '@clerk/nextjs';
import { Checkbox } from '@/components/ui/checkbox';

type SortField = 'id' | 'category' | 'task' | 'effort' | 'criticality';
type SortDirection = 'asc' | 'desc';

const defaultTasksMarkdown = `# Task Categories Table
| Category | Task | Status | Done | Effort | Criticality |
|---|---|---|---|---|---|
| Welcome | Welcome to your new task manager! | to_do | | 5 | 2 |
| Welcome | Click on any task text to edit it. | to_do | | 1 | 1 |
| Welcome | Use the buttons on the right to add, duplicate, or delete tasks. | to_do | | 1 | 1 |
| Welcome | Drag and drop tasks to reorder them. | to_do | | 2 | 1 |
| Welcome | Use the search bar to filter your tasks. | to_do | | 1 | 1 |
| Welcome | Click on the column headers to sort your list. | to_do | | 1 | 1 |
| Welcome | Set effort from 1-10 to estimate task size. | to_do | | 1 | 2 |
| Welcome | Set criticality from 1-3 to prioritize important work. | to_do | | 1 | 2 |
| Welcome | Use the AI Assistant to manage your tasks with natural language. | to_do | | 3 | 3 |
| Welcome | Delete these welcome tasks when you're ready to start. | to_do | | 1 | 1 |
`;

export default function Home() {
  const { user } = useUser();
  const [activeTasks, setActiveTasks] = useState<Task[]>([]);
  const [doneTasks, setDoneTasks] = useState<Task[]>([]);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [processingAI, setProcessingAI] = useState(false);
  const [aiGeneratedContent, setAiGeneratedContent] = useState<string | null>(null);
  const [lastGoodState, setLastGoodState] = useState<Task[] | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('id');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [syncError, setSyncError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allTasks = useMemo(() => [...activeTasks, ...doneTasks], [activeTasks, doneTasks]);

  const saveTasks = useCallback(async (tasksToSave: Task[]): Promise<boolean> => {
    setSaving(true);
    try {
      // Always save to localStorage first
      const markdown = tasksToMarkdown(tasksToSave);
      localStorage.setItem('markdownContent', markdown);

      // Then try to save to Supabase
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: markdown }),
      });
      if (!response.ok) {
        setSyncError(true);
        if (process.env.NODE_ENV === 'development') {
          console.error('Failed to save tasks to server, but tasks are saved in localStorage');
        }
        return true; // Return true since we saved to localStorage
      }
      setSyncError(false);
      return true;
    } catch (error) {
      setSyncError(true);
      if (process.env.NODE_ENV === 'development') {
        console.error('Error saving tasks to server, but tasks are saved in localStorage:', error);
      }
      return true; // Return true since we saved to localStorage
    } finally {
      setSaving(false);
    }
  }, []);

  const retrySync = useCallback(async () => {
    setSyncError(false);
    await saveTasks(allTasks);
  }, [allTasks, saveTasks]);

  const loadTasks = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    let tasksToLoad: Task[] = [];
    try {
      const storedMarkdown = localStorage.getItem('markdownContent');
      if (storedMarkdown) {
        tasksToLoad = parseMarkdownTable(storedMarkdown);
      } else {
        const response = await fetch('/api/tasks');
        if (response.ok) {
          const data = await response.json();
          if (data && data.content) {
            tasksToLoad = parseMarkdownTable(data.content);
          }
        }
      }
      if (tasksToLoad.length === 0) {
        tasksToLoad = parseMarkdownTable(defaultTasksMarkdown);
      }
    } catch (error) {
      console.error("Failed to load tasks, using defaults:", error);
      tasksToLoad = parseMarkdownTable(defaultTasksMarkdown);
    } finally {
      setActiveTasks(tasksToLoad.filter(t => t.status !== 'done'));
      setDoneTasks(tasksToLoad.filter(t => t.status === 'done'));
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadTasks();
    }
  }, [user, loadTasks]);

  useEffect(() => {
    if (loading || !user || syncError) return;
    const handler = setTimeout(() => {
      saveTasks(allTasks);
    }, 10000);
    return () => clearTimeout(handler);
  }, [allTasks, loading, user, saveTasks, syncError]);

  const handleAIPrompt = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setProcessingAI(true);
    setLastGoodState(allTasks);

    const systemPrompt = `You are an AI assistant helping to manage a todo list in a markdown file. The file content is a markdown table.
The table has the following columns: | Category | Task | Status | Done | Effort | Criticality |
The Effort column contains a number from 1 to 10 representing the effort level of each task.
The Criticality column contains a number from 1 to 3 representing the criticality level of each task.
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
          userPrompt: `${prompt}\n\n${tasksToMarkdown(allTasks)}`,
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
    } finally {
      setProcessingAI(false);
    }
  }, [prompt, allTasks]);

  const handleConfirmAIChanges = () => {
    if (aiGeneratedContent) {
      const parsedTasks = parseMarkdownTable(aiGeneratedContent);
      setActiveTasks(parsedTasks.filter(t => t.status !== 'done'));
      setDoneTasks(parsedTasks.filter(t => t.status === 'done'));
      saveTasks(parsedTasks);
      setAiGeneratedContent(null);
    }
  };

  const handleCancelAIChanges = () => {
    setAiGeneratedContent(null);
  };
  
  const handleRevert = () => {
    if (lastGoodState) {
      setActiveTasks(lastGoodState.filter(t => t.status !== 'done'));
      setDoneTasks(lastGoodState.filter(t => t.status === 'done'));
      saveTasks(lastGoodState);
      setLastGoodState(null);
    }
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || result.destination.index === result.source.index) {
      return;
    }

    const newTasks = Array.from(activeTasks);
    const movedItem = sortedActiveTasks.find((t, i) => i === result.source.index);
    if (!movedItem) return;

    const sourceIndex = newTasks.findIndex(t => t.id === movedItem.id);
    newTasks.splice(sourceIndex, 1);

    const destinationItem = sortedActiveTasks.find((t, i) => i === result.destination!.index);
    const destinationIndex = destinationItem ? newTasks.findIndex(t => t.id === destinationItem.id) : newTasks.length;
    
    newTasks.splice(destinationIndex, 0, movedItem);

    setActiveTasks(newTasks);
    saveTasks([...newTasks, ...doneTasks]);
  };

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    handleAIPrompt(e);
  }, [handleAIPrompt]);

  const handleTaskUpdate = useCallback((id: string, field: keyof Omit<Task, 'id'>, value: string | boolean) => {
    let taskToMove: Task | undefined;
    const updatedActive = [...activeTasks];
    const updatedDone = [...doneTasks];

    const isStatusChangeToDone = field === 'status' && value === 'done';
    const isStatusChangeFromDone = field === 'status' && value !== 'done';

    const activeIndex = activeTasks.findIndex(t => t.id === id);
    const doneIndex = doneTasks.findIndex(t => t.id === id);

    if (isStatusChangeToDone && activeIndex !== -1) {
      [taskToMove] = updatedActive.splice(activeIndex, 1);
      if (taskToMove) {
        taskToMove.status = 'done';
        updatedDone.unshift(taskToMove);
      }
    } else if (isStatusChangeFromDone && doneIndex !== -1) {
      [taskToMove] = updatedDone.splice(doneIndex, 1);
      if (taskToMove) {
        taskToMove.status = value as string;
        updatedActive.push(taskToMove);
      }
    } else {
      if (activeIndex !== -1) {
        updatedActive[activeIndex] = { ...updatedActive[activeIndex], [field]: value };
      } else if (doneIndex !== -1) {
        updatedDone[doneIndex] = { ...updatedDone[doneIndex], [field]: value };
      }
    }
    
    setActiveTasks(updatedActive);
    setDoneTasks(updatedDone);
    saveTasks([...updatedActive, ...updatedDone]);
  }, [activeTasks, doneTasks, saveTasks]);
  
  const handleAddTask = useCallback((afterId: string) => {
    const newTasks = [...activeTasks];
    const afterIndex = newTasks.findIndex(t => t.id === afterId);
    const category = newTasks[afterIndex]?.category || 'NEW';
    const newTask: Task = { id: `${Date.now()}-${Math.random()}`, category, task: '', status: 'to_do', effort: '5', criticality: '2' };
    const updatedTasks = insertTaskAt(newTasks, afterIndex + 1, newTask);
    setActiveTasks(updatedTasks);
    saveTasks([...updatedTasks, ...doneTasks]);
  }, [activeTasks, doneTasks, saveTasks]);

  const handleDeleteTask = useCallback((id: string) => {
    const updatedActive = activeTasks.filter(t => t.id !== id);
    const updatedDone = doneTasks.filter(t => t.id !== id);
    setActiveTasks(updatedActive);
    setDoneTasks(updatedDone);
    saveTasks([...updatedActive, ...updatedDone]);
  }, [activeTasks, doneTasks, saveTasks]);

  const handleDuplicateTask = useCallback((id: string) => {
    const newTasks = [...activeTasks];
    const taskToDuplicate = newTasks.find(t => t.id === id);
    if (taskToDuplicate) {
      const index = newTasks.findIndex(t => t.id === id);
      const duplicatedTask: Task = { ...taskToDuplicate, id: `${Date.now()}-${Math.random()}` };
      const updatedTasks = insertTaskAt(newTasks, index + 1, duplicatedTask);
      setActiveTasks(updatedTasks);
      saveTasks([...updatedTasks, ...doneTasks]);
    }
  }, [activeTasks, doneTasks, saveTasks]);

  const handleMoveTaskUp = useCallback((taskId: string) => {
    const index = activeTasks.findIndex(t => t.id === taskId);
    if (index > 0) {
      const newTasks = [...activeTasks];
      const [movedTask] = newTasks.splice(index, 1);
      newTasks.splice(index - 1, 0, movedTask);
      setActiveTasks(newTasks);
      saveTasks([...newTasks, ...doneTasks]);
    }
  }, [activeTasks, doneTasks, saveTasks]);

  const handleMoveTaskDown = useCallback((taskId: string) => {
    const index = activeTasks.findIndex(t => t.id === taskId);
    if (index < activeTasks.length - 1 && index !== -1) {
      const newTasks = [...activeTasks];
      const [movedTask] = newTasks.splice(index, 1);
      newTasks.splice(index + 1, 0, movedTask);
      setActiveTasks(newTasks);
      saveTasks([...newTasks, ...doneTasks]);
    }
  }, [activeTasks, doneTasks, saveTasks]);

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField, sortDirection]);

  const filteredActiveTasks = useMemo(() => activeTasks.filter(task => 
    task.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    task.task.toLowerCase().includes(searchQuery.toLowerCase())
  ), [activeTasks, searchQuery]);

  const sortedActiveTasks = useMemo(() => {
    if (sortField === 'id' && sortDirection === 'asc') {
      return filteredActiveTasks;
    }
    
    const sortableTasks = [...filteredActiveTasks];
    const taskIndexMap = new Map(activeTasks.map((task, index) => [task.id, index]));

    sortableTasks.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'id':
          comparison = (taskIndexMap.get(a.id) ?? 0) - (taskIndexMap.get(b.id) ?? 0);
          break;
        case 'category':
          comparison = a.category.localeCompare(b.category);
          break;
        case 'task':
          comparison = a.task.localeCompare(b.task);
          break;
        case 'effort':
          comparison = (parseInt(a.effort) || 0) - (parseInt(b.effort) || 0);
          break;
        case 'criticality':
          comparison = (parseInt(a.criticality) || 0) - (parseInt(b.criticality) || 0);
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return sortableTasks;
  }, [filteredActiveTasks, sortField, sortDirection, activeTasks]);


  const getSortIcon = useCallback((field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3" />;
    return sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  }, [sortField, sortDirection]);

  // Filter for today tasks
  const todayTasks = useMemo(() => activeTasks.filter(t => t.today), [activeTasks]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        const importedTasks = parseMarkdownTable(content);
        setActiveTasks(importedTasks.filter(t => t.status !== 'done'));
        setDoneTasks(importedTasks.filter(t => t.status === 'done'));
        saveTasks(importedTasks);
        alert(`${importedTasks.length} tasks imported successfully.`);
      }
    };
    reader.readAsText(file);
    // Reset file input to allow re-uploading the same file
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <header className="flex items-center justify-between p-4 border-b">
          <h1 className="text-xl font-semibold">My Tasks</h1>
          <UserButton afterSignOutUrl="/"/>
      </header>
      <main className="flex-1 overflow-y-auto p-4">
        <SignedIn>
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <>
              {syncError && (
                <div className="bg-red-100 text-red-700 px-4 py-2 rounded mb-2 text-center">
                  Could not sync with server. Your tasks are safe locally.
                  <button onClick={retrySync} className="ml-2 underline text-red-700">Retry</button>
                </div>
              )}
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
                <Button onClick={() => saveTasks(allTasks)} variant="outline" size="sm" disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                </Button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".md, .markdown, .txt"
                  className="hidden"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  size="sm"
                >
                  Import
                </Button>
                <Button
                  onClick={() => {
                    const markdown = tasksToMarkdown(allTasks);
                    const blob = new Blob([markdown], { type: 'text/markdown' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `tasks-${new Date().toISOString().split('T')[0]}.md`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  }}
                  variant="outline"
                  size="sm"
                >
                  Export
                </Button>
                {lastGoodState && (
                  <Button onClick={handleRevert} variant="outline" size="sm">
                    Revert Last Change
                  </Button>
                )}
                <div className="text-sm text-gray-500">
                  {filteredActiveTasks.length} of {activeTasks.length} tasks
                </div>
              </div>

              {/* Today Tasks Section */}
              {todayTasks.length > 0 && (
                <Card className="mb-6 border-2 border-primary">
                  <CardHeader className="py-2 bg-primary/10">
                    <CardTitle className="text-sm">Today&apos;s Tasks ({todayTasks.length})</CardTitle>
                  </CardHeader>
                  <CardContent className="py-2">
                    <div className="overflow-x-auto">
                      <Table className="table-fixed w-full">
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[25px] px-1"></TableHead>
                            <TableHead className="w-[40px] px-1">#</TableHead>
                            <TableHead className="w-[150px] px-1">Category</TableHead>
                            <TableHead className="w-[120px] px-1">Status</TableHead>
                            <TableHead className="w-[40px] px-1">E</TableHead>
                            <TableHead className="w-[40px] px-1">C</TableHead>
                            <TableHead className="w-auto px-1">Task</TableHead>
                            <TableHead className="w-[60px] px-1">Today</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {todayTasks.map((task, idx) => (
                            <TableRow key={task.id}>
                              <TableCell></TableCell>
                              <TableCell>{idx + 1}</TableCell>
                              <TableCell>{task.category}</TableCell>
                              <TableCell>{task.status}</TableCell>
                              <TableCell>{task.effort}</TableCell>
                              <TableCell>{task.criticality}</TableCell>
                              <TableCell>{task.task}</TableCell>
                              <TableCell>
                                <Checkbox
                                  checked={!!task.today}
                                  onCheckedChange={checked => handleTaskUpdate(task.id, 'today', checked ? 'true' : '')}
                                  aria-label="Mark as today"
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader className="py-2">
                  <CardTitle className="text-sm">Task Categories ({filteredActiveTasks.length} tasks)</CardTitle>
                </CardHeader>
                <CardContent className="py-2">
                  <div className="overflow-x-auto">
                    <DragDropContext onDragEnd={handleDragEnd}>
                      <Table className="table-fixed w-full">
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[25px] px-1"></TableHead>
                            <TableHead className="w-[40px] px-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => handleSort('id')}>
                              <div className="flex items-center gap-1">
                                # {getSortIcon('id')}
                              </div>
                            </TableHead>
                            <TableHead className="w-[150px] px-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => handleSort('category')}>
                              <div className="flex items-center gap-1">
                                Category {getSortIcon('category')}
                              </div>
                            </TableHead>
                            <TableHead className="w-[120px] px-1">Status</TableHead>
                            <TableHead className="w-[40px] px-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => handleSort('effort')}>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <div className="flex items-center justify-center gap-1">
                                      E {getSortIcon('effort')}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>Effort (1-10)</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </TableHead>
                            <TableHead className="w-[40px] px-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => handleSort('criticality')}>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <div className="flex items-center justify-center gap-1">
                                      C {getSortIcon('criticality')}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>Criticality (1-3)</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </TableHead>
                            <TableHead className="w-auto px-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => handleSort('task')}>
                              <div className="flex items-center gap-1">
                                Task {getSortIcon('task')}
                              </div>
                            </TableHead>
                            <TableHead className="w-[60px] px-1">Today</TableHead>
                            <TableHead className="w-[140px] px-1 text-right" title="Actions">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <Droppable droppableId="tasks">
                          {(provided) => (
                            <TableBody ref={provided.innerRef} {...provided.droppableProps}>
                              {sortedActiveTasks.map((task, index) => (
                                <TaskRow
                                  key={task.id}
                                  task={task}
                                  index={index}
                                  isFirst={index === 0}
                                  isLast={index === sortedActiveTasks.length - 1}
                                  handleTaskUpdate={handleTaskUpdate}
                                  handleAddTask={() => handleAddTask(task.id)}
                                  handleDuplicateTask={() => handleDuplicateTask(task.id)}
                                  handleDeleteTask={() => handleDeleteTask(task.id)}
                                  handleMoveTaskUp={() => handleMoveTaskUp(task.id)}
                                  handleMoveTaskDown={() => handleMoveTaskDown(task.id)}
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

              {doneTasks.length > 0 && (
                <div className="mt-6">
                  <Card>
                    <CardHeader className="py-2 cursor-pointer" onClick={() => setIsArchiveOpen(!isArchiveOpen)}>
                      <CardTitle className="text-sm flex items-center">
                        {isArchiveOpen ? <ChevronDown className="h-4 w-4 mr-2" /> : <ChevronRight className="h-4 w-4 mr-2" />}
                        Archived Tasks ({doneTasks.length})
                      </CardTitle>
                    </CardHeader>
                    {isArchiveOpen && (
                      <CardContent className="py-2">
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-[60px] px-1">Today</TableHead>
                                <TableHead>Task</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="w-[100px] px-1 text-right">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {doneTasks.map((task, index) => (
                                <TaskRow
                                  key={task.id}
                                  task={task}
                                  index={index}
                                  isFirst={true} isLast={true} // Move buttons disabled
                                  handleTaskUpdate={handleTaskUpdate}
                                  handleDeleteTask={() => handleDeleteTask(task.id)}
                                  // Pass dummy handlers for unused actions
                                  handleAddTask={() => {}}
                                  handleDuplicateTask={() => {}}
                                  handleMoveTaskUp={() => {}}
                                  handleMoveTaskDown={() => {}}
                                />
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                </div>
              )}
            </>
          )}
        </SignedIn>
        <SignedOut>
          <div className="flex flex-col items-center justify-center h-full text-center">
            <h2 className="text-2xl font-semibold mb-4">Welcome to Your Task Manager</h2>
            <p className="mb-8 text-gray-600">Please sign in to manage your tasks.</p>
            <SignInButton mode="modal">
              <Button>Sign In</Button>
            </SignInButton>
          </div>
        </SignedOut>
      </main>

      <footer className="p-4 border-t text-center text-sm text-gray-500">
        Open source on{' '}
        <a
          href="https://github.com/m13v/to-do-app"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-gray-900"
        >
          GitHub
        </a>
      </footer>

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
              <pre className="text-xs p-2 bg-gray-100 rounded">{tasksToMarkdown(allTasks)}</pre>
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
