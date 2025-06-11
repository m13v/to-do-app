'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Loader2, Sparkles, Send, X, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { parseMarkdownTable, tasksToMarkdown, insertTaskAt, updateTask, deleteTask, Task } from '@/lib/markdown-parser';

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [prompt, setPrompt] = useState('');
  const [processingAI, setProcessingAI] = useState(false);
  const [editingCell, setEditingCell] = useState<{ index: number; field: 'category' | 'task' } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

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
    
    // Simulate AI processing - in a real app, this would call an AI API
    setTimeout(() => {
      setProcessingAI(false);
      setPrompt('');
      alert('AI processing would happen here. For now, manually edit tasks.');
    }, 1000);
  };

  const handleAddTask = async (index: number) => {
    const newTask: Task = { category: 'NEW', task: 'New task' };
    const updatedTasks = insertTaskAt(tasks, index, newTask);
    setTasks(updatedTasks);
    await saveTasks(updatedTasks);
    // Immediately edit the new task after state update
    setTimeout(() => {
      setEditingCell({ index, field: 'task' });
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
    const newTask: Task = { ...taskToDuplicate };
    const updatedTasks = insertTaskAt(tasks, index + 1, newTask);
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
    if (e.key === 'Enter') {
      if (e.metaKey || e.ctrlKey) {
        // Cmd+Enter or Ctrl+Enter: insert new line
        const textarea = e.target as HTMLTextAreaElement;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newValue = editValue.substring(0, start) + '\n' + editValue.substring(end);
        setEditValue(newValue);
        // Set cursor position after the new line
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 1;
        }, 0);
      } else {
        // Enter only: save and exit
        e.preventDefault();
        handleSaveEdit();
      }
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  if (loading) {
    return (
      <div className="w-full px-2 py-2">
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Sticky AI Assistant Bar */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="px-2 py-2">
          <form onSubmit={handleAIPrompt} className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Sparkles className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium">AI Assistant</span>
            </div>
            <Textarea
              placeholder="Ask the AI to modify your tasks..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAIPrompt(e);
                }
              }}
              className="flex-1 min-h-[32px] h-8 py-1 resize-none"
              rows={1}
            />
            <Button
              type="submit"
              disabled={processingAI || !prompt.trim()}
              size="sm"
              className="h-8"
            >
              {processingAI ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Send className="h-3 w-3" />
              )}
            </Button>
          </form>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-2 py-2">
        {/* Tasks Table */}
        <Card>
          <CardHeader className="py-2">
            <CardTitle className="text-base">Task Categories ({tasks.length} tasks)</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <div className="overflow-x-auto">
              <Table className="table-fixed">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">#</TableHead>
                    <TableHead className="w-[150px]">Category</TableHead>
                    <TableHead className="w-auto">Task</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {tasks.map((task, index) => (
                      <React.Fragment key={`task-${index}`}>
                        {/* Hover row for adding tasks */}
                        <motion.tr
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="h-6 hover:bg-gray-50 dark:hover:bg-gray-800"
                          onMouseEnter={() => setHoveredRow(index - 0.5)}
                          onMouseLeave={() => setHoveredRow(null)}
                        >
                          <TableCell colSpan={4} className="p-0">
                            {hoveredRow === index - 0.5 && (
                              <div className="flex justify-center py-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleAddTask(index)}
                                  className="h-6 px-2 text-xs"
                                >
                                  <Plus className="h-3 w-3" />
                                  Add Task
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </motion.tr>
                        
                        {/* Task row */}
                        <motion.tr
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="hover:bg-gray-50 dark:hover:bg-gray-800"
                          onMouseEnter={() => setHoveredRow(index)}
                          onMouseLeave={() => setHoveredRow(null)}
                        >
                          <TableCell className="text-center text-sm text-gray-500 py-1 px-2">
                            {index + 1}
                          </TableCell>
                          <TableCell className="font-medium py-1 px-2">
                            {editingCell?.index === index && editingCell.field === 'category' ? (
                              <Input
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={handleSaveEdit}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleSaveEdit();
                                  } else if (e.key === 'Escape') {
                                    handleCancelEdit();
                                  }
                                }}
                                autoFocus
                                className="h-7 text-sm"
                              />
                            ) : (
                              <div
                                className="cursor-pointer hover:text-purple-600"
                                onClick={() => handleCellEdit(index, 'category')}
                              >
                                {task.category}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="py-1 px-2">
                            {editingCell?.index === index && editingCell.field === 'task' ? (
                              <Textarea
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={handleSaveEdit}
                                onKeyDown={handleKeyDown}
                                autoFocus
                                className="min-h-[60px] text-sm resize-none"
                                rows={Math.max(2, editValue.split('\n').length)}
                              />
                            ) : (
                              <div
                                className="cursor-pointer hover:text-purple-600 truncate whitespace-pre-wrap"
                                onClick={() => handleCellEdit(index, 'task')}
                                title={task.task}
                              >
                                {task.task}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="py-1 px-2">
                            {hoveredRow === index && (
                              <div className="flex gap-1 justify-end">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleAddTask(index + 1)}
                                  className="h-6 w-6 p-0"
                                  title="Add task below"
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteTask(index)}
                                  className="h-6 w-6 p-0"
                                  title="Delete task"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDuplicateTask(index)}
                                  className="h-6 w-6 p-0"
                                  title="Duplicate task"
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </motion.tr>
                      </React.Fragment>
                    ))}
                    {/* Final hover row */}
                    <motion.tr
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="h-6 hover:bg-gray-50 dark:hover:bg-gray-800"
                      onMouseEnter={() => setHoveredRow(tasks.length - 0.5)}
                      onMouseLeave={() => setHoveredRow(null)}
                    >
                      <TableCell colSpan={4} className="p-0">
                        {hoveredRow === tasks.length - 0.5 && (
                          <div className="flex justify-center py-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleAddTask(tasks.length)}
                              className="h-6 px-2 text-xs"
                            >
                              <Plus className="h-3 w-3" />
                              Add Task
                            </Button>
                          </div>
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
    </div>
  );
}
