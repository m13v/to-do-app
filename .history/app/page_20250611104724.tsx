'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Loader2, Sparkles, Send, X, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { parseMarkdownTable, tasksToMarkdown, insertTaskAt, updateTask, deleteTask, Task } from '@/lib/markdown-parser';

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [processingAI, setProcessingAI] = useState(false);
  const [editingCell, setEditingCell] = useState<{ index: number; field: 'category' | 'task' } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load initial data
  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      console.log('Loading tasks...');
      const response = await fetch('/api/file');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load tasks');
      }
      
      const parsedTasks = parseMarkdownTable(data.content);
      setTasks(parsedTasks);
      setError(null);
    } catch (error) {
      console.error('Error loading tasks:', error);
      setError('Failed to load tasks. Please check the console.');
    } finally {
      setLoading(false);
    }
  };

  const saveTasks = async (updatedTasks: Task[]) => {
    setSaving(true);
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
      
      setError(null);
    } catch (error) {
      console.error('Error saving tasks:', error);
      setError('Failed to save tasks. Please check the console.');
    } finally {
      setSaving(false);
    }
  };

  const handleAIPrompt = async () => {
    if (!prompt.trim()) return;
    
    setProcessingAI(true);
    setError(null);
    
    try {
      console.log('Processing AI prompt...');
      const currentMarkdown = tasksToMarkdown(tasks);
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, currentContent: currentMarkdown }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to process AI request');
      }
      
      const updatedTasks = parseMarkdownTable(data.updatedContent);
      setTasks(updatedTasks);
      await saveTasks(updatedTasks);
      setPrompt('');
    } catch (error) {
      console.error('Error processing AI prompt:', error);
      setError('Failed to process AI request. Please check your API key and try again.');
    } finally {
      setProcessingAI(false);
    }
  };

  const handleCellEdit = (index: number, field: 'category' | 'task') => {
    setEditingCell({ index, field });
    setEditValue(tasks[index][field]);
  };

  const saveEdit = async () => {
    if (editingCell) {
      const updatedTasks = updateTask(tasks, editingCell.index, {
        ...tasks[editingCell.index],
        [editingCell.field]: editValue,
      });
      setTasks(updatedTasks);
      await saveTasks(updatedTasks);
      setEditingCell(null);
    }
  };

  const handleAddTask = async (index: number) => {
    const newTask: Task = { category: 'NEW', task: 'New task' };
    const updatedTasks = insertTaskAt(tasks, index + 1, newTask);
    setTasks(updatedTasks);
    await saveTasks(updatedTasks);
  };

  const handleDeleteTask = async (index: number) => {
    const updatedTasks = deleteTask(tasks, index);
    setTasks(updatedTasks);
    await saveTasks(updatedTasks);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full px-2 py-2">
      {/* AI Prompt Section */}
      <Card className="mb-3">
        <CardHeader className="py-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-purple-600" />
              AI Task Assistant
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="py-3">
          <form onSubmit={handleAIPrompt} className="flex gap-2">
            <Textarea
              placeholder="Ask the AI to modify your tasks... e.g., 'Add a new task for code review in the BUSINESS category' or 'Change all DASHBOARD tasks to UI IMPROVEMENTS'"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="flex-1 resize-none text-sm"
              rows={2}
            />
            <Button 
              type="submit" 
              disabled={processingAI || !prompt.trim()}
              className="h-auto px-3"
            >
              {processingAI ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              <span className="ml-1 text-sm">Apply</span>
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Task Table */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-lg">Task Categories ({tasks.length} tasks)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="table-fixed w-full">
              <TableHeader>
                <TableRow className="h-8">
                  <TableHead className="w-[120px] py-1 px-2 text-sm">Category</TableHead>
                  <TableHead className="w-auto py-1 px-2 text-sm">Task</TableHead>
                  <TableHead className="w-[80px] py-1 px-2 text-sm">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {tasks.map((task, index) => (
                    <motion.tr
                      key={`${task.category}-${task.task}-${index}`}
                      initial={editingCell?.index === index ? { opacity: 0, x: -20 } : false}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.3 }}
                      className="group relative h-8"
                    >
                      <TableCell className="font-medium py-1 px-2">
                        {editingCell?.index === index && editingCell.field === 'category' ? (
                          <Input
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={saveEdit}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEdit();
                              if (e.key === 'Escape') setEditingCell(null);
                            }}
                            className="h-6 text-sm"
                            autoFocus
                          />
                        ) : (
                          <span 
                            className="cursor-pointer hover:text-purple-600 transition-colors text-sm"
                            onClick={() => handleCellEdit(index, 'category')}
                          >
                            {task.category}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-0 py-1 px-2">
                        {editingCell?.index === index && editingCell.field === 'task' ? (
                          <Input
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={saveEdit}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEdit();
                              if (e.key === 'Escape') setEditingCell(null);
                            }}
                            className="h-6 text-sm"
                            autoFocus
                          />
                        ) : (
                          <span 
                            className="cursor-pointer hover:text-purple-600 transition-colors truncate block text-sm"
                            onClick={() => handleCellEdit(index, 'task')}
                            title={task.task}
                          >
                            {task.task}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="py-1 px-2">
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleAddTask(index)}
                            className="h-6 w-6 p-0"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteTask(index)}
                            className="h-6 w-6 p-0"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
