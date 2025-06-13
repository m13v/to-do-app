'use client';

import { useState, useEffect } from 'react';

export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const media = window.matchMedia(query);
    setMatches(media.matches);
    
    const listener = () => {
      setMatches(media.matches);
    };
    
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [query]);

  // Return false during SSR and initial client render to prevent hydration mismatch
  return mounted ? matches : false;
} 