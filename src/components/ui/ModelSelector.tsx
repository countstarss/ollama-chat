'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronUp, Plus, Trash2, Edit } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ModelConfig } from '@/hooks/useModelConfig';

interface ModelSelectorProps {
  models: ModelConfig[];
  selectedModelId: string;
  onSelectModel: (id: string) => void;
  onAddModel: () => void;
  onEditModel: (id: string) => void;
  onDeleteModel: (id: string) => void;
  isLoading?: boolean;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  models,
  selectedModelId,
  onSelectModel,
  onAddModel,
  onEditModel,
  onDeleteModel,
  isLoading = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // 处理下拉菜单的点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // 获取当前选中的模型
  const selectedModel = models.find(model => model.id === selectedModelId) || models[0];
  
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors",
          isLoading && "opacity-70 cursor-not-allowed"
        )}
        onClick={() => !isLoading && setIsOpen(!isOpen)}
        disabled={isLoading}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="font-medium truncate max-w-[150px] md:max-w-xs">
          {selectedModel?.name || "选择模型"}
        </span>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        )}
      </button>
      
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-56 p-2 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-20">
          <div className="max-h-60 overflow-y-auto scrollbar-hide">
            {models.map(model => (
              <div 
                key={model.id}
                className={cn(
                  "flex items-center justify-between cursor-pointer p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 group",
                  model.id === selectedModelId && "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                )}
              >
                <div 
                  className="flex-1"
                  onClick={() => {
                    onSelectModel(model.id);
                    setIsOpen(false);
                  }}
                >
                  <div className="font-medium text-sm text-gray-800 dark:text-gray-200">
                    {model.name}
                  </div>
                  {model.description && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {model.description}
                    </div>
                  )}
                </div>
                
                <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditModel(model.id);
                    }}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full text-gray-600 dark:text-gray-400"
                    title="编辑模型"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  
                  {/* 只有非默认模型才能删除 */}
                  {!model.id.startsWith('default-') && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteModel(model.id);
                      }}
                      className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full text-red-500"
                      title="删除模型"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          <div className="border-t border-gray-200 dark:border-gray-700 mt-2 pt-2">
            <button
              onClick={() => {
                setIsOpen(false);
                onAddModel();
              }}
              className="flex items-center gap-2 w-full py-2 px-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>添加模型</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}; 