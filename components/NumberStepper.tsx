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
  <div className="flex items-center gap-2">
    {title && <span className="text-sm font-medium">{title}</span>}
    <span className="min-w-[2rem] text-center">{value}</span>
    <div className="flex flex-col items-center justify-center">
      <Button
        onClick={() => onChange(Math.min(max ?? Infinity, Number(value) + 1))}
        size="sm"
        variant="ghost"
        className="h-4 w-4 p-0"
      >
        <ChevronUp className="h-3 w-3" />
      </Button>
      <Button
        onClick={() => onChange(Math.max(min ?? -Infinity, Number(value) - 1))}
        size="sm"
        variant="ghost"
        className="h-4 w-4 p-0"
      >
        <ChevronDown className="h-3 w-3" />
      </Button>
    </div>
  </div>
);

export default NumberStepper; 