'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Merge } from 'lucide-react';
import { Task } from '@/lib/markdown-parser';

interface CategoriesManagerProps {
  tasks: Task[];
  onMergeCategories: (categoriesToMerge: string[], targetCategory: string) => void;
}

export default function CategoriesManager({ tasks, onMergeCategories }: CategoriesManagerProps) {
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [targetCategory, setTargetCategory] = useState('');
  const [isMerging, setIsMerging] = useState(false);

  // Calculate category statistics
  const categoryStats = useMemo(() => {
    const stats = new Map<string, number>();
    tasks.forEach(task => {
      const category = task.category.trim();
      if (category) {
        stats.set(category, (stats.get(category) || 0) + 1);
      }
    });
    
    // Convert to array and sort by task count (descending)
    return Array.from(stats.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
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

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Category Management</CardTitle>
          <CardDescription>
            Select multiple categories to merge them into one. All tasks in the selected categories will be updated to use the target category name.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
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
                  {categoryStats.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-gray-500 py-8">
                        No categories found. Add tasks with categories to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    categoryStats.map((category) => (
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

            {/* Merge Action Section */}
            {selectedCategories.size > 0 && (
              <Card className="border-2 border-blue-500 bg-blue-50 dark:bg-blue-950">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold mb-2">
                        Selected {selectedCategories.size} {selectedCategories.size === 1 ? 'category' : 'categories'} ({selectedTaskCount} tasks)
                      </h3>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {Array.from(selectedCategories).map(cat => (
                          <span 
                            key={cat}
                            className="px-2 py-1 bg-blue-200 dark:bg-blue-800 rounded text-sm"
                          >
                            {cat}
                          </span>
                        ))}
                      </div>
                    </div>

                    {selectedCategories.size >= 2 && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          Merge into category name:
                        </label>
                        <div className="flex gap-2">
                          <Input
                            type="text"
                            placeholder="Enter target category name..."
                            value={targetCategory}
                            onChange={(e) => setTargetCategory(e.target.value)}
                            className="flex-1"
                          />
                          <Button
                            onClick={handleMerge}
                            disabled={isMerging || !targetCategory.trim()}
                            className="min-w-[120px]"
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
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          This will update all {selectedTaskCount} tasks in the selected categories to use &quot;{targetCategory.trim() || '...'}&quot; as their category.
                        </p>
                      </div>
                    )}

                    {selectedCategories.size === 1 && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Select at least one more category to enable merging.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Statistics Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600 dark:text-gray-400">Total Categories:</span>
              <span className="ml-2 font-semibold">{categoryStats.length}</span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Total Tasks:</span>
              <span className="ml-2 font-semibold">{tasks.length}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

