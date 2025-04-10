"use client";

import React from 'react';
import { Copy, Check } from 'lucide-react';
import { useCopy } from '@/hooks/useCopy';
import { cn } from '@/lib/utils';

interface CopyButtonProps {
  text: string;
  className?: string;
  successText?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'subtle' | 'outline';
}

export const CopyButton: React.FC<CopyButtonProps> = ({
  text,
  className,
  successText = '已复制!',
  size = 'md',
  variant = 'default',
}) => {
  const { copied, copy } = useCopy();
  
  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await copy(text);
  };

  // 大小映射
  const sizeClasses = {
    sm: 'h-6 w-6 p-1',
    md: 'h-8 w-8 p-1.5',
    lg: 'h-10 w-10 p-2',
  };
  
  // 变体映射
  const variantClasses = {
    default: 'bg-primary/90 hover:bg-primary text-primary-foreground',
    subtle: 'bg-primary/10 hover:bg-primary/20 text-primary',
    outline: 'bg-transparent border border-primary/30 hover:border-primary text-primary',
  };
  
  return (
    <button
      onClick={handleCopy}
      className={cn(
        'rounded-md flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/30',
        sizeClasses[size],
        variantClasses[variant],
        'opacity-80 hover:opacity-100',
        className
      )}
      title={copied ? successText : '复制内容'}
      type="button"
    >
      {copied ? <Check className="h-full w-full" /> : <Copy className="h-full w-full" />}
    </button>
  );
}; 