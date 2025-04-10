'use client';

import React from 'react';
import { Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSelectionStore } from '@/store/useSelectionStore';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function SelectionModeToggle() {
  const { isSelectionMode, toggleSelectionMode } = useSelectionStore();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={isSelectionMode ? "default" : "ghost"}
            size="icon"
            onClick={toggleSelectionMode}
            className={`h-8 w-8 ${
              isSelectionMode 
                ? "bg-blue-500 text-white hover:bg-blue-600" 
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            <Layers className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{isSelectionMode ? "退出选择模式" : "消息选择模式"}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
} 