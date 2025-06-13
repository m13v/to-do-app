'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Sparkles, Send, ArrowUpDown, ArrowUp, ArrowDown, Search, ChevronDown, ChevronRight, Undo, Redo } from 'lucide-react';
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
import { toast } from "sonner"
import { generateDiff } from '@/lib/diff';
import AnimatedTitle from '@/components/AnimatedTitle';
import { useMediaQuery } from '@/lib/hooks/use-media-query';
import MobileTaskCard from '@/components/MobileTaskCard';

type SortField = 'priority' | 'category' | 'task' | 'effort' | 'criticality';
type SortDirection = 'asc' | 'desc';

const defaultTasksMarkdown = `| P | Category | Task | Status | Done | Effort | Criticality |
|---|---|---|---|---|---|---|
| 1 | Welcome | Welcome to your new task manager! | to_do | | 5 | 2 |
| 2 | Welcome | Click on any task text to edit it. | to_do | | 1 | 1 |
| 3 | Welcome | Use the buttons on the right to add, duplicate, or delete tasks. | to_do | | 1 | 1 |
| 4 | Welcome | Drag and drop tasks to reorder them. | to_do | | 2 | 1 |
| 5 | Welcome | Use the search bar to filter your tasks. | to_do | | 1 | 1 |
| 6 | Welcome | Click on the column headers to sort your list. | to_do | | 1 | 1 |
| 7 | Welcome | Set effort from 1-10 to estimate task size. | to_do | | 1 | 2 |
| 8 | Welcome | Set criticality from 1-3 to prioritize important work. | to_do | | 1 | 2 |
| 9 | Welcome | Use the AI Assistant to manage your tasks with natural language. | to_do | | 3 | 3 |
| 10 | Welcome | Delete these welcome tasks when you're ready to start. | to_do | | 1 | 1 |
`;

const systemPrompt = `You are an AI assistant helping to manage a todo list. The user will provide a markdown table and a prompt.
Your task is to return a new, updated markdown table based on the user's prompt.

**RULES:**
1.  **ONLY** return the markdown table. Do not include any other text, titles, headers, or explanations.
2.  The table structure is fixed. The columns are: | Category | Task | Status | Effort | Criticality | Today |
3.  Do **NOT** add, remove, or rename any columns.
4.  Preserve the pipe \`|\` separators and the markdown table format exactly.
Your output will be parsed by a script, so any deviation from this format will break the application.
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
  const [tasksSentToAI, setTasksSentToAI] = useState<Task[] | null>(null);
  const [history, setHistory] = useState<Task[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [recentDiff, setRecentDiff] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('priority');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [syncError, setSyncError] = useState(false);
  const [countdown, setCountdown] = useState(180);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportableMarkdown, setExportableMarkdown] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const allTasks = useMemo(() => [...activeTasks, ...doneTasks], [activeTasks, doneTasks]);
  const filteredAllTasks = useMemo(() => allTasks.filter(task => 
    task.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    task.task.toLowerCase().includes(searchQuery.toLowerCase())
  ), [allTasks, searchQuery]);

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

  const updateAndSaveTasks = useCallback((newTasks: Task[], shouldRecordHistory: boolean = true) => {
    const oldTasks = allTasks;
    if (shouldRecordHistory) {
        const diff = generateDiff(oldTasks, newTasks);
        setRecentDiff(diff);

        const newHistorySlice = history.slice(0, historyIndex + 1);
        const updatedHistory = [...newHistorySlice, newTasks];
        // Limit history to 20 undo steps + current state
        if (updatedHistory.length > 21) {
            updatedHistory.shift();
        }
        setHistory(updatedHistory);
        setHistoryIndex(updatedHistory.length - 1);
    }

    setActiveTasks(newTasks.filter(t => t.status !== 'done'));
    setDoneTasks(newTasks.filter(t => t.status === 'done'));

    saveTasks(newTasks);
  }, [history, historyIndex, saveTasks]);

  const retrySync = useCallback(async () => {
    setSyncError(false);
    await saveTasks(allTasks);
  }, [allTasks, saveTasks]);

  const loadTasks = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    let loadedTasks: Task[] = [];
    let serverFetchError = false;

    // 1. Always try to fetch from Supabase first
    try {
      const response = await fetch('/api/tasks');
      if (response.ok) {
        const data = await response.json();
        if (data && data.content) {
          console.log("Successfully fetched tasks from server.");
          loadedTasks = parseMarkdownTable(data.content);
          // Update localStorage with the latest from the server
          localStorage.setItem('markdownContent', data.content);
        }
      } else {
        serverFetchError = true;
        console.error('Server responded with an error:', response.status);
      }
    } catch (error) {
      serverFetchError = true;
      console.error('Failed to fetch from server:', error);
    }

    // 2. If server fetch failed, try localStorage
    if (serverFetchError && loadedTasks.length === 0) {
      console.log("Falling back to localStorage.");
      const storedMarkdown = localStorage.getItem('markdownContent');
      if (storedMarkdown) {
        loadedTasks = parseMarkdownTable(storedMarkdown);
      }
    }

    // 3. If still no tasks, use defaults
    if (loadedTasks.length === 0) {
      console.log("No tasks found, loading defaults.");
      loadedTasks = parseMarkdownTable(defaultTasksMarkdown);
      // Immediately save defaults to establish a baseline
      saveTasks(loadedTasks);
    }
    
    setActiveTasks(loadedTasks.filter(t => t.status !== 'done'));
    setDoneTasks(loadedTasks.filter(t => t.status === 'done'));
    setHistory([loadedTasks]);
    setHistoryIndex(0);
    setLoading(false);
  }, [user, saveTasks]);

  useEffect(() => {
    if (user) {
      loadTasks();
    }
  }, [user, loadTasks]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (processingAI) {
      setCountdown(180); // Reset countdown
      timer = setInterval(() => {
        setCountdown((prevCountdown) => {
          if (prevCountdown > 1) {
            return prevCountdown - 1;
          }
          clearInterval(timer);
          return 0;
        });
      }, 1000);
    }
    return () => {
      clearInterval(timer);
    };
  }, [processingAI]);

  useEffect(() => {
    if (loading || !user || syncError) return;
    const handler = setTimeout(() => {
      saveTasks(allTasks);
    }, 10000);
    return () => clearTimeout(handler);
  }, [allTasks, loading, user, saveTasks, syncError]);

  const handleAIPrompt = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || allTasks.length === 0) {
      alert("Please enter a prompt and have at least one task before using the AI Assistant.");
      return;
    }

    const tasksForAI = searchQuery.trim() ? filteredAllTasks : allTasks;
    if (tasksForAI.length === 0) {
      alert("Your filter returned no tasks. Please adjust your filter or clear it before using the AI assistant.");
      return;
    }

    setProcessingAI(true);
    setTasksSentToAI(tasksForAI);

    try {
      const userPromptWithContext = recentDiff 
        ? `${prompt}\n\nFor context, here are my recent changes:\n${recentDiff}\n\nAnd here is the current task list:\n${tasksToMarkdown(tasksForAI)}`
        : `${prompt}\n\n${tasksToMarkdown(tasksForAI)}`;

      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemPrompt,
          userPrompt: userPromptWithContext,
        }),
      });

      if (!response.ok) {
        if (response.status === 504) {
          throw new Error("The request timed out as it was taking too long to process. This can happen with very large task lists. Please try filtering your tasks to reduce the size of the request.");
        }
        const errorData = await response.json();
        const errorMessage = errorData.error || 'Failed to get response from AI';
        const errorDetails = errorData.details ? `\n\nDetails: ${errorData.details}` : '';
        alert(`AI Error: ${errorMessage}${errorDetails}`);
        throw new Error(errorMessage);
      }

      const data = await response.json();
      const parsed = parseMarkdownTable(data.content);

      if (parsed.length === 0 && data.content.trim() !== '') {
        throw new Error('AI response is not a valid markdown table.');
      }
      
      setAiGeneratedContent(data.content);
      toast.success("AI modifications generated successfully. Please review and confirm.");

    } catch (error) {
      console.error('Error processing AI prompt:', error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      toast.error(`AI Processing Failed: ${errorMessage}`);
    } finally {
      setProcessingAI(false);
    }
  }, [prompt, allTasks, filteredAllTasks, searchQuery, recentDiff]);

  const handleConfirmAIChanges = () => {
    if (aiGeneratedContent && tasksSentToAI) {
      try {
        const parsedTasks = parseMarkdownTable(aiGeneratedContent);
        
        const taskIdsSentToAI = new Set(tasksSentToAI.map(t => t.id));
        const tasksToKeep = allTasks.filter(t => !taskIdsSentToAI.has(t.id));

        const finalTasks = [...tasksToKeep, ...parsedTasks];

        updateAndSaveTasks(finalTasks);
        setAiGeneratedContent(null);
        setTasksSentToAI(null);
        toast.success("AI changes applied successfully!");
      } catch (error) {
        console.error("Failed to apply AI changes:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        toast.error(`Failed to apply AI changes: ${errorMessage}`);
      }
    }
  };

  const handleCancelAIChanges = () => {
    setAiGeneratedContent(null);
    setTasksSentToAI(null);
  };
  
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      const previousTasks = history[newIndex];
      setActiveTasks(previousTasks.filter(t => t.status !== 'done'));
      setDoneTasks(previousTasks.filter(t => t.status === 'done'));
      saveTasks(previousTasks);
    }
  }, [history, historyIndex, saveTasks]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      const nextTasks = history[newIndex];
      setActiveTasks(nextTasks.filter(t => t.status !== 'done'));
      setDoneTasks(nextTasks.filter(t => t.status === 'done'));
      saveTasks(nextTasks);
    }
  }, [history, historyIndex, saveTasks]);

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

    updateAndSaveTasks([...newTasks, ...doneTasks]);
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
    
    updateAndSaveTasks([...updatedActive, ...updatedDone]);
  }, [activeTasks, doneTasks, updateAndSaveTasks]);
  
  const handlePriorityChange = (taskId: string, newPriority: number) => {
    const updatedTasks = allTasks.map(task => 
      task.id === taskId ? { ...task, priority: newPriority } : task
    );

    if (sortField === 'priority') {
      updatedTasks.sort((a, b) => {
        const comparison = a.priority - b.priority;
        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }
    
    updateAndSaveTasks(updatedTasks);
  };

  const handleAddTask = useCallback((afterId: string) => {
    const newTasks = [...activeTasks];
    const afterIndex = newTasks.findIndex(t => t.id === afterId);
    const category = newTasks[afterIndex]?.category || 'NEW';
    const newPriority = activeTasks.reduce((max, t) => Math.max(max, t.priority), 0) + 1;
    const newTask: Task = { id: `${Date.now()}-${Math.random()}`, priority: newPriority, category, task: '', status: 'to_do', effort: '5', criticality: '2', today: false };
    const updatedTasks = insertTaskAt(newTasks, afterIndex + 1, newTask);
    updateAndSaveTasks([...updatedTasks, ...doneTasks]);
  }, [activeTasks, doneTasks, updateAndSaveTasks]);

  const handleDeleteTask = useCallback((id: string) => {
    const updatedActive = activeTasks.filter(t => t.id !== id);
    const updatedDone = doneTasks.filter(t => t.id !== id);
    updateAndSaveTasks([...updatedActive, ...updatedDone]);
  }, [activeTasks, doneTasks, updateAndSaveTasks]);

  const handleDuplicateTask = useCallback((id: string) => {
    const newTasks = [...activeTasks];
    const taskToDuplicate = newTasks.find(t => t.id === id);
    if (taskToDuplicate) {
      const index = newTasks.findIndex(t => t.id === id);
      const duplicatedTask: Task = { ...taskToDuplicate, id: `${Date.now()}-${Math.random()}` };
      const updatedTasks = insertTaskAt(newTasks, index + 1, duplicatedTask);
      updateAndSaveTasks([...updatedTasks, ...doneTasks]);
    }
  }, [activeTasks, doneTasks, updateAndSaveTasks]);

  const handleMoveTaskUp = useCallback((taskId: string) => {
    const index = activeTasks.findIndex(t => t.id === taskId);
    if (index > 0) {
      const newTasks = [...activeTasks];
      const [movedTask] = newTasks.splice(index, 1);
      newTasks.splice(index - 1, 0, movedTask);
      updateAndSaveTasks([...newTasks, ...doneTasks]);
    }
  }, [activeTasks, doneTasks, updateAndSaveTasks]);

  const handleMoveTaskDown = useCallback((taskId: string) => {
    const index = activeTasks.findIndex(t => t.id === taskId);
    if (index < activeTasks.length - 1 && index !== -1) {
      const newTasks = [...activeTasks];
      const [movedTask] = newTasks.splice(index, 1);
      newTasks.splice(index + 1, 0, movedTask);
      updateAndSaveTasks([...newTasks, ...doneTasks]);
    }
  }, [activeTasks, doneTasks, updateAndSaveTasks]);

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
    const sortableTasks = [...filteredActiveTasks];
    
    sortableTasks.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'priority':
          comparison = a.priority - b.priority;
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
  }, [filteredActiveTasks, sortField, sortDirection]);


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
        updateAndSaveTasks(importedTasks);
        alert(`${importedTasks.length} tasks imported successfully.`);
      }
    };
    reader.readAsText(file);
    // Reset file input to allow re-uploading the same file
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const runDailyReset = useCallback(() => {
    const lastVisitDate = localStorage.getItem('lastVisitDate');
    const today = new Date().toISOString().split('T')[0];

    if (lastVisitDate !== today) {
      console.log("New day detected. Resetting 'Today' tasks.");
      const resetTasks = allTasks.map(task => ({ ...task, today: false }));
      updateAndSaveTasks(resetTasks);
      localStorage.setItem('lastVisitDate', today);
    }
  }, [allTasks, updateAndSaveTasks]);

  useEffect(() => {
    if (!loading) {
      runDailyReset();
    }
  }, [loading, runDailyReset]);

  const focusCell = (row: number, col: number) => {
    const cellId = `cell-${row}-${col}`;
    const cell = document.getElementById(cellId);
    if (cell) {
      cell.focus();
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <header className="flex items-center justify-between p-4 border-b">
        <AnimatedTitle />
        <UserButton afterSignOutUrl="/"/>
      </header>
      <main className="flex-1 overflow-y-auto p-2 md:p-4">
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
              
              <div className="mb-3">
                <div className="flex items-center gap-2 text-sm mb-1">
                  <Sparkles className="h-4 w-4 text-purple-600" />
                  <span className="font-semibold">AI Assistant</span>
                </div>
                <form onSubmit={handleSubmit} className="flex gap-2 items-start">
                  <Textarea
                    placeholder="Ask the AI to modify your tasks..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="min-h-[60px] resize-y"
                    rows={2}
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
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </form>
              </div>

              <QuickPrompts onPromptSelect={setPrompt} />

              <div className="mb-3 flex flex-col md:flex-row items-stretch md:items-center gap-2">
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
                <div className="flex items-center gap-2 justify-end">
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
                      setExportableMarkdown(markdown);
                      setIsExportModalOpen(true);
                    }}
                    variant="outline"
                    size="sm"
                  >
                    Export
                  </Button>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button onClick={handleUndo} variant="outline" size="sm" disabled={historyIndex === 0}>
                          <Undo className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Undo</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button onClick={handleRedo} variant="outline" size="sm" disabled={historyIndex >= history.length - 1}>
                          <Redo className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Redo</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="text-sm text-gray-500 text-right md:text-left mt-2 md:mt-0">
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
                    {isDesktop ? (
                      <div className="overflow-x-auto">
                        <Table className="table-fixed w-full">
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[60px] px-0.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => handleSort('priority')}>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger className="w-full h-full flex items-center justify-center">
                                      {getSortIcon('priority')}
                                    </TooltipTrigger>
                                    <TooltipContent>Overall Priority</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </TableHead>
                              <TableHead className="w-[140px] px-0.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => handleSort('category')}>Category</TableHead>
                              <TableHead className="w-auto px-0.5">Task</TableHead>
                              <TableHead className="w-[100px] px-0.5">Status</TableHead>
                              <TableHead className="w-[40px] px-0.5">E</TableHead>
                              <TableHead className="w-[40px] px-0.5">C</TableHead>
                              <TableHead className="w-[60px] px-0.5">Today</TableHead>
                              <TableHead className="w-[140px] px-0.5 text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {todayTasks.map((task, idx) => (
                              <TaskRow
                                key={task.id}
                                task={task}
                                index={idx}
                                isFirst={idx === 0}
                                isLast={idx === todayTasks.length - 1}
                                isDraggable={false}
                                handleTaskUpdate={handleTaskUpdate}
                                handlePriorityChange={handlePriorityChange}
                                handleAddTask={() => handleAddTask(task.id)}
                                handleDuplicateTask={() => handleDuplicateTask(task.id)}
                                handleDeleteTask={() => handleDeleteTask(task.id)}
                                handleMoveTaskUp={() => handleMoveTaskUp(task.id)}
                                handleMoveTaskDown={() => handleMoveTaskDown(task.id)}
                                focusCell={focusCell}
                              />
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div>
                        {todayTasks.map((task, index) => (
                          <MobileTaskCard
                            key={task.id}
                            task={task}
                            isFirst={index === 0}
                            isLast={index === todayTasks.length - 1}
                            onUpdate={handleTaskUpdate}
                            onDelete={handleDeleteTask}
                            onAdd={() => handleAddTask(task.id)}
                            onDuplicate={() => handleDuplicateTask(task.id)}
                            onMoveUp={() => handleMoveTaskUp(task.id)}
                            onMoveDown={() => handleMoveTaskDown(task.id)}
                            onPriorityChange={handlePriorityChange}
                          />
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader className="py-2">
                  <CardTitle className="text-sm">Task Categories ({filteredActiveTasks.length} tasks)</CardTitle>
                </CardHeader>
                <CardContent className="py-2">
                  <DragDropContext onDragEnd={handleDragEnd}>
                    {isDesktop ? (
                      <div className="overflow-x-auto">
                        <Table className="table-fixed w-full">
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[25px] px-0.5"></TableHead>
                              <TableHead className="w-[60px] px-0.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => handleSort('priority')}>
                                 <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger className="w-full h-full flex items-center justify-center">
                                      {getSortIcon('priority')}
                                    </TooltipTrigger>
                                    <TooltipContent>Overall Priority</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </TableHead>
                              <TableHead className="w-[140px] px-0.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => handleSort('category')}>
                                <div className="flex items-center gap-1">
                                  Category {getSortIcon('category')}
                                </div>
                              </TableHead>
                              <TableHead className="w-[100px] px-0.5">Status</TableHead>
                              <TableHead className="w-[40px] px-0.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => handleSort('effort')}>
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
                              <TableHead className="w-[40px] px-0.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => handleSort('criticality')}>
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
                              <TableHead className="w-auto px-0.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => handleSort('task')}>
                                <div className="flex items-center gap-1">
                                  Task {getSortIcon('task')}
                                </div>
                              </TableHead>
                              <TableHead className="w-[60px] px-0.5">Today</TableHead>
                              <TableHead className="w-[140px] px-0.5 text-right" title="Actions">Actions</TableHead>
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
                                    handlePriorityChange={handlePriorityChange}
                                    handleAddTask={() => handleAddTask(task.id)}
                                    handleDuplicateTask={() => handleDuplicateTask(task.id)}
                                    handleDeleteTask={() => handleDeleteTask(task.id)}
                                    handleMoveTaskUp={() => handleMoveTaskUp(task.id)}
                                    handleMoveTaskDown={() => handleMoveTaskDown(task.id)}
                                    focusCell={focusCell}
                                  />
                                ))}
                                {provided.placeholder}
                              </TableBody>
                            )}
                          </Droppable>
                        </Table>
                      </div>
                    ) : (
                      <Droppable droppableId="tasks-mobile" isDropDisabled={true}>
                        {(provided) => (
                          <div ref={provided.innerRef} {...provided.droppableProps}>
                            {sortedActiveTasks.map((task, index) => (
                              <MobileTaskCard
                                key={task.id}
                                task={task}
                                isFirst={index === 0}
                                isLast={index === sortedActiveTasks.length - 1}
                                onUpdate={handleTaskUpdate}
                                onDelete={handleDeleteTask}
                                onAdd={() => handleAddTask(task.id)}
                                onDuplicate={() => handleDuplicateTask(task.id)}
                                onMoveUp={() => handleMoveTaskUp(task.id)}
                                onMoveDown={() => handleMoveTaskDown(task.id)}
                                onPriorityChange={handlePriorityChange}
                              />
                            ))}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    )}
                  </DragDropContext>
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
                                <TableHead className="w-[60px] px-0.5">Today</TableHead>
                                <TableHead>Task</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="w-[100px] px-0.5 text-right">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {doneTasks.map((task, index) => (
                                <TaskRow
                                  key={task.id}
                                  task={task}
                                  index={index}
                                  isFirst={true} isLast={true} // Move buttons disabled
                                  isDraggable={false}
                                  handleTaskUpdate={handleTaskUpdate}
                                  handleDeleteTask={() => handleDeleteTask(task.id)}
                                  focusCell={() => {}}
                                  // Pass dummy handlers for unused actions
                                  handlePriorityChange={() => {}}
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

      <Dialog open={!!aiGeneratedContent} onOpenChange={(isOpen) => !isOpen && handleCancelAIChanges()}>
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
              <pre className="text-xs p-2 bg-gray-100 rounded">{tasksSentToAI ? tasksToMarkdown(tasksSentToAI) : ''}</pre>
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

      <Dialog open={isExportModalOpen} onOpenChange={setIsExportModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Export Tasks</DialogTitle>
            <DialogDescription>
              You can edit the markdown content below before downloading.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            <Textarea
              value={exportableMarkdown}
              onChange={(e) => setExportableMarkdown(e.target.value)}
              className="min-h-[400px] font-mono text-xs"
              />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsExportModalOpen(false)}>Cancel</Button>
            <Button onClick={() => {
              const blob = new Blob([exportableMarkdown], { type: 'text/markdown' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `tasks-${new Date().toISOString().split('T')[0]}.md`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
              setIsExportModalOpen(false);
            }}>Download</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={processingAI}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>AI Assistant is thinking...</DialogTitle>
            <DialogDescription>
              Please wait while the AI processes your request.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center p-6">
            <Loader2 className="h-16 w-16 animate-spin text-purple-600" />
            <p className="mt-4 text-lg font-semibold">
              Time remaining (might take less): {countdown} seconds
            </p>
            {countdown === 0 && <p className="text-sm text-gray-500 mt-2">The AI is taking longer than usual. Please be patient.</p>}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Trigger deployment - Fix drag-and-drop invariant error
