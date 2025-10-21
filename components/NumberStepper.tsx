'use client';

import React from 'react';
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

// Number input for priority - arrows/carets removed as per user request
const NumberStepper: React.FC<NumberStepperProps> = ({ value, onChange, onBlur, title }) => (
  <div className="flex items-center gap-2">
    {title && <span className="text-sm font-medium">{title}</span>}
    <Input
      type="number"
      value={value}
      onChange={(e) => onChange(parseInt(e.target.value, 10) || 0)}
      onBlur={onBlur}
      className="h-8 w-16 text-center"
    />
  </div>
);

export default NumberStepper; 