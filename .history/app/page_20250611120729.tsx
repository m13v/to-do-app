'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Loader2, Sparkles, Send, X, Copy, ArrowUpDown, ArrowUp, ArrowDown, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { parseMarkdownTable, tasksToMarkdown, insertTaskAt, updateTask, deleteTask, Task } from '@/lib/markdown-parser';

type SortField = 'number' | 'category' | 'task';
type SortDirection = 'asc' | 'desc';

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [prompt, setPrompt] = useState('');
  const [processingAI, setProcessingAI] = useState(false);
  const [editingCell, setEditingCell] = useState<{ index: number; field: 'category' | 'task' } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [hoveredBetween, setHoveredBetween] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('number');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
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
  };

  const saveTasks = async (updatedTasks: Task[]) => {
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
  };

  const handleAIPrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    
    setProcessingAI(true);
    
    // Simulate AI processing (replace with actual AI call)
    setTimeout(() => {
      setProcessingAI(false);
      setPrompt('');
      // You would implement actual AI logic here
      console.log('AI would process:', prompt);
    }, 2000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleAIPrompt(e);
  };

  const handleAddTask = async (afterIndex: number) => {
    const newTask: Task = { category: 'NEW', task: 'New task' };
    const updatedTasks = insertTaskAt(tasks, afterIndex, newTask);
    setTasks(updatedTasks);
    await saveTasks(updatedTasks);
    // Immediately edit the new task after state update
    setTimeout(() => {
      const newIndex = afterIndex + 1;
      setEditingCell({ index: newIndex, field: 'task' });
      setEditValue('New task');
    }, 0);
  };

  const handleDeleteTask = async (index: number) => {
    const updatedTasks = deleteTask(tasks, index);
    setTasks(updatedTasks);
    await saveTasks(updatedTasks);
  };

  const handleDuplicateTask = async (index: number) => {
    const taskToDuplicate = tasks[index];
    const duplicatedTask = { ...taskToDuplicate };
    const updatedTasks = insertTaskAt(tasks, index, duplicatedTask);
    setTasks(updatedTasks);
    await saveTasks(updatedTasks);
  };

  const handleCellEdit = (index: number, field: 'category' | 'task') => {
    setEditingCell({ index, field });
    setEditValue(tasks[index][field]);
  };

  const handleSaveEdit = async () => {
    if (editingCell) {
      const updatedTask = {
        ...tasks[editingCell.index],
        [editingCell.field]: editValue,
      };
      const updatedTasks = updateTask(tasks, editingCell.index, updatedTask);
      setTasks(updatedTasks);
      await saveTasks(updatedTasks);
      setEditingCell(null);
      setEditValue('');
    }
  };

  const handleCancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Filter tasks based on search query
  const filteredTasks = tasks.filter(task => 
    task.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    task.task.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort filtered tasks
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    const aIndex = tasks.indexOf(a);
    const bIndex = tasks.indexOf(b);
    
    let comparison = 0;
    switch (sortField) {
      case 'number':
        comparison = aIndex - bIndex;
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

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3" />;
    return sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full px-2 py-2">
      {/* Sticky Header with AI Prompt and Search */}
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

        {/* Search Bar */}
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

      {/* Task Table */}
      <Card>
        <CardHeader className="py-2">
          <CardTitle className="text-sm">Task Categories ({filteredTasks.length} tasks)</CardTitle>
        </CardHeader>
        <CardContent className="py-2">
          <div className="overflow-x-auto">
            <Table className="table-fixed w-full">
              <TableHeader>
                <TableRow>
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
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {sortedTasks.map((task, index) => {
                    const originalIndex = tasks.indexOf(task);
                    return (
                      <React.Fragment key={`task-${originalIndex}`}>
                        {/* Add button row - only shows on hover */}
                        <motion.tr
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ 
                            opacity: hoveredBetween === index - 1 ? 1 : 0,
                            height: hoveredBetween === index - 1 ? 'auto' : 0
                          }}
                          exit={{ opacity: 0, height: 0 }}
                          className="border-0"
                          onMouseEnter={() => setHoveredBetween(index - 1)}
                          onMouseLeave={() => setHoveredBetween(null)}
                        >
                          <TableCell colSpan={4} className="py-0 text-center border-0">
                            {hoveredBetween === index - 1 && (
                              <Button
                                onClick={() => handleAddTask(originalIndex - 1)}
                                size="sm"
                                variant="ghost"
                                className="h-6 opacity-70 hover:opacity-100"
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            )}
                          </TableCell>
                        </motion.tr>
                        
                        {/* Task row */}
                        <TableRow
                          onMouseEnter={() => setHoveredRow(originalIndex)}
                          onMouseLeave={() => setHoveredRow(null)}
                          className="group"
                        >
                          <TableCell className="py-1 px-2">
                            {originalIndex + 1}
                          </TableCell>
                          <TableCell className="font-medium py-1 px-2">
                            {editingCell?.index === originalIndex && editingCell.field === 'category' ? (
                              <Input
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={handleSaveEdit}
                                onKeyDown={handleKeyDown}
                                className="h-7 py-0"
                                autoFocus
                              />
                            ) : (
                              <div
                                className="cursor-pointer px-1 py-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                                onClick={() => handleCellEdit(originalIndex, 'category')}
                              >
                                {task.category}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="py-1 px-2">
                            {editingCell?.index === originalIndex && editingCell.field === 'task' ? (
                              <Textarea
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={handleSaveEdit}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                    // Allow new line with Cmd/Ctrl+Enter
                                    return;
                                  } else if (e.key === 'Enter') {
                                    // Save on Enter
                                    e.preventDefault();
                                    handleSaveEdit();
                                  } else if (e.key === 'Escape') {
                                    handleCancelEdit();
                                  }
                                }}
                                className="min-h-[28px] py-0.5 resize-none"
                                rows={1}
                                autoFocus
                              />
                            ) : (
                              <div
                                className="cursor-pointer px-1 py-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 truncate"
                                onClick={() => handleCellEdit(originalIndex, 'task')}
                                title={task.task}
                              >
                                {task.task.split('\n').map((line, i) => (
                                  <React.Fragment key={i}>
                                    {line}
                                    {i < task.task.split('\n').length - 1 && <br />}
                                  </React.Fragment>
                                ))}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="py-1 px-1">
                            <div className={`flex gap-0.5 transition-opacity ${hoveredRow === originalIndex ? 'opacity-100' : 'opacity-0'}`}>
                              <Button
                                onClick={() => handleDuplicateTask(originalIndex)}
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0"
                                title="Duplicate"
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                              <Button
                                onClick={() => handleDeleteTask(originalIndex)}
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0"
                                title="Delete"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      </React.Fragment>
                    );
                  })}
                  
                  {/* Add button at the end */}
                  <motion.tr
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ 
                      opacity: hoveredBetween === sortedTasks.length - 1 ? 1 : 0,
                      height: hoveredBetween === sortedTasks.length - 1 ? 'auto' : 0
                    }}
                    exit={{ opacity: 0, height: 0 }}
                    className="border-0"
                    onMouseEnter={() => setHoveredBetween(sortedTasks.length - 1)}
                    onMouseLeave={() => setHoveredBetween(null)}
                  >
                    <TableCell colSpan={4} className="py-0 text-center border-0">
                      {hoveredBetween === sortedTasks.length - 1 && (
                        <Button
                          onClick={() => handleAddTask(tasks.length - 1)}
                          size="sm"
                          variant="ghost"
                          className="h-6 opacity-70 hover:opacity-100"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      )}
                    </TableCell>
                  </motion.tr>
                </AnimatePresence>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
