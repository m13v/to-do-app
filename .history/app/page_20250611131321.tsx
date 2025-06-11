'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Loader2, Sparkles, Send, X, Copy, ArrowUpDown, ArrowUp, ArrowDown, Search, Check, GripVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { parseMarkdownTable, tasksToMarkdown, insertTaskAt, updateTask, deleteTask, Task } from '@/lib/markdown-parser';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type SortField = 'number' | 'category' | 'task' | 'status' | 'done';
type SortDirection = 'asc' | 'desc';

const statusOptions = [
  { value: 'waiting_for_other', label: 'Waiting for other' },
  { value: 'come_back_tomorrow', label: 'Come back tomorrow' },
  { value: 'to_do_today', label: 'To do today' },
  { value: 'to_do', label: 'To do' }
] as const;

// Sortable row component
function SortableRow({ 
  task, 
  originalIndex,
  onEdit,
  onStatusChange,
  onDoneToggle,
  onDuplicate,
  onDelete,
  editingCell,
  editValue,
  setEditValue,
  handleSaveEdit,
  handleCancelEdit,
  isHovered,
  onHover,
  onHoverLeave
}: {
  task: Task;
  originalIndex: number;
  onEdit: (index: number, field: 'category' | 'task') => void;
  onStatusChange: (index: number, status: Task['status']) => void;
  onDoneToggle: (index: number) => void;
  onDuplicate: (index: number) => void;
  onDelete: (index: number) => void;
  editingCell: { index: number; field: 'category' | 'task' } | null;
  editValue: string;
  setEditValue: (value: string) => void;
  handleSaveEdit: () => void;
  handleCancelEdit: () => void;
  isHovered: boolean;
  onHover: () => void;
  onHoverLeave: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: originalIndex });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      onMouseEnter={onHover}
      onMouseLeave={onHoverLeave}
      className={`group ${task.done ? 'opacity-50' : ''} ${isDragging ? 'cursor-grabbing' : ''}`}
    >
      <TableCell className="py-1 px-1 w-8">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab hover:bg-gray-100 dark:hover:bg-gray-800 rounded p-1"
        >
          <GripVertical className="h-3 w-3 text-gray-400" />
        </div>
      </TableCell>
      <TableCell className="py-1 px-2 text-center">
        <Checkbox
          checked={task.done}
          onCheckedChange={() => onDoneToggle(originalIndex)}
          className="mx-auto"
        />
      </TableCell>
      <TableCell className="py-1 px-2">
        {originalIndex + 1}
      </TableCell>
      <TableCell className="font-medium py-1 px-2">
        {editingCell?.index === originalIndex && editingCell.field === 'category' ? (
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSaveEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey) {
                e.preventDefault();
                handleSaveEdit();
              } else if (e.key === 'Escape') {
                handleCancelEdit();
              }
            }}
            className="h-7 py-0"
            autoFocus
          />
        ) : (
          <div
            className="cursor-pointer px-1 py-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
            onClick={() => onEdit(originalIndex, 'category')}
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
            className={`cursor-pointer px-1 py-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 ${task.done ? 'line-through' : ''}`}
            onClick={() => onEdit(originalIndex, 'task')}
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
      <TableCell className="py-1 px-2">
        <Select
          value={task.status}
          onValueChange={(value: Task['status']) => onStatusChange(originalIndex, value)}
        >
          <SelectTrigger className="h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="py-1 px-1">
        <div className={`flex gap-0.5 transition-opacity ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
          <Button
            onClick={() => onDuplicate(originalIndex)}
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            title="Duplicate"
          >
            <Copy className="h-3 w-3" />
          </Button>
          <Button
            onClick={() => onDelete(originalIndex)}
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
  );
}

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [prompt, setPrompt] = useState('');
  const [processingAI, setProcessingAI] = useState(false);
  const [editingCell, setEditingCell] = useState<{ index: number; field: 'category' | 'task' } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('number');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [floatingButton, setFloatingButton] = useState<{ x: number; y: number; index: number } | null>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const lastMouseMoveTime = useRef(0);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = Number(active.id);
      const newIndex = Number(over?.id);

      const reorderedTasks = arrayMove(tasks, oldIndex, newIndex);
      setTasks(reorderedTasks);
      await saveTasks(reorderedTasks);
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
    const newTask: Task = { 
      category: 'NEW', 
      task: 'New task',
      status: 'to_do',
      done: false
    };
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
    const duplicatedTask = { 
      ...taskToDuplicate,
      done: false // Reset done status for duplicated task
    };
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

  const handleStatusChange = async (index: number, status: Task['status']) => {
    const updatedTask = {
      ...tasks[index],
      status
    };
    const updatedTasks = updateTask(tasks, index, updatedTask);
    setTasks(updatedTasks);
    await saveTasks(updatedTasks);
  };

  const handleDoneToggle = async (index: number) => {
    const updatedTask = {
      ...tasks[index],
      done: !tasks[index].done
    };
    const updatedTasks = updateTask(tasks, index, updatedTask);
    setTasks(updatedTasks);
    await saveTasks(updatedTasks);
  };

  // Throttled mouse move handler
  const handleMouseMoveOnTable = useCallback((e: React.MouseEvent<HTMLTableElement>) => {
    const now = Date.now();
    if (now - lastMouseMoveTime.current < 50) return; // Throttle to 20 FPS
    lastMouseMoveTime.current = now;

    if (!tableRef.current || editingCell) return;

    const rows = tableRef.current.querySelectorAll('tbody tr');
    const tableRect = tableRef.current.getBoundingClientRect();
    const mouseY = e.clientY - tableRect.top;

    let foundHover = false;

    rows.forEach((row, index) => {
      const rect = row.getBoundingClientRect();
      const relativeTop = rect.top - tableRect.top;

      // Check if mouse is between this row and the previous one
      if (index > 0 && mouseY > relativeTop - 10 && mouseY < relativeTop + 10) {
        const centerX = tableRect.left + tableRect.width / 2;
        setFloatingButton({
          x: centerX,
          y: rect.top,
          index: index - 1
        });
        foundHover = true;
      }
    });

    // Check if mouse is before first row
    if (rows.length > 0) {
      const firstRowRect = rows[0].getBoundingClientRect();
      const relativeTop = firstRowRect.top - tableRect.top;
      if (mouseY < relativeTop && mouseY > relativeTop - 20) {
        const centerX = tableRect.left + tableRect.width / 2;
        setFloatingButton({
          x: centerX,
          y: firstRowRect.top,
          index: -1
        });
        foundHover = true;
      }
    }

    // Check if mouse is after last row
    if (rows.length > 0) {
      const lastRowRect = rows[rows.length - 1].getBoundingClientRect();
      const relativeBottom = lastRowRect.bottom - tableRect.top;
      if (mouseY > relativeBottom && mouseY < relativeBottom + 20) {
        const centerX = tableRect.left + tableRect.width / 2;
        setFloatingButton({
          x: centerX,
          y: lastRowRect.bottom,
          index: sortedTasks.length - 1
        });
        foundHover = true;
      }
    }

    if (!foundHover) {
      setFloatingButton(null);
    }
  }, [editingCell]);

  const handleMouseLeaveTable = () => {
    setFloatingButton(null);
  };

  // Filter tasks based on search query
  const filteredTasks = tasks.filter(task => {
    const query = searchQuery.toLowerCase();
    const statusLabel = statusOptions.find(opt => opt.value === task.status)?.label.toLowerCase() || '';
    return (
      task.category.toLowerCase().includes(query) ||
      task.task.toLowerCase().includes(query) ||
      statusLabel.includes(query)
    );
  });

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
      case 'status':
        comparison = a.status.localeCompare(b.status);
        break;
      case 'done':
        comparison = Number(a.done) - Number(b.done);
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
          <div className="overflow-x-auto relative">
            {/* Move DndContext outside of table to fix hydration error */}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <Table 
                ref={tableRef}
                className="table-fixed w-full"
                onMouseMove={handleMouseMoveOnTable}
                onMouseLeave={handleMouseLeaveTable}
              >
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead 
                      className="w-[40px] cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={() => handleSort('done')}
                    >
                      <div className="flex items-center justify-center">
                        <Check className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="w-[50px] cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={() => handleSort('number')}
                    >
                      <div className="flex items-center gap-1">
                        # {getSortIcon('number')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="w-[130px] cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
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
                    <TableHead 
                      className="w-[180px] cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={() => handleSort('status')}
                    >
                      <div className="flex items-center gap-1">
                        Status {getSortIcon('status')}
                      </div>
                    </TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <SortableContext
                    items={tasks.map((_, index) => index)}
                    strategy={verticalListSortingStrategy}
                  >
                    {sortField === 'number' && sortDirection === 'asc' ? (
                      // Only allow drag and drop when sorted by number ascending
                      tasks.map((task, index) => (
                        <SortableRow
                          key={index}
                          task={task}
                          originalIndex={index}
                          onEdit={handleCellEdit}
                          onStatusChange={handleStatusChange}
                          onDoneToggle={handleDoneToggle}
                          onDuplicate={handleDuplicateTask}
                          onDelete={handleDeleteTask}
                          editingCell={editingCell}
                          editValue={editValue}
                          setEditValue={setEditValue}
                          handleSaveEdit={handleSaveEdit}
                          handleCancelEdit={handleCancelEdit}
                          isHovered={hoveredRow === index}
                          onHover={() => setHoveredRow(index)}
                          onHoverLeave={() => setHoveredRow(null)}
                        />
                      ))
                    ) : (
                      // When sorted differently, show sorted tasks without drag and drop
                      sortedTasks.map((task) => {
                        const originalIndex = tasks.indexOf(task);
                        return (
                          <TableRow
                            key={originalIndex}
                            className={`group ${task.done ? 'opacity-50' : ''}`}
                          >
                            <TableCell className="py-1 px-1 w-8">
                              <div className="p-1">
                                <GripVertical className="h-3 w-3 text-gray-200" />
                              </div>
                            </TableCell>
                            <TableCell className="py-1 px-2 text-center">
                              <Checkbox
                                checked={task.done}
                                onCheckedChange={() => handleDoneToggle(originalIndex)}
                                className="mx-auto"
                              />
                            </TableCell>
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
                                  className={`cursor-pointer px-1 py-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 ${task.done ? 'line-through' : ''}`}
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
                            <TableCell className="py-1 px-2">
                              <Select
                                value={task.status}
                                onValueChange={(value: Task['status']) => handleStatusChange(originalIndex, value)}
                              >
                                <SelectTrigger className="h-7 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {statusOptions.map(option => (
                                    <SelectItem key={option.value} value={option.value}>
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="py-1 px-1">
                              <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
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
                        );
                      })
                    )}
                  </SortableContext>
                </TableBody>
              </Table>
            </DndContext>

            {/* Floating Add Button */}
            <AnimatePresence>
              {floatingButton && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.15 }}
                  style={{
                    position: 'fixed',
                    left: floatingButton.x,
                    top: floatingButton.y,
                    transform: 'translate(-50%, -50%)',
                    zIndex: 50
                  }}
                >
                  <Button
                    onClick={() => {
                      const actualIndex = floatingButton.index >= 0 
                        ? tasks.indexOf(sortedTasks[floatingButton.index])
                        : -1;
                      handleAddTask(actualIndex);
                      setFloatingButton(null);
                    }}
                    size="sm"
                    className="h-8 w-8 rounded-full shadow-lg bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
