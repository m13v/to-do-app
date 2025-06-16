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
  showLabels?: boolean;
}

const NumberStepper: React.FC<NumberStepperProps> = ({ value, onChange, onBlur, min, max, title, showLabels = false }) => (
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
        className={showLabels ? "h-6 px-2" : "h-5 w-5 p-0"}
      >
        <ChevronDown className={showLabels ? "h-4 w-4 mr-1" : "h-4 w-4"} />
        {showLabels && 'Down'}
      </Button>
      <Button
        onClick={() => onChange(Math.min(max ?? Infinity, Number(value) + 1))}
        size="sm"
        variant="ghost"
        className={showLabels ? "h-6 px-2" : "h-5 w-5 p-0"}
      >
        <ChevronUp className={showLabels ? "h-4 w-4 mr-1" : "h-4 w-4"} />
        {showLabels && 'Up'}
      </Button>
    </div>
  </div>
);

export default NumberStepper; 