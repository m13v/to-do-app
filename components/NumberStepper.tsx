'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface NumberStepperProps {
  value: number | string;
  onChange: (newValue: number) => void;
  min?: number;
  max?: number;
  title?: string;
}

const NumberStepper: React.FC<NumberStepperProps> = ({ value, onChange, min, max, title }) => (
  <div className="flex items-center gap-1">
    {title && <span className="text-sm font-medium">{title}</span>}
    <Button 
      onClick={() => onChange(Math.max(min ?? -Infinity, Number(value) - 1))} 
      size="sm" 
      variant="ghost" 
      className="h-5 w-5 p-0"
    >
      <ChevronDown className="h-4 w-4" />
    </Button>
    <span className="w-4 text-center">{value}</span>
    <Button 
      onClick={() => onChange(Math.min(max ?? Infinity, Number(value) + 1))} 
      size="sm" 
      variant="ghost" 
      className="h-5 w-5 p-0"
    >
      <ChevronUp className="h-4 w-4" />
    </Button>
  </div>
);

export default NumberStepper; 