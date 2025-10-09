'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Merge, Search } from 'lucide-react';
import { Task } from '@/lib/markdown-parser';

interface CategoriesManagerProps {
  tasks: Task[];
  onMergeCategories: (categoriesToMerge: string[], targetCategory: string) => void;
}

export default function CategoriesManager({ tasks, onMergeCategories }: CategoriesManagerProps) {
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [targetCategory, setTargetCategory] = useState('');
  const [isMerging, setIsMerging] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Calculate category statistics
  const categoryStats = useMemo(() => {
    const stats = new Map<string, number>();
    tasks.forEach(task => {
      const category = task.category.trim();
      if (category) {
        stats.set(category, (stats.get(category) || 0) + 1);
      }
    });
    
    // Convert to array and sort alphabetically by name
    return Array.from(stats.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [tasks]);

  // Handle category selection
  const handleToggleCategory = (category: string) => {
    const newSelected = new Set(selectedCategories);
    if (newSelected.has(category)) {
      newSelected.delete(category);
    } else {
      newSelected.add(category);
    }
    setSelectedCategories(newSelected);
    
    // Auto-populate target category with the first selected one
    if (newSelected.size === 1) {
      setTargetCategory(category);
    }
  };

  // Handle merge action
  const handleMerge = async () => {
    if (selectedCategories.size < 2) {
      alert('Please select at least 2 categories to merge.');
      return;
    }
    
    if (!targetCategory.trim()) {
      alert('Please enter a target category name.');
      return;
    }

    setIsMerging(true);
    try {
      // Merge the selected categories into the target category
      onMergeCategories(Array.from(selectedCategories), targetCategory.trim());
      
      // Reset state
      setSelectedCategories(new Set());
      setTargetCategory('');
    } finally {
      setIsMerging(false);
    }
  };

  // Calculate total tasks for selected categories
  const selectedTaskCount = useMemo(() => {
    return categoryStats
      .filter(cat => selectedCategories.has(cat.name))
      .reduce((sum, cat) => sum + cat.count, 0);
  }, [categoryStats, selectedCategories]);

  // Filter categories based on search query
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categoryStats;
    const query = searchQuery.toLowerCase();
    return categoryStats.filter(cat => cat.name.toLowerCase().includes(query));
  }, [categoryStats, searchQuery]);

  return (
    <div className="space-y-4">
      {/* Merge Controls and Stats - Top Bar */}
      <Card className="border-0 shadow-none">
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-3">
            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-1">
                <span className="font-medium">{categoryStats.length}</span>
                <span>categories</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-medium">{tasks.length}</span>
                <span>tasks</span>
              </div>
              <div className="border-l pl-4 ml-1">
                {selectedCategories.size === 0 ? (
                  <span>No selection</span>
                ) : (
                  <span className="font-medium">
                    {selectedCategories.size} selected ({selectedTaskCount} tasks)
                  </span>
                )}
              </div>
            </div>
            <Input
              type="text"
              placeholder="Enter target category name..."
              value={targetCategory}
              onChange={(e) => setTargetCategory(e.target.value)}
              className="flex-1 h-9"
              disabled={selectedCategories.size < 2}
            />
            <Button
              onClick={handleMerge}
              disabled={isMerging || selectedCategories.size < 2 || !targetCategory.trim()}
              className="min-w-[120px] h-9"
            >
              {isMerging ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Merging...
                </>
              ) : (
                <>
                  <Merge className="h-4 w-4 mr-2" />
                  Merge
                </>
              )}
            </Button>
          </div>
          {selectedCategories.size > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {Array.from(selectedCategories).map(cat => (
                <span 
                  key={cat}
                  className="px-2 py-1 bg-blue-100 dark:bg-blue-900 rounded text-sm"
                >
                  {cat}
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Categories Table */}
      <Card className="border-0 shadow-none">
        <CardHeader>
          <CardTitle>All Categories ({categoryStats.length})</CardTitle>
          <CardDescription>
            Select multiple categories to merge them into one. All tasks will be updated to use the target category name.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9"
              />
            </div>

            {/* Categories Table */}
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Select</TableHead>
                    <TableHead>Category Name</TableHead>
                    <TableHead className="text-right">Task Count</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCategories.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-gray-500 py-8">
                        {categoryStats.length === 0 
                          ? 'No categories found. Add tasks with categories to get started.'
                          : 'No categories match your search.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCategories.map((category) => (
                    <TableRow 
                      key={category.name}
                      className={selectedCategories.has(category.name) ? 'bg-blue-50 dark:bg-blue-950' : ''}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedCategories.has(category.name)}
                          onCheckedChange={() => handleToggleCategory(category.name)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell className="text-right">{category.count}</TableCell>
                    </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

