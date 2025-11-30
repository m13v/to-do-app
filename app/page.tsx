'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, ArrowUpDown, ArrowUp, ArrowDown, Search, ChevronDown, ChevronRight, Undo, Redo, Check, ChevronsUpDown } from 'lucide-react';
import { DragDropContext, Droppable, DropResult } from '@hello-pangea/dnd';
import { parseMarkdownTable, tasksToMarkdown, Task } from '@/lib/markdown-parser';
import TaskRow from '@/components/TaskRow';
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
import { mergeTasks, MergeResult } from '@/lib/merge';
import { useMediaQuery } from '@/lib/hooks/use-media-query';
import MobileTaskCard from '@/components/MobileTaskCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CategoriesManager from '@/components/CategoriesManager';

type SortField = 'priority' | 'category' | 'task';
type SortDirection = 'asc' | 'desc';

const defaultTasksMarkdown = `| P | Category | Subcategory | Task | Status | Today | Created | Updated |
|---|---|---|---|---|---|----------|----------|
| 1 | Welcome | | Welcome to your new task manager! | to_do | | ${new Date().toISOString().split('T')[0]} | ${new Date().toISOString().split('T')[0]} |
| 2 | Welcome | | Click on any task text to edit it. | to_do | | ${new Date().toISOString().split('T')[0]} | ${new Date().toISOString().split('T')[0]} |
| 3 | Welcome | | Use the buttons on the right to add, duplicate, or delete tasks. | to_do | | ${new Date().toISOString().split('T')[0]} | ${new Date().toISOString().split('T')[0]} |
| 4 | Welcome | | Drag and drop tasks to reorder them. | to_do | | ${new Date().toISOString().split('T')[0]} | ${new Date().toISOString().split('T')[0]} |
| 5 | Welcome | | Use the search bar to filter your tasks. | to_do | | ${new Date().toISOString().split('T')[0]} | ${new Date().toISOString().split('T')[0]} |
| 6 | Welcome | | Click on the column headers to sort your list. | to_do | | ${new Date().toISOString().split('T')[0]} | ${new Date().toISOString().split('T')[0]} |
| 7 | Welcome | | Delete these welcome tasks when you're ready to start. | to_do | | ${new Date().toISOString().split('T')[0]} | ${new Date().toISOString().split('T')[0]} |
`;

export default function Home() {
  const { user, isLoaded, isSignedIn } = useUser();
  const [activeTasks, setActiveTasks] = useState<Task[]>([]);
  const [doneTasks, setDoneTasks] = useState<Task[]>([]);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  // Track if user was previously signed in to detect session expiration
  const [wasSignedIn, setWasSignedIn] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('wasSignedIn') === 'true';
    }
    return false;
  });
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<Task[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [categoryComboOpen, setCategoryComboOpen] = useState(false);
  const [subcategoryFilter, setSubcategoryFilter] = useState<string>('all');
  const [subcategoryComboOpen, setSubcategoryComboOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [statusComboOpen, setStatusComboOpen] = useState(false);
  const [sortField, setSortField] = useState<SortField>('priority');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [syncError, setSyncError] = useState(false);
  const [authError, setAuthError] = useState(false); // Track 401 auth errors separately
  const [retrying, setRetrying] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportableMarkdown, setExportableMarkdown] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  // Selected tasks state - track which tasks are selected via checkbox
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  // Text wrapping state - track if task text should wrap or show as single line
  const [isTextWrapped, setIsTextWrapped] = useState(true);
  // Track task being edited to defer sorting until blur
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingInsertIndex, setEditingInsertIndex] = useState<number | null>(null);

  
  // Load category filter from localStorage after hydration to avoid hydration mismatch
  useEffect(() => {
    const storedFilter = localStorage.getItem('categoryFilter');
    if (storedFilter) {
      setCategoryFilter(storedFilter);
      console.log('Category filter loaded from localStorage:', storedFilter);
    }
  }, []);
  
  // Load subcategory filter from localStorage after hydration to avoid hydration mismatch
  useEffect(() => {
    const storedSubcategoryFilter = localStorage.getItem('subcategoryFilter');
    if (storedSubcategoryFilter) {
      setSubcategoryFilter(storedSubcategoryFilter);
      console.log('Subcategory filter loaded from localStorage:', storedSubcategoryFilter);
    }
  }, []);
  
  // Load status filter from localStorage after hydration to avoid hydration mismatch
  useEffect(() => {
    const storedStatusFilter = localStorage.getItem('statusFilter');
    if (storedStatusFilter) {
      setStatusFilter(storedStatusFilter);
      console.log('Status filter loaded from localStorage:', storedStatusFilter);
    }
  }, []);
  
  // Load column widths from localStorage after hydration
  useEffect(() => {
    const storedWidths = localStorage.getItem('columnWidths');
    if (storedWidths) {
      try {
        const parsed = JSON.parse(storedWidths);
        setColumnWidths(parsed);
        console.log('Column widths loaded from localStorage:', parsed);
      } catch (error) {
        console.error('Failed to parse stored column widths:', error);
      }
    }
  }, []);
  
  // Load text wrapping state from localStorage after hydration
  useEffect(() => {
    const stored = localStorage.getItem('isTextWrapped');
    if (stored !== null) {
      setIsTextWrapped(stored === 'true');
      console.log('Text wrapping state loaded from localStorage:', stored === 'true');
    }
  }, []);
  // Pagination state - render only 200 tasks at a time for performance
  const [currentPage, setCurrentPage] = useState(1);
  const TASKS_PER_PAGE = 200;
  // Conflict detection state - track server content to detect concurrent edits
  const [lastKnownServerContent, setLastKnownServerContent] = useState<string | null>(null);
  const [conflictDetected, setConflictDetected] = useState(false);
  const [conflictData, setConflictData] = useState<{ serverContent: string; serverTimestamp: string } | null>(null);
  // Base version for three-way merge - the last common state both devices had
  const [baseVersion, setBaseVersion] = useState<Task[] | null>(null);
  // Merge result state for showing merge preview (for future UI enhancement)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [mergeResult, setMergeResult] = useState<MergeResult | null>(null);
  // Tab state for switching between Tasks and Categories views
  const [activeTab, setActiveTab] = useState<string>('tasks');
  // Column width state for resizable columns - synced across both Today's and main tables
  const [columnWidths, setColumnWidths] = useState({
    checkbox: 32,
    drag: 32,
    priority: 80,
    category: 128,
    subcategory: 128,
    status: 128,
    task: 300,
    today: 64,
    actions: 80
  });
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const resizeStartX = useRef<number>(0);
  const resizeStartWidth = useRef<number>(0);

  // Calculate minimum table width by summing all column widths
  // This ensures Today's table and main table have identical minimum widths and aligned columns
  const minTableWidth = useMemo(() => {
    return Object.values(columnWidths).reduce((sum, width) => sum + width, 0);
  }, [columnWidths]);

  const allTasks = useMemo(() => [...activeTasks, ...doneTasks], [activeTasks, doneTasks]);
  
  // Extract unique categories for the filter dropdown
  const uniqueCategories = useMemo(() => {
    const categories = new Set(allTasks.map(task => task.category.trim()).filter(cat => cat !== ''));
    return Array.from(categories).sort();
  }, [allTasks]);

  // Extract unique subcategories for the filter dropdown
  const uniqueSubcategories = useMemo(() => {
    const subcategories = new Set(allTasks.map(task => task.subcategory.trim()).filter(sub => sub !== ''));
    return Array.from(subcategories).sort();
  }, [allTasks]);

  const saveTasks = useCallback(async (tasksToSave: Task[], forceSync = false): Promise<boolean> => {
    setSaving(true);
    try {
      const markdown = tasksToMarkdown(tasksToSave);
      const sizeInKB = (new Blob([markdown]).size / 1024).toFixed(2);
      console.log(`[Save Tasks] Saving ${tasksToSave.length} tasks (${sizeInKB} KB)`);
      
      localStorage.setItem('markdownContent', markdown);

      if (isSignedIn || forceSync) {
        console.log('[Save Tasks] Attempting to sync with server...');
        const response = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: markdown }),
        });
        if (!response.ok) {
          const errorText = await response.text();
          console.error('[Save Tasks] Server error:', response.status, errorText);
          // Check if it's an auth error (401) AND user was previously signed in
          if (response.status === 401 && wasSignedIn) {
            console.error('[Save Tasks] Auth error detected - session expired for previously signed in user');
            setAuthError(true);
            setSyncError(false);
          } else if (response.status === 401) {
            console.log('[Save Tasks] 401 error but user was never signed in - ignoring');
            // Don't set any error for new users getting 401
          } else {
            setSyncError(true);
            setAuthError(false);
          }
          return false; // Return false to indicate sync failure
        }
        // Track the server content after successful save
        await response.json(); // Consume response
        console.log('[Save Tasks] Successfully synced with server');
        console.log('[Conflict Detection] Updated local content after save');
        setLastKnownServerContent(markdown);
        // Update base version after successful sync - this is now the common state
        setBaseVersion(tasksToSave);
        localStorage.setItem('baseVersion', JSON.stringify(tasksToSave));
        console.log('[Base Version] Updated after successful save');
        setSyncError(false);
        setAuthError(false); // Clear auth error on successful sync
      }
      return true;
    } catch (error) {
      console.error('[Save Tasks] Error saving tasks:', error);
      if (isSignedIn) {
        setSyncError(true);
        setAuthError(false);
      }
      return false; 
    } finally {
      setSaving(false);
    }
  }, [isSignedIn]);

  const updateAndSaveTasks = useCallback((newTasks: Task[], shouldRecordHistory: boolean = true) => {
    if (shouldRecordHistory) {
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
  }, [allTasks, history, historyIndex, saveTasks]);

  const retrySync = useCallback(async () => {
    console.log('[Retry Sync] Starting retry attempt...');
    setRetrying(true);
    try {
      const success = await saveTasks(allTasks, true);
      if (success) {
        setSyncError(false);
        setAuthError(false); // Clear auth error on successful sync
        toast.success("Successfully synced with server!");
        console.log('[Retry Sync] Sync successful');
      } else {
        console.error('[Retry Sync] Sync failed');
        toast.error("Sync failed. Please try again.");
      }
    } catch (error) {
      console.error('[Retry Sync] Error during retry:', error);
      toast.error("Sync failed. Please try again.");
    } finally {
      setRetrying(false);
    }
  }, [allTasks, saveTasks]);

  // Handle conflict resolution - reload server data
  const handleReloadFromServer = useCallback(() => {
    if (!conflictData) return;
    
    console.log('[Conflict Detection] User chose to reload from server');
    const serverTasks = parseMarkdownTable(conflictData.serverContent);
    
    // Update local state with server data
    setActiveTasks(serverTasks.filter(t => t.status !== 'done'));
    setDoneTasks(serverTasks.filter(t => t.status === 'done'));
    
    // Update history
    const newHistorySlice = history.slice(0, historyIndex + 1);
    const updatedHistory = [...newHistorySlice, serverTasks];
    if (updatedHistory.length > 21) {
      updatedHistory.shift();
    }
    setHistory(updatedHistory);
    setHistoryIndex(updatedHistory.length - 1);
    
    // Update localStorage
    localStorage.setItem('markdownContent', conflictData.serverContent);
    
    // Update known server content
    setLastKnownServerContent(conflictData.serverContent);
    
    // Clear conflict state
    setConflictDetected(false);
    setConflictData(null);
    
    toast.success("Tasks reloaded from server");
  }, [conflictData, history, historyIndex]);

  // Handle conflict resolution - keep local data
  const handleKeepLocalData = useCallback(async () => {
    console.log('[Conflict Detection] User chose to keep local data');
    
    // Force save local data to server (overwrite)
    const success = await saveTasks(allTasks, true);
    
    if (success) {
      // Clear conflict state
      setConflictDetected(false);
      setConflictData(null);
      toast.success("Your local changes have been saved");
    } else {
      toast.error("Failed to save local changes. Please try again.");
    }
  }, [allTasks, saveTasks]);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    let loadedTasks: Task[] = [];

    if (isSignedIn) {
      let serverFetchError = false;
      try {
        const response = await fetch('/api/tasks');
        if (response.ok) {
          const data = await response.json();
          if (data && data.content) {
            console.log("Successfully fetched tasks from server.");
            const serverTasks = parseMarkdownTable(data.content);
            
            // Check if we have local changes that need to be merged
            const storedMarkdown = localStorage.getItem('markdownContent');
            const storedBaseVersion = localStorage.getItem('baseVersion');
            
            if (storedMarkdown && storedBaseVersion) {
              const localTasks = parseMarkdownTable(storedMarkdown);
              const baseVersionTasks = JSON.parse(storedBaseVersion) as Task[];
              
              // Check if local has uncommitted changes
              const localContent = tasksToMarkdown(localTasks);
              const baseContent = tasksToMarkdown(baseVersionTasks);
              
              if (localContent !== baseContent) {
                // Local has changes - need to merge
                console.log('[Load Tasks] Local changes detected, performing merge...');
                const result = mergeTasks(baseVersionTasks, localTasks, serverTasks);
                loadedTasks = result.merged;
                setMergeResult(result);
                
                // Show merge summary
                if (result.changes.length > 0 || result.conflicts.length > 0) {
                  console.log('[Merge] Changes:', result.changes.length, 'Conflicts:', result.conflicts.length);
                  toast.success(`Merged changes from both devices: ${result.changes.length} changes, ${result.conflicts.length} conflicts resolved`);
                }
              } else {
                // No local changes - just use server version
                loadedTasks = serverTasks;
              }
            } else {
              // No base version stored - just use server version
              loadedTasks = serverTasks;
            }
            
            localStorage.setItem('markdownContent', tasksToMarkdown(loadedTasks));
            // Track the initial server content
            console.log('[Conflict Detection] Initial server content stored');
            setLastKnownServerContent(data.content);
            // Set base version to what we just loaded
            setBaseVersion(loadedTasks);
            localStorage.setItem('baseVersion', JSON.stringify(loadedTasks));
          }
        } else {
          serverFetchError = true;
          console.error('Server responded with an error:', response.status);
          // Check if it's an auth error (401) AND user was previously signed in
          if (response.status === 401 && wasSignedIn) {
            console.error('[Load Tasks] Auth error detected - session expired for previously signed in user');
            setAuthError(true);
          } else if (response.status === 401) {
            console.log('[Load Tasks] 401 error but user was never signed in - ignoring');
          }
        }
      } catch (error) {
        serverFetchError = true;
        console.error('Failed to fetch from server:', error);
      }
      if (serverFetchError && loadedTasks.length === 0) {
        console.log("Falling back to localStorage for signed-in user.");
        const storedMarkdown = localStorage.getItem('markdownContent');
        if (storedMarkdown) {
          loadedTasks = parseMarkdownTable(storedMarkdown);
        }
      }
    } else {
      console.log("User is not signed in. Loading from localStorage.");
      const storedMarkdown = localStorage.getItem('markdownContent');
      if (storedMarkdown) {
        loadedTasks = parseMarkdownTable(storedMarkdown);
      }
    }

    if (loadedTasks.length === 0) {
      console.log("No tasks found, loading defaults.");
      loadedTasks = parseMarkdownTable(defaultTasksMarkdown);
      if (!isSignedIn) {
        localStorage.setItem('markdownContent', tasksToMarkdown(loadedTasks));
      }
    }
    
    setActiveTasks(loadedTasks.filter(t => t.status !== 'done'));
    setDoneTasks(loadedTasks.filter(t => t.status === 'done'));
    setHistory([loadedTasks]);
    setHistoryIndex(0);
    setLoading(false);
  }, [isSignedIn]);

  useEffect(() => {
    if (isLoaded) {
      loadTasks();
    }
  }, [isLoaded, isSignedIn, loadTasks]);

  // Track when user signs in to detect future session expiration
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      console.log('[Auth Tracking] User is signed in, setting wasSignedIn flag');
      setWasSignedIn(true);
      sessionStorage.setItem('wasSignedIn', 'true');
    }
  }, [isLoaded, isSignedIn]);

  // Persist category filter to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('categoryFilter', categoryFilter);
    console.log('Category filter saved to localStorage:', categoryFilter);
  }, [categoryFilter]);
  
  // Persist subcategory filter to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('subcategoryFilter', subcategoryFilter);
    console.log('Subcategory filter saved to localStorage:', subcategoryFilter);
  }, [subcategoryFilter]);
  
  // Persist status filter to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('statusFilter', statusFilter);
    console.log('Status filter saved to localStorage:', statusFilter);
  }, [statusFilter]);
  
  // Persist column widths to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('columnWidths', JSON.stringify(columnWidths));
    console.log('Column widths saved to localStorage:', columnWidths);
  }, [columnWidths]);
  
  // Persist text wrapping state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('isTextWrapped', String(isTextWrapped));
    console.log('Text wrapping state saved to localStorage:', isTextWrapped);
  }, [isTextWrapped]);
  
  // Effect to sync local tasks on sign-in
  // Only uploads local tasks if server has no tasks (new user)
  // Existing users will have their server tasks loaded by loadTasks()
  useEffect(() => {
    if (isSignedIn) {
      // First check if server already has tasks
      fetch('/api/tasks')
        .then(response => {
          if (response.ok) {
            return response.json();
          }
          throw new Error('No server tasks');
        })
        .then(data => {
          if (data && data.content) {
            // Server has tasks - existing user, don't upload from localStorage
            console.log("Existing user detected, server tasks found. Skipping local upload.");
          } else {
            // Server returned empty - treat as new user
            throw new Error('Server data empty');
          }
        })
        .catch(() => {
          // Server has no tasks or error - new user, upload local tasks
          const localMarkdown = localStorage.getItem('markdownContent');
          if (localMarkdown) {
            const localTasks = parseMarkdownTable(localMarkdown);
            console.log("New user detected, syncing local tasks to server...");
            saveTasks(localTasks, true);
          }
        });
    }
  }, [isSignedIn, saveTasks]);

  useEffect(() => {
    if (loading || !user || syncError || authError) return;
    const handler = setTimeout(() => {
      saveTasks(allTasks);
    }, 10000);
    return () => clearTimeout(handler);
  }, [allTasks, loading, user, saveTasks, syncError, authError]);

  // Polling mechanism - check for conflicts every 30 seconds
  useEffect(() => {
    if (!isSignedIn || loading || !lastKnownServerContent) return;
    
    const checkForConflicts = async () => {
      try {
        console.log('[Conflict Detection] Polling server for changes...');
        const response = await fetch('/api/tasks');
        if (response.ok) {
          const data = await response.json();
          if (data && data.content) {
            // Compare actual content, not timestamps
            const serverContent = data.content;
            const currentLocalContent = tasksToMarkdown(allTasks);
            
            // Check if server content changed from what we last knew
            const serverChanged = serverContent !== lastKnownServerContent;
            // Check if local content changed from what we last knew
            const localChanged = currentLocalContent !== lastKnownServerContent;
            
            console.log('[Conflict Detection] Server changed:', serverChanged, 'Local changed:', localChanged);
            
            // Only conflict if BOTH server and local have changed
            if (serverChanged && localChanged) {
              console.log('[Conflict Detection] ⚠️ CONFLICT DETECTED - Both server and local have changes!');
              
              // Perform automatic merge
              const serverTasks = parseMarkdownTable(serverContent);
              const result = mergeTasks(baseVersion, allTasks, serverTasks);
              
              console.log('[Auto-Merge] Merged tasks automatically:', result.merged.length);
              console.log('[Auto-Merge] Changes:', result.changes.length, 'Conflicts:', result.conflicts.length);
              
              // Update state with merged result
              setActiveTasks(result.merged.filter(t => t.status !== 'done'));
              setDoneTasks(result.merged.filter(t => t.status === 'done'));
              
              // Update history
              const newHistorySlice = history.slice(0, historyIndex + 1);
              const updatedHistory = [...newHistorySlice, result.merged];
              if (updatedHistory.length > 21) {
                updatedHistory.shift();
              }
              setHistory(updatedHistory);
              setHistoryIndex(updatedHistory.length - 1);
              
              // Save merged result
              const mergedMarkdown = tasksToMarkdown(result.merged);
              localStorage.setItem('markdownContent', mergedMarkdown);
              setLastKnownServerContent(mergedMarkdown);
              setBaseVersion(result.merged);
              localStorage.setItem('baseVersion', JSON.stringify(result.merged));
              
              // Show notification
              if (result.conflicts.length > 0) {
                toast.info(`Auto-merged changes with ${result.conflicts.length} conflicts resolved`);
              } else {
                toast.success('Auto-merged changes from both devices');
              }
              
              // Store merge result for user review
              setMergeResult(result);
            } else if (serverChanged && !localChanged) {
              // Server changed but we haven't - safe to auto-update
              console.log('[Conflict Detection] Server updated, no local changes - auto-syncing');
              const serverTasks = parseMarkdownTable(serverContent);
              setActiveTasks(serverTasks.filter(t => t.status !== 'done'));
              setDoneTasks(serverTasks.filter(t => t.status === 'done'));
              localStorage.setItem('markdownContent', serverContent);
              setLastKnownServerContent(serverContent);
              setBaseVersion(serverTasks);
              localStorage.setItem('baseVersion', JSON.stringify(serverTasks));
            }
          }
        }
      } catch (error) {
        console.error('[Conflict Detection] Error checking for conflicts:', error);
      }
    };

    // Check immediately, then every 30 seconds
    const intervalId = setInterval(checkForConflicts, 30000);
    
    return () => clearInterval(intervalId);
  }, [isSignedIn, loading, lastKnownServerContent, allTasks, baseVersion, history, historyIndex]);

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
 
    // Fix pagination bug: indices from drag events are relative to paginatedTasks (current page)
    // We need to adjust them to get the actual position in sortedActiveTasks
    const sourceIndexInSorted = startIndex + result.source.index;
    const destIndexInSorted = startIndex + result.destination.index;
  
    // Work with the SORTED array that matches the visual order users see
    // This ensures priority reassignments match the actual visual order
    const newTasks = Array.from(sortedActiveTasks);
    const movedItem = newTasks[sourceIndexInSorted];
    
    if (!movedItem) {
      return;
    }
  
    // Calculate new priority for the dragged task based on its destination neighbors
    // Only update the dragged task's priority, don't touch others
    let newPriority: number;
    
    if (destIndexInSorted === 0) {
      // Moving to the top - set priority lower than first task
      newPriority = newTasks[0].priority - 1;
    } else if (destIndexInSorted >= newTasks.length - 1) {
      // Moving to the bottom - set priority higher than last task
      newPriority = newTasks[newTasks.length - 1].priority + 1;
    } else {
      // Moving between two tasks - set priority to average of neighbors
      const beforeTask = newTasks[destIndexInSorted - (destIndexInSorted > sourceIndexInSorted ? 0 : 1)];
      const afterTask = newTasks[destIndexInSorted + (destIndexInSorted > sourceIndexInSorted ? 1 : 0)];
      newPriority = Math.floor((beforeTask.priority + afterTask.priority) / 2);
    }
    
    // Update only the dragged task with its new priority
    const updatedTasks = activeTasks.map(task => 
      task.id === movedItem.id ? { ...task, priority: newPriority } : task
    );
  
    updateAndSaveTasks([...updatedTasks, ...doneTasks]);
  };

  const handleTaskUpdate = useCallback((id: string, field: keyof Omit<Task, 'id'> | 'today', value: string | boolean) => {
    let taskToMove: Task | undefined;
    const updatedActive = [...activeTasks];
    const updatedDone = [...doneTasks];
    const now = new Date().toISOString();

    const isStatusChangeToDone = field === 'status' && value === 'done';
    const isStatusChangeFromDone = field === 'status' && value !== 'done';

    const activeIndex = activeTasks.findIndex(t => t.id === id);
    const doneIndex = doneTasks.findIndex(t => t.id === id);

    if (isStatusChangeToDone && activeIndex !== -1) {
      [taskToMove] = updatedActive.splice(activeIndex, 1);
      if (taskToMove) {
        taskToMove.status = 'done';
        taskToMove.updated_at = now;
        updatedDone.unshift(taskToMove);
      }
    } else if (isStatusChangeFromDone && doneIndex !== -1) {
      [taskToMove] = updatedDone.splice(doneIndex, 1);
      if (taskToMove) {
        taskToMove.status = value as string;
        taskToMove.updated_at = now;
        updatedActive.push(taskToMove);
      }
    } else {
      if (activeIndex !== -1) {
        updatedActive[activeIndex] = { ...updatedActive[activeIndex], [field]: value, updated_at: now };
      } else if (doneIndex !== -1) {
        updatedDone[doneIndex] = { ...updatedDone[doneIndex], [field]: value, updated_at: now };
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
    const subcategory = newTasks[afterIndex]?.subcategory || '';
    const newPriority = activeTasks.reduce((max, t) => Math.max(max, t.priority), 0) + 1;
    const now = new Date().toISOString();
    const newTask: Task = {
      id: `${Date.now()}-${Math.random()}`,
      priority: newPriority,
      category,
      subcategory,
      task: '',
      status: 'to_do',
      today: false,
      created_at: now,
      updated_at: now
    };
    // Insert task at position without reassigning priorities
    const insertIndex = afterIndex + 1;
    newTasks.splice(insertIndex, 0, newTask);
    updateAndSaveTasks([...newTasks, ...doneTasks]);

    // Track this task as being edited to defer sorting until blur
    setEditingTaskId(newTask.id);
    setEditingInsertIndex(insertIndex);

    // Focus the new task field after render (works for both desktop and mobile)
    setTimeout(() => {
      const newTaskField = document.querySelector(`textarea[data-task-id="${newTask.id}"]`) as HTMLTextAreaElement;
      if (newTaskField) {
        newTaskField.focus();
      }
    }, 50); // Small delay to allow React to render the new element
  }, [activeTasks, doneTasks, updateAndSaveTasks]);

  const handleDeleteTask = useCallback((id: string) => {
    const updatedActive = activeTasks.filter(t => t.id !== id);
    const updatedDone = doneTasks.filter(t => t.id !== id);
    updateAndSaveTasks([...updatedActive, ...updatedDone]);
  }, [activeTasks, doneTasks, updateAndSaveTasks]);

  const handleEditingComplete = useCallback(() => {
    setEditingTaskId(null);
    setEditingInsertIndex(null);
  }, []);

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField, sortDirection]);

  const filteredActiveTasks = useMemo(() => activeTasks.filter(task => {
    // Exclude today tasks - they're shown in the dedicated Today section
    if (task.today) return false;
    const matchesSearch = task.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          task.task.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || task.category === categoryFilter;
    const matchesSubcategory = subcategoryFilter === 'all' || task.subcategory === subcategoryFilter;
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    return matchesSearch && matchesCategory && matchesSubcategory && matchesStatus;
  }), [activeTasks, searchQuery, categoryFilter, subcategoryFilter, statusFilter]);

  const sortedActiveTasks = useMemo(() => {
    const sortableTasks = [...filteredActiveTasks];

    // If a task is being edited, pin it at its insert position
    if (editingTaskId && editingInsertIndex !== null) {
      const editingTask = sortableTasks.find(t => t.id === editingTaskId);
      if (editingTask) {
        const others = sortableTasks.filter(t => t.id !== editingTaskId);
        // Sort others normally
        others.sort((a, b) => {
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
          }
          return sortDirection === 'asc' ? comparison : -comparison;
        });
        // Insert editing task at its visual position
        const clampedIndex = Math.min(editingInsertIndex, others.length);
        others.splice(clampedIndex, 0, editingTask);
        return others;
      }
    }

    // Normal sort
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
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return sortableTasks;
  }, [filteredActiveTasks, sortField, sortDirection, editingTaskId, editingInsertIndex]);

  // Reset to page 1 when filter/search/sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, categoryFilter, subcategoryFilter, statusFilter, sortField, sortDirection]);

  // Calculate pagination values
  const totalPages = Math.ceil(sortedActiveTasks.length / TASKS_PER_PAGE);
  const startIndex = (currentPage - 1) * TASKS_PER_PAGE;
  const endIndex = startIndex + TASKS_PER_PAGE;
  
  // Only render tasks for the current page
  const paginatedTasks = useMemo(() => {
    return sortedActiveTasks.slice(startIndex, endIndex);
  }, [sortedActiveTasks, startIndex, endIndex]);


  const getSortIcon = useCallback((field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3" />;
    return sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  }, [sortField, sortDirection]);

  // Filter for today tasks
  const todayTasks = useMemo(() => activeTasks.filter(t => t.today), [activeTasks]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('[File Import] handleFileChange called');
    const file = event.target.files?.[0];
    console.log('[File Import] Selected file:', file?.name, 'Size:', file?.size);
    
    if (!file) {
      console.log('[File Import] No file selected, returning');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      console.log('[File Import] File loaded, content length:', content?.length);
      if (content) {
        const importedTasks = parseMarkdownTable(content);
        console.log('[File Import] Parsed tasks:', importedTasks.length);
        console.log('[File Import] Existing tasks:', allTasks.length);

        // Merge imported tasks with existing tasks
        const mergeResult = mergeTasks(null, allTasks, importedTasks);
        console.log('[File Import] Merged tasks:', mergeResult.merged.length);
        console.log('[File Import] Changes:', mergeResult.changes.length);

        updateAndSaveTasks(mergeResult.merged);

        // Build summary message
        const added = mergeResult.changes.filter(c => c.type === 'added' && c.source === 'server').length;
        const updated = mergeResult.changes.filter(c => c.type === 'modified' && c.source === 'server').length;
        const kept = mergeResult.merged.length - added;

        alert(`Import complete:\n• ${added} new tasks added\n• ${updated} tasks updated\n• ${kept} existing tasks kept`);
      }
    };
    reader.onerror = (error) => {
      console.error('[File Import] Error reading file:', error);
      alert('Error reading file. Please try again.');
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
      if (allTasks.length > 0 && allTasks.some(t => t.today)) {
        console.log("New day detected. Resetting 'Today' tasks.");
        const resetTasks = allTasks.map(task => ({ ...task, today: false }));
        updateAndSaveTasks(resetTasks, false);
      }
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

  // Column resize handlers
  const handleResizeStart = useCallback((columnKey: string, e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(columnKey);
    resizeStartX.current = e.clientX;
    resizeStartWidth.current = columnWidths[columnKey as keyof typeof columnWidths];
    console.log(`[Column Resize] Starting resize for ${columnKey} at width ${resizeStartWidth.current}px`);
  }, [columnWidths]);

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    
    const delta = e.clientX - resizeStartX.current;
    const newWidth = Math.max(40, resizeStartWidth.current + delta); // Minimum width of 40px
    
    setColumnWidths(prev => ({
      ...prev,
      [isResizing]: newWidth
    }));
  }, [isResizing]);

  const handleResizeEnd = useCallback(() => {
    if (isResizing) {
      console.log(`[Column Resize] Finished resizing ${isResizing} to ${columnWidths[isResizing as keyof typeof columnWidths]}px`);
      setIsResizing(null);
    }
  }, [isResizing, columnWidths]);

  // Add/remove mouse event listeners for column resizing
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
      // Prevent text selection while resizing
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';
      
      return () => {
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
      };
    }
  }, [isResizing, handleResizeMove, handleResizeEnd]);

  // Handle selecting/deselecting individual tasks
  const handleToggleTaskSelection = useCallback((taskId: string) => {
    setSelectedTaskIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  }, []);

  // Handle selecting/deselecting all tasks in current view
  const handleToggleSelectAll = useCallback((tasksList: Task[]) => {
    const allIds = tasksList.map(t => t.id);
    const allSelected = allIds.every(id => selectedTaskIds.has(id));
    
    setSelectedTaskIds(prev => {
      const newSet = new Set(prev);
      if (allSelected) {
        // Deselect all from this list
        allIds.forEach(id => newSet.delete(id));
      } else {
        // Select all from this list
        allIds.forEach(id => newSet.add(id));
      }
      return newSet;
    });
  }, [selectedTaskIds]);

  // Handle category merging
  const handleMergeCategories = useCallback((categoriesToMerge: string[], targetCategory: string) => {
    console.log(`[Category Merge] Merging categories ${categoriesToMerge.join(', ')} into '${targetCategory}'`);
    
    // Update all tasks that have one of the categories to merge
    const updatedTasks = allTasks.map(task => {
      if (categoriesToMerge.includes(task.category)) {
        return { ...task, category: targetCategory };
      }
      return task;
    });

    updateAndSaveTasks(updatedTasks);
    toast.success(`Successfully merged ${categoriesToMerge.length} categories into "${targetCategory}"`);
  }, [allTasks, updateAndSaveTasks]);

  return (
    <div className="flex flex-col h-screen">
      {/* Floating top right corner */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-3">
        <a
          href="https://github.com/m13v/to-do-app"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-gray-400 hover:text-gray-600"
        >
          Open source
        </a>
        <SignedIn>
          <UserButton afterSignOutUrl="/"/>
        </SignedIn>
        <SignedOut>
          <SignInButton mode="modal">
            <Button variant="outline" size="sm" className="animate-pulse-glow">Sign in to save</Button>
          </SignInButton>
        </SignedOut>
      </div>
      
      {/* Error banners pinned at top - outside of scrollable main */}
      {authError && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 px-4 py-3 flex items-center justify-center gap-2" role="alert">
          <span className="font-medium">Your session has expired. Please sign in again to sync your tasks to the cloud. Your tasks are safe locally.</span>
          <SignInButton mode="modal">
            <Button variant="outline" size="sm" className="ml-2">
              Sign In
            </Button>
          </SignInButton>
        </div>
      )}
      {syncError && !authError && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 px-4 py-3 flex items-center justify-center gap-2" role="alert">
          <span>Could not sync with server. Your tasks are safe locally.</span>
          <Button 
            onClick={retrySync} 
            variant="outline" 
            size="sm" 
            disabled={retrying}
          >
            {retrying ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                Retrying...
              </>
            ) : (
              'Retry'
            )}
          </Button>
        </div>
      )}
      
      <main className="flex-1 overflow-y-auto p-2 md:p-4">
        {isLoaded ? (
          <>
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <>

                {conflictDetected && (
                  <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 px-4 py-3 rounded mb-2" role="alert">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                      <div>
                        <p className="font-bold">⚠️ Conflict Detected</p>
                        <p className="text-sm">Your tasks were modified on another device. What would you like to do?</p>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button 
                          onClick={handleReloadFromServer} 
                          variant="outline" 
                          size="sm"
                          className="bg-white hover:bg-gray-50"
                        >
                          Reload (Use Server Data)
                        </Button>
                        <Button 
                          onClick={handleKeepLocalData} 
                          variant="default" 
                          size="sm"
                        >
                          Keep Mine (Overwrite Server)
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  {/* Tab Navigation */}
                  <div className="mb-3 p-2 bg-muted/30 rounded-md">
                    <TabsList className="h-9">
                      <TabsTrigger value="tasks">Tasks</TabsTrigger>
                      <TabsTrigger value="categories">Categories</TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="tasks" className="space-y-3">

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
                  <Popover open={categoryComboOpen} onOpenChange={setCategoryComboOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={categoryComboOpen}
                        className="w-full md:w-[200px] h-9 justify-between"
                      >
                        {categoryFilter === 'all' 
                          ? 'All Categories' 
                          : uniqueCategories.find((cat) => cat === categoryFilter) || 'All Categories'}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[200px] p-0">
                      <Command>
                        <CommandInput placeholder="Search categories..." />
                        <CommandList>
                          <CommandEmpty>No category found.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              value="all"
                              onSelect={() => {
                                setCategoryFilter('all');
                                setCategoryComboOpen(false);
                              }}
                            >
                              <Check
                                className={categoryFilter === 'all' ? 'mr-2 h-4 w-4 opacity-100' : 'mr-2 h-4 w-4 opacity-0'}
                              />
                              All Categories
                            </CommandItem>
                            {uniqueCategories.map((category) => (
                              <CommandItem
                                key={category}
                                value={category}
                                onSelect={(currentValue) => {
                                  setCategoryFilter(currentValue);
                                  setCategoryComboOpen(false);
                                }}
                              >
                                <Check
                                  className={categoryFilter === category ? 'mr-2 h-4 w-4 opacity-100' : 'mr-2 h-4 w-4 opacity-0'}
                                />
                                {category}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <Popover open={subcategoryComboOpen} onOpenChange={setSubcategoryComboOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={subcategoryComboOpen}
                        className="w-full md:w-[200px] h-9 justify-between"
                      >
                        {subcategoryFilter === 'all' 
                          ? 'All Subcategories' 
                          : uniqueSubcategories.find((sub) => sub === subcategoryFilter) || 'All Subcategories'}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[200px] p-0">
                      <Command>
                        <CommandInput placeholder="Search subcategories..." />
                        <CommandList>
                          <CommandEmpty>No subcategory found.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              value="all"
                              onSelect={() => {
                                setSubcategoryFilter('all');
                                setSubcategoryComboOpen(false);
                              }}
                            >
                              <Check
                                className={subcategoryFilter === 'all' ? 'mr-2 h-4 w-4 opacity-100' : 'mr-2 h-4 w-4 opacity-0'}
                              />
                              All Subcategories
                            </CommandItem>
                            {uniqueSubcategories.map((subcategory) => (
                              <CommandItem
                                key={subcategory}
                                value={subcategory}
                                onSelect={(currentValue) => {
                                  setSubcategoryFilter(currentValue);
                                  setSubcategoryComboOpen(false);
                                }}
                              >
                                <Check
                                  className={subcategoryFilter === subcategory ? 'mr-2 h-4 w-4 opacity-100' : 'mr-2 h-4 w-4 opacity-0'}
                                />
                                {subcategory}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <Popover open={statusComboOpen} onOpenChange={setStatusComboOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={statusComboOpen}
                        className="w-full md:w-[200px] h-9 justify-between"
                      >
                        {statusFilter === 'all' 
                          ? 'All Statuses' 
                          : statusFilter === 'to_do' ? 'To Do'
                          : statusFilter === 'in_progress' ? 'In Progress'
                          : statusFilter === 'waiting' ? 'Waiting'
                          : statusFilter === 'testing' ? 'Testing'
                          : statusFilter === 'done' ? 'Done'
                          : 'All Statuses'}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[200px] p-0">
                      <Command>
                        <CommandInput placeholder="Search statuses..." />
                        <CommandList>
                          <CommandEmpty>No status found.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              value="all"
                              onSelect={() => {
                                setStatusFilter('all');
                                setStatusComboOpen(false);
                              }}
                            >
                              <Check
                                className={statusFilter === 'all' ? 'mr-2 h-4 w-4 opacity-100' : 'mr-2 h-4 w-4 opacity-0'}
                              />
                              All Statuses
                            </CommandItem>
                            <CommandItem
                              value="to_do"
                              onSelect={() => {
                                setStatusFilter('to_do');
                                setStatusComboOpen(false);
                              }}
                            >
                              <Check
                                className={statusFilter === 'to_do' ? 'mr-2 h-4 w-4 opacity-100' : 'mr-2 h-4 w-4 opacity-0'}
                              />
                              To Do
                            </CommandItem>
                            <CommandItem
                              value="in_progress"
                              onSelect={() => {
                                setStatusFilter('in_progress');
                                setStatusComboOpen(false);
                              }}
                            >
                              <Check
                                className={statusFilter === 'in_progress' ? 'mr-2 h-4 w-4 opacity-100' : 'mr-2 h-4 w-4 opacity-0'}
                              />
                              In Progress
                            </CommandItem>
                            <CommandItem
                              value="waiting"
                              onSelect={() => {
                                setStatusFilter('waiting');
                                setStatusComboOpen(false);
                              }}
                            >
                              <Check
                                className={statusFilter === 'waiting' ? 'mr-2 h-4 w-4 opacity-100' : 'mr-2 h-4 w-4 opacity-0'}
                              />
                              Waiting
                            </CommandItem>
                            <CommandItem
                              value="testing"
                              onSelect={() => {
                                setStatusFilter('testing');
                                setStatusComboOpen(false);
                              }}
                            >
                              <Check
                                className={statusFilter === 'testing' ? 'mr-2 h-4 w-4 opacity-100' : 'mr-2 h-4 w-4 opacity-0'}
                              />
                              Testing
                            </CommandItem>
                            <CommandItem
                              value="done"
                              onSelect={() => {
                                setStatusFilter('done');
                                setStatusComboOpen(false);
                              }}
                            >
                              <Check
                                className={statusFilter === 'done' ? 'mr-2 h-4 w-4 opacity-100' : 'mr-2 h-4 w-4 opacity-0'}
                              />
                              Done
                            </CommandItem>
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
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
                      onClick={() => {
                        console.log('[File Import] Import button clicked');
                        console.log('[File Import] fileInputRef.current:', !!fileInputRef.current);
                        fileInputRef.current?.click();
                      }}
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

                {/* Pagination controls */}
                {totalPages > 1 && (
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 mb-3 p-2 bg-muted/30 rounded-md">
                    <div className="text-sm text-gray-600">
                      Showing {startIndex + 1}-{Math.min(endIndex, sortedActiveTasks.length)} of {sortedActiveTasks.length} tasks
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                        size="sm"
                        variant="outline"
                      >
                        First
                      </Button>
                      <Button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        size="sm"
                        variant="outline"
                      >
                        Previous
                      </Button>
                      <span className="text-sm px-2">
                        Page {currentPage} of {totalPages}
                      </span>
                      <Button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        size="sm"
                        variant="outline"
                      >
                        Next
                      </Button>
                      <Button
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage === totalPages}
                        size="sm"
                        variant="outline"
                      >
                        Last
                      </Button>
                    </div>
                  </div>
                )}

                {/* Today Tasks Section */}
                {todayTasks.length > 0 && (
                  <Card className="border-2 border-primary">
                    <CardHeader className="py-2 bg-primary/10">
                      <CardTitle className="text-sm">Today&apos;s Tasks ({todayTasks.length})</CardTitle>
                    </CardHeader>
                    <CardContent className="py-2">
                      <DragDropContext onDragEnd={() => {}}>
                        {isDesktop ? (
                          <div className="overflow-x-auto">
                            <Table className="w-full" style={{ minWidth: `${minTableWidth}px`, tableLayout: 'fixed' }}>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="px-0.5 relative group" style={{ width: `${columnWidths.checkbox}px`, minWidth: `${columnWidths.checkbox}px` }}>
                                    <Checkbox
                                      checked={todayTasks.length > 0 && todayTasks.every(t => selectedTaskIds.has(t.id))}
                                      onCheckedChange={() => handleToggleSelectAll(todayTasks)}
                                      aria-label="Select all today tasks"
                                    />
                                    <div
                                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                      onMouseDown={(e) => handleResizeStart('checkbox', e)}
                                    />
                                  </TableHead>
                                  <TableHead className="px-0.5 relative group" style={{ width: `${columnWidths.drag}px`, minWidth: `${columnWidths.drag}px` }}>
                                    <div
                                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                      onMouseDown={(e) => handleResizeStart('drag', e)}
                                    />
                                  </TableHead>
                                  <TableHead className="px-0.5 relative group cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800" style={{ width: `${columnWidths.priority}px`, minWidth: `${columnWidths.priority}px` }} onClick={() => handleSort('priority')}>
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger className="w-full h-full flex items-center justify-center">
                                          {getSortIcon('priority')}
                                        </TooltipTrigger>
                                        <TooltipContent>Overall Priority</TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                    <div
                                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                      onMouseDown={(e) => handleResizeStart('priority', e)}
                                    />
                                  </TableHead>
                                  <TableHead className="px-0.5 relative group cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800" style={{ width: `${columnWidths.category}px`, minWidth: `${columnWidths.category}px` }} onClick={() => handleSort('category')}>
                                    <div className="flex items-center gap-1">
                                      Category {getSortIcon('category')}
                                    </div>
                                    <div
                                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                      onMouseDown={(e) => handleResizeStart('category', e)}
                                    />
                                  </TableHead>
                                  <TableHead className="px-0.5 relative group" style={{ width: `${columnWidths.subcategory}px`, minWidth: `${columnWidths.subcategory}px` }}>
                                    <div className="flex items-center gap-1">
                                      Subcategory
                                    </div>
                                    <div
                                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                      onMouseDown={(e) => handleResizeStart('subcategory', e)}
                                    />
                                  </TableHead>
                                  <TableHead className="px-0.5 relative group" style={{ width: `${columnWidths.status}px`, minWidth: `${columnWidths.status}px` }}>
                                    Status
                                    <div
                                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                      onMouseDown={(e) => handleResizeStart('status', e)}
                                    />
                                  </TableHead>
                                  <TableHead className="px-0.5 relative group cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800" style={{ width: `${columnWidths.task}px`, minWidth: `${columnWidths.task}px` }} onClick={() => handleSort('task')}>
                                    <div className="flex items-center gap-1">
                                      Task {getSortIcon('task')}
                                    </div>
                                    <div
                                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                      onMouseDown={(e) => handleResizeStart('task', e)}
                                    />
                                  </TableHead>
                                  <TableHead className="px-0.5 relative group" style={{ width: `${columnWidths.today}px`, minWidth: `${columnWidths.today}px` }}>
                                    Today
                                    <div
                                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                      onMouseDown={(e) => handleResizeStart('today', e)}
                                    />
                                  </TableHead>
                                  <TableHead className="px-0.5 relative group text-right" style={{ width: `${columnWidths.actions}px`, minWidth: `${columnWidths.actions}px` }} title="Actions">
                                    Actions
                                    <div
                                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                      onMouseDown={(e) => handleResizeStart('actions', e)}
                                    />
                                  </TableHead>
                                </TableRow>
                              </TableHeader>
                              <Droppable droppableId="today-tasks">
                                {(provided) => (
                                  <TableBody ref={provided.innerRef} {...provided.droppableProps}>
                                    {todayTasks.map((task, idx) => (
                                      <TaskRow
                                        key={task.id}
                                        task={task}
                                        index={idx}
                                        handleTaskUpdate={handleTaskUpdate}
                                        handlePriorityChange={handlePriorityChange}
                                        handleAddTask={() => handleAddTask(task.id)}
                                        handleDeleteTask={() => handleDeleteTask(task.id)}
                                        focusCell={focusCell}
                                        isSelected={selectedTaskIds.has(task.id)}
                                        onToggleSelect={handleToggleTaskSelection}
                                        columnWidths={columnWidths}
                                        isTextWrapped={isTextWrapped}
                                        onToggleTextWrap={() => setIsTextWrapped(!isTextWrapped)}
                                        isEditing={task.id === editingTaskId}
                                        onEditingComplete={handleEditingComplete}
                                      />
                                    ))}
                                    {provided.placeholder}
                                  </TableBody>
                                )}
                              </Droppable>
                            </Table>
                          </div>
                        ) : (
                          <Droppable droppableId="today-tasks-mobile">
                            {(provided) => (
                              <div ref={provided.innerRef} {...provided.droppableProps}>
                                {todayTasks.map((task, index) => (
                                  <MobileTaskCard
                                    key={task.id}
                                    task={task}
                                    index={index}
                                    onUpdate={handleTaskUpdate}
                                    onDelete={handleDeleteTask}
                                    onAdd={() => handleAddTask(task.id)}
                                    onPriorityChange={handlePriorityChange}
                                    isTextWrapped={isTextWrapped}
                                    onToggleTextWrap={() => setIsTextWrapped(!isTextWrapped)}
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
                )}

                <Card>
                  <CardContent className="py-2">
                    <DragDropContext onDragEnd={handleDragEnd}>
                      {isDesktop ? (
                        <div className="overflow-x-auto">
                          <Table className="w-full" style={{ minWidth: `${minTableWidth}px`, tableLayout: 'fixed' }}>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="px-0.5 relative group" style={{ width: `${columnWidths.checkbox}px`, minWidth: `${columnWidths.checkbox}px` }}>
                                  <Checkbox
                                    checked={paginatedTasks.length > 0 && paginatedTasks.every(t => selectedTaskIds.has(t.id))}
                                    onCheckedChange={() => handleToggleSelectAll(paginatedTasks)}
                                    aria-label="Select all tasks"
                                  />
                                  <div
                                    className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onMouseDown={(e) => handleResizeStart('checkbox', e)}
                                  />
                                </TableHead>
                                <TableHead className="px-0.5 relative group" style={{ width: `${columnWidths.drag}px`, minWidth: `${columnWidths.drag}px` }}>
                                  <div
                                    className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onMouseDown={(e) => handleResizeStart('drag', e)}
                                  />
                                </TableHead>
                                <TableHead className="px-0.5 relative group cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800" style={{ width: `${columnWidths.priority}px`, minWidth: `${columnWidths.priority}px` }} onClick={() => handleSort('priority')}>
                                   <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger className="w-full h-full flex items-center justify-center">
                                        {getSortIcon('priority')}
                                      </TooltipTrigger>
                                      <TooltipContent>Overall Priority</TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                  <div
                                    className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onMouseDown={(e) => handleResizeStart('priority', e)}
                                  />
                                </TableHead>
                                <TableHead className="px-0.5 relative group cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800" style={{ width: `${columnWidths.category}px`, minWidth: `${columnWidths.category}px` }} onClick={() => handleSort('category')}>
                                  <div className="flex items-center gap-1">
                                    Category {getSortIcon('category')}
                                  </div>
                                  <div
                                    className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onMouseDown={(e) => handleResizeStart('category', e)}
                                  />
                                </TableHead>
                                <TableHead className="px-0.5 relative group" style={{ width: `${columnWidths.subcategory}px`, minWidth: `${columnWidths.subcategory}px` }}>
                                  <div className="flex items-center gap-1">
                                    Subcategory
                                  </div>
                                  <div
                                    className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onMouseDown={(e) => handleResizeStart('subcategory', e)}
                                  />
                                </TableHead>
                                <TableHead className="px-0.5 relative group" style={{ width: `${columnWidths.status}px`, minWidth: `${columnWidths.status}px` }}>
                                  Status
                                  <div
                                    className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onMouseDown={(e) => handleResizeStart('status', e)}
                                  />
                                </TableHead>
                                <TableHead className="px-0.5 relative group cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800" style={{ width: `${columnWidths.task}px`, minWidth: `${columnWidths.task}px` }} onClick={() => handleSort('task')}>
                                  <div className="flex items-center gap-1">
                                    Task {getSortIcon('task')}
                                  </div>
                                  <div
                                    className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onMouseDown={(e) => handleResizeStart('task', e)}
                                  />
                                </TableHead>
                                <TableHead className="px-0.5 relative group" style={{ width: `${columnWidths.today}px`, minWidth: `${columnWidths.today}px` }}>
                                  Today
                                  <div
                                    className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onMouseDown={(e) => handleResizeStart('today', e)}
                                  />
                                </TableHead>
                                <TableHead className="px-0.5 relative group text-right" style={{ width: `${columnWidths.actions}px`, minWidth: `${columnWidths.actions}px` }} title="Actions">
                                  Actions
                                  <div
                                    className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onMouseDown={(e) => handleResizeStart('actions', e)}
                                  />
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <Droppable droppableId="tasks">
                              {(provided) => (
                                <TableBody ref={provided.innerRef} {...provided.droppableProps}>
                                  {paginatedTasks.map((task, index) => (
                                    <TaskRow
                                      key={task.id}
                                      task={task}
                                      index={index}
                                      handleTaskUpdate={handleTaskUpdate}
                                      handlePriorityChange={handlePriorityChange}
                                      handleAddTask={() => handleAddTask(task.id)}
                                      handleDeleteTask={() => handleDeleteTask(task.id)}
                                      focusCell={focusCell}
                                      isSelected={selectedTaskIds.has(task.id)}
                                      onToggleSelect={handleToggleTaskSelection}
                                      columnWidths={columnWidths}
                                      isTextWrapped={isTextWrapped}
                                      onToggleTextWrap={() => setIsTextWrapped(!isTextWrapped)}
                                      isEditing={task.id === editingTaskId}
                                      onEditingComplete={handleEditingComplete}
                                    />
                                  ))}
                                  {provided.placeholder}
                                </TableBody>
                              )}
                            </Droppable>
                          </Table>
                        </div>
                      ) : (
                        <Droppable droppableId="tasks-mobile">
                          {(provided) => (
                            <div ref={provided.innerRef} {...provided.droppableProps}>
                              {paginatedTasks.map((task, index) => (
                                <MobileTaskCard
                                  key={task.id}
                                  task={task}
                                  index={index}
                                  onUpdate={handleTaskUpdate}
                                  onDelete={handleDeleteTask}
                                  onAdd={() => handleAddTask(task.id)}
                                  onPriorityChange={handlePriorityChange}
                                  isTextWrapped={isTextWrapped}
                                  onToggleTextWrap={() => setIsTextWrapped(!isTextWrapped)}
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
                            <Table className="w-full" style={{ minWidth: `${minTableWidth}px`, tableLayout: 'fixed' }}>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="px-0.5 relative group" style={{ width: `${columnWidths.checkbox}px`, minWidth: `${columnWidths.checkbox}px` }}>
                                    <Checkbox
                                      checked={doneTasks.length > 0 && doneTasks.every(t => selectedTaskIds.has(t.id))}
                                      onCheckedChange={() => handleToggleSelectAll(doneTasks)}
                                      aria-label="Select all archived tasks"
                                    />
                                    <div
                                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                      onMouseDown={(e) => handleResizeStart('checkbox', e)}
                                    />
                                  </TableHead>
                                  <TableHead className="px-0.5 relative group" style={{ width: `${columnWidths.drag}px`, minWidth: `${columnWidths.drag}px` }}>
                                    <div
                                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                      onMouseDown={(e) => handleResizeStart('drag', e)}
                                    />
                                  </TableHead>
                                  <TableHead className="px-0.5 relative group cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800" style={{ width: `${columnWidths.priority}px`, minWidth: `${columnWidths.priority}px` }} onClick={() => handleSort('priority')}>
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger className="w-full h-full flex items-center justify-center">
                                          {getSortIcon('priority')}
                                        </TooltipTrigger>
                                        <TooltipContent>Overall Priority</TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                    <div
                                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                      onMouseDown={(e) => handleResizeStart('priority', e)}
                                    />
                                  </TableHead>
                                  <TableHead className="px-0.5 relative group cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800" style={{ width: `${columnWidths.category}px`, minWidth: `${columnWidths.category}px` }} onClick={() => handleSort('category')}>
                                    <div className="flex items-center gap-1">
                                      Category {getSortIcon('category')}
                                    </div>
                                    <div
                                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                      onMouseDown={(e) => handleResizeStart('category', e)}
                                    />
                                  </TableHead>
                                  <TableHead className="px-0.5 relative group" style={{ width: `${columnWidths.subcategory}px`, minWidth: `${columnWidths.subcategory}px` }}>
                                    <div className="flex items-center gap-1">
                                      Subcategory
                                    </div>
                                    <div
                                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                      onMouseDown={(e) => handleResizeStart('subcategory', e)}
                                    />
                                  </TableHead>
                                  <TableHead className="px-0.5 relative group" style={{ width: `${columnWidths.status}px`, minWidth: `${columnWidths.status}px` }}>
                                    Status
                                    <div
                                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                      onMouseDown={(e) => handleResizeStart('status', e)}
                                    />
                                  </TableHead>
                                  <TableHead className="px-0.5 relative group cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800" style={{ width: `${columnWidths.task}px`, minWidth: `${columnWidths.task}px` }} onClick={() => handleSort('task')}>
                                    <div className="flex items-center gap-1">
                                      Task {getSortIcon('task')}
                                    </div>
                                    <div
                                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                      onMouseDown={(e) => handleResizeStart('task', e)}
                                    />
                                  </TableHead>
                                  <TableHead className="px-0.5 relative group" style={{ width: `${columnWidths.today}px`, minWidth: `${columnWidths.today}px` }}>
                                    Today
                                    <div
                                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                      onMouseDown={(e) => handleResizeStart('today', e)}
                                    />
                                  </TableHead>
                                  <TableHead className="px-0.5 relative group text-right" style={{ width: `${columnWidths.actions}px`, minWidth: `${columnWidths.actions}px` }} title="Actions">
                                    Actions
                                    <div
                                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                      onMouseDown={(e) => handleResizeStart('actions', e)}
                                    />
                                  </TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {doneTasks.map((task, index) => (
                                  <TaskRow
                                    key={task.id}
                                    task={task}
                                    index={index}
                                    isDraggable={false}
                                    handleTaskUpdate={handleTaskUpdate}
                                    handlePriorityChange={handlePriorityChange}
                                    handleAddTask={() => handleAddTask(task.id)}
                                    handleDeleteTask={() => handleDeleteTask(task.id)}
                                    focusCell={() => {}}
                                    isSelected={selectedTaskIds.has(task.id)}
                                    onToggleSelect={handleToggleTaskSelection}
                                    columnWidths={columnWidths}
                                    isTextWrapped={isTextWrapped}
                                    onToggleTextWrap={() => setIsTextWrapped(!isTextWrapped)}
                                    isEditing={task.id === editingTaskId}
                                    onEditingComplete={handleEditingComplete}
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
                  </TabsContent>

                  <TabsContent value="categories" className="mt-4">
                    <CategoriesManager 
                      tasks={allTasks} 
                      onMergeCategories={handleMergeCategories}
                    />
                  </TabsContent>
                </Tabs>
              </>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        )}
      </main>


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
              className="min-h-[400px] font-mono text-xs whitespace-pre"
              />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsExportModalOpen(false)}>Cancel</Button>
            <Button onClick={() => {
              navigator.clipboard.writeText(exportableMarkdown);
              toast.success("Copied to clipboard!");
            }}>
              Copy to Clipboard
            </Button>
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
    </div>
  );
}

// Trigger deployment - Fix drag-and-drop invariant error
