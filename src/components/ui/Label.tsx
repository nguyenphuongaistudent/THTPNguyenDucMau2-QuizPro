import React from 'react';
import { cn } from '../../lib/utils';

interface LabelProps extends React.ComponentPropsWithoutRef<'label'> {
  className?: string;
  children?: React.ReactNode;
  htmlFor?: string;
}

export function Label({ className, children, ...props }: LabelProps) {
  return (
    <label
      className={cn(
        "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-700",
        className
      )}
      {...props}
    >
      {children}
    </label>
  );
}
