'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface NumberStepperProps {
  value: number | string;
  onChange: (newValue: number) => void;
  onBlur?: () => void;
  min?: number;
  max?: number;
  title?: string;
}

const NumberStepper: React.FC<NumberStepperProps> = ({ value, onChange, onBlur, min, max, title }) => (
  <div className="flex items-center gap-2">
    {title && <span className="text-sm font-medium">{title}</span>}
    <Input
      type="number"
      value={value}
      onChange={(e) => onChange(parseInt(e.target.value, 10) || 0)}
      onBlur={onBlur}
      className="h-8 w-16 text-center"
    />
    <div className="flex items-center justify-center">
      <Button
        onClick={() => onChange(Math.max(min ?? -Infinity, Number(value) - 1))}
        size="sm"
        variant="ghost"
        className="h-5 w-5 p-0"
      >
        <ChevronDown className="h-4 w-4" />
      </Button>
      <Button
        onClick={() => onChange(Math.min(max ?? Infinity, Number(value) + 1))}
        size="sm"
        variant="ghost"
        className="h-5 w-5 p-0"
      >
        <ChevronUp className="h-4 w-4" />
      </Button>
    </div>
  </div>
);

export default NumberStepper; 