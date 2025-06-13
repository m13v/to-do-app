'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pause, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';

const hints = [
  "Edit any task directly.",
  "Drag and drop to reorder.",
  "Sort columns by clicking headers.",
  "Use AI to manage tasks.",
  "Filter tasks with the search.",
  "Add, duplicate, or delete tasks.",
  "Plan your day with AI.",
  "Export your tasks to markdown."
];

const AnimatedTitle = () => {
  const [index, setIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    const storedIsPlaying = localStorage.getItem('isTitleAnimationPlaying');
    if (storedIsPlaying !== null) {
      setIsPlaying(JSON.parse(storedIsPlaying));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('isTitleAnimationPlaying', JSON.stringify(isPlaying));
    if (isPlaying) {
      const interval = setInterval(() => {
        setIndex((prevIndex) => (prevIndex + 1) % hints.length);
      }, 4000); // Change hint every 4 seconds
      return () => clearInterval(interval);
    }
  }, [isPlaying]);

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const currentHint = hints[index];

  return (
    <div className="flex items-center gap-2">
      <h1 className="text-xl font-semibold">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.5 }}
          >
            {currentHint.split('').map((char, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.05, delay: i * 0.05 }}
              >
                {char}
              </motion.span>
            ))}
          </motion.div>
        </AnimatePresence>
      </h1>
      <Button onClick={togglePlayPause} variant="ghost" size="sm" className="h-7 w-7 p-0">
        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </Button>
    </div>
  );
};

export default AnimatedTitle; 