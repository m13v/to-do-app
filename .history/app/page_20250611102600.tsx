'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Loader2, Sparkles } from 'lucide-react';
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
    <div className="container mx-auto p-4 max-w-6xl">
      {/* AI Prompt Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI Task Assistant
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Textarea
              placeholder="Ask the AI to modify your tasks... e.g., &apos;Add a new task for code review in the BUSINESS category&apos; or &apos;Change all DASHBOARD tasks to UI IMPROVEMENTS&apos;"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="flex-1"
              rows={3}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.metaKey) {
                  handleAIPrompt();
                }
              }}
            />
            <Button 
              onClick={handleAIPrompt} 
              disabled={processingAI || !prompt.trim()}
              className="self-end"
            >
              {processingAI ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Apply
                </>
              )}
            </Button>
          </div>
          {error && (
            <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Task Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Task Categories ({tasks.length} tasks)</span>
            {saving && (
              <span className="text-sm font-normal flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Category</TableHead>
                <TableHead>Task</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence>
                {tasks.map((task, index) => (
                  <motion.tr
                    key={index}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    onMouseEnter={() => setHoveredRow(index)}
                    onMouseLeave={() => setHoveredRow(null)}
                    className="group relative"
                  >
                    <TableCell className="font-medium">
                      {editingCell?.index === index && editingCell.field === 'category' ? (
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={saveEdit}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEdit();
                            if (e.key === 'Escape') setEditingCell(null);
                          }}
                          autoFocus
                          className="h-8"
                        />
                      ) : (
                        <div
                          onClick={() => handleCellEdit(index, 'category')}
                          className="cursor-pointer hover:bg-gray-50 px-2 py-1 rounded"
                        >
                          {task.category}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingCell?.index === index && editingCell.field === 'task' ? (
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={saveEdit}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEdit();
                            if (e.key === 'Escape') setEditingCell(null);
                          }}
                          autoFocus
                          className="h-8"
                        />
                      ) : (
                        <div
                          onClick={() => handleCellEdit(index, 'task')}
                          className="cursor-pointer hover:bg-gray-50 px-2 py-1 rounded"
                        >
                          {task.task}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className={`flex gap-1 transition-opacity ${hoveredRow === index ? 'opacity-100' : 'opacity-0'}`}>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleAddTask(index)}
                          className="h-8 w-8 p-0"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteTask(index)}
                          className="h-8 w-8 p-0 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
