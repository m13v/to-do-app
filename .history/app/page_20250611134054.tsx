'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableHead, TableRow } from '@/components/ui/table';
import { Loader2, Sparkles, Send, ArrowUpDown, ArrowUp, ArrowDown, Search } from 'lucide-react';
import { DragDropContext, Droppable, DropResult } from '@hello-pangea/dnd';
import { parseMarkdownTable, tasksToMarkdown, insertTaskAt, deleteTask, Task } from '@/lib/markdown-parser';
import TaskRow from '@/components/TaskRow';

type SortField = 'number' | 'category' | 'task';
type SortDirection = 'asc' | 'desc';

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [prompt, setPrompt] = useState('');
  const [processingAI, setProcessingAI] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('number');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = useCallback(async () => {
    try {
      const response = await fetch('/api/file');
      const data = await response.json();
      const parsedTasks = parseMarkdownTable(data.content);
      setTasks(parsedTasks);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const saveTasks = useCallback(async (updatedTasks: Task[]) => {
    try {
      console.log('Saving tasks...');
      const markdown = tasksToMarkdown(updatedTasks);
      const response = await fetch('/api/file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: markdown }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save tasks');
      }
    } catch (error) {
      console.error('Error saving tasks:', error);
    }
  }, []);

  const handleAIPrompt = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    
    setProcessingAI(true);
    
    setTimeout(() => {
      setProcessingAI(false);
      setPrompt('');
      console.log('AI would process:', prompt);
    }, 2000);
  }, [prompt]);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const items = Array.from(tasks);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setTasks(items);
    saveTasks(items);
  };

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    handleAIPrompt(e);
  }, [handleAIPrompt]);

  const handleTaskUpdate = (index: number, field: keyof Task, value: string) => {
    const updatedTasks = tasks.map((task, i) => 
      i === index ? { ...task, [field]: value } : task
    );
    setTasks(updatedTasks);
  };
  
  const handleSaveChanges = (updatedTasks: Task[]) => {
    saveTasks(updatedTasks);
  };

  const handleAddTask = useCallback(async (afterIndex: number) => {
    const category = tasks[afterIndex]?.category || 'NEW';
    const newTask: Task = { category, task: '', status: 'to_do', done: '' };
    const updatedTasks = insertTaskAt(tasks, afterIndex, newTask);
    setTasks(updatedTasks);
    await saveTasks(updatedTasks);
  }, [tasks, saveTasks]);

  const handleDeleteTask = useCallback(async (index: number) => {
    const updatedTasks = deleteTask(tasks, index);
    setTasks(updatedTasks);
    await saveTasks(updatedTasks);
  }, [tasks, saveTasks]);

  const handleDuplicateTask = useCallback(async (index: number) => {
    const taskToDuplicate = tasks[index];
    const duplicatedTask = { ...taskToDuplicate };
    const updatedTasks = insertTaskAt(tasks, index, duplicatedTask);
    setTasks(updatedTasks);
    await saveTasks(updatedTasks);
  }, [tasks, saveTasks]);

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
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900">
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
                          handleSaveChanges={handleSaveChanges}
                          handleAddTask={handleAddTask}
                          handleDuplicateTask={handleDuplicateTask}
                          handleDeleteTask={handleDeleteTask}
                          tasks={tasks}
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
    </div>
  );
}
