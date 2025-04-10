"use client";

import React, { useState, useEffect } from 'react';
import { Star, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStarStore } from '@/store/useStarStore';

interface StarButtonProps {
  text: string;
  className?: string;
  successText?: string;
  errorText?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'subtle' | 'outline';
  tags?: string[];
  isStarred?: boolean;
  setIsStarred?: (isStarred: boolean) => void;
}

export function StarButton({
  text,
  className,
  // successText = '已收藏',
  // errorText = '收藏失败',
  size = 'md',
  variant = 'default',
  tags = [],
  isStarred = false,
  setIsStarred = () => {},
}: StarButtonProps) {
  // 使用Zustand store
  const { addStar, checkIfStarred } = useStarStore();
  const [isStarring, setIsStarring] = useState(false);

  // 组件加载时检查是否已收藏
  useEffect(() => {
    const checkStarStatus = async () => {
      const starred = await checkIfStarred(text);
      setIsStarred(starred);
    };
    
    checkStarStatus();
  }, [checkIfStarred, text, setIsStarred]);

  // 点击处理
  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isStarring) return; // 防止重复点击
    
    setIsStarring(true);
    try {
      const result = await addStar(text, tags);
      if (result) {
        setIsStarred(true);
      }
    } finally {
      setIsStarring(false);
    }
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
  
  // 星标状态的独特样式
  const starredStyles = isStarred ? 
    'text-yellow-500 fill-yellow-500' : 
    '';

  return (
    <button
      onClick={handleClick}
      className={cn(
        isStarred ? 'fill-yellow-500' : '',
        'rounded-md flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/30',
        sizeClasses[size],
        variantClasses[variant],
        'opacity-80 hover:opacity-100',
        starredStyles,
        className
      )}
      title={isStarred ? "已收藏" : "收藏内容"}
      type="button"
      disabled={isStarring}
    >
      {isStarring ? (
        <Loader2 className="h-full w-full animate-spin" />
      ) : (
        isStarred ? <Star className="h-full w-full fill-yellow-500" /> : <Star className="h-full w-full" />
      )}
    </button>
  );
} 