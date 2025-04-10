'use client';

import React, { useState } from 'react';
import { useSelectionStore } from '@/store/useSelectionStore';
import { Button } from '@/components/ui/button';
import { Layers, Star, X, ToggleLeft, ToggleRight, Combine } from 'lucide-react';
import { motion } from 'framer-motion';
import toastService from '@/services/toastService';

export function SelectionToolbar() {
  const { 
    isSelectionMode, 
    selectedMessages, 
    toggleSelectionMode, 
    clearSelection, 
    autoSelectEnabled,
    setAutoSelectEnabled,
    combineSelected,
    groupStarSelected
  } = useSelectionStore();

  const [isGroupStarring, setIsGroupStarring] = useState(false);

  // 如果不在选择模式，不渲染任何内容
  if (!isSelectionMode) return null;

  // 计算选择数量
  const selectionCount = selectedMessages.length;

  // 处理批量收藏
  const handleGroupStar = async () => {
    if (selectedMessages.length === 0 || isGroupStarring) return;
    
    setIsGroupStarring(true);
    try {
      // 使用 useSelectionStore 中的方法进行批量收藏
      await groupStarSelected();
    } finally {
      setIsGroupStarring(false);
    }
  };

  // 退出选择模式
  const handleExit = () => {
    toggleSelectionMode();
  };

  // 清除当前选择
  const handleClearSelection = () => {
    clearSelection();
  };

  // 切换自动选择功能
  const handleToggleAutoSelect = () => {
    setAutoSelectEnabled(!autoSelectEnabled);
  };

  return (
    <motion.div 
      className="w-[50vw] max-w-4xl mx-auto mb-4"
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 20, opacity: 0 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-full shadow-lg px-4 py-2 flex items-center gap-2 overflow-x-auto">
        {/* 显示选择计数 */}
        <div className="flex items-center bg-blue-100 dark:bg-blue-900 px-3 py-1 rounded-full">
          <Layers className="w-4 h-4 mr-1 text-blue-600 dark:text-blue-400" />
          <span className="text-sm font-medium text-blue-600 dark:text-blue-400 whitespace-nowrap">
            已选择 {selectionCount} 条消息
          </span>
        </div>

        {/* 自动选择开关 */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleToggleAutoSelect}
          className="gap-1.5 text-sm whitespace-nowrap"
          title={autoSelectEnabled ? "关闭自动选择" : "开启自动选择"}
        >
          {autoSelectEnabled ? (
            <>
              <ToggleRight className="w-4 h-4" />
              <span>自动选择</span>
            </>
          ) : (
            <>
              <ToggleLeft className="w-4 h-4" />
              <span>自动选择</span>
            </>
          )}
        </Button>

        {/* 批量操作按钮 */}
        <div className="h-6 border-l border-gray-300 dark:border-gray-600" />
        
        {/* 组合内容并复制 */}
        <Button
          onClick={() => {
            if (selectionCount > 0) {
              navigator.clipboard.writeText(combineSelected())
                .then(() => {
                  toastService.success('已复制对话内容');
                })
                .catch(() => {
                  toastService.error('复制失败');
                });
            }
          }}
          variant="default"
          size="sm"
          disabled={selectionCount === 0}
          className="gap-1.5 text-sm whitespace-nowrap"
        >
          <Combine className="w-4 h-4" />
          合并复制
        </Button>

        {/* 批量添加到收藏 */}
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-sm whitespace-nowrap"
          onClick={handleGroupStar}
          disabled={selectionCount === 0 || isGroupStarring}
        >
          {isGroupStarring ? (
            <>
              <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
              <span>收藏中...</span>
            </>
          ) : (
            <>
              <Star className="w-4 h-4" />
              <span>批量收藏</span>
            </>
          )}
        </Button>

        {/* 管理按钮 */}
        <div className="h-6 border-l border-gray-300 dark:border-gray-600" />
        
        {/* 清空选择 */}
        <Button 
          variant="ghost" 
          size="sm"
          onClick={handleClearSelection}
          disabled={selectionCount === 0}
          className="gap-1.5 text-sm whitespace-nowrap"
        >
          <Layers className="w-4 h-4" />
          <span>清空选择</span>
        </Button>
        
        {/* 退出选择模式 */}
        <Button 
          variant="ghost" 
          size="sm"
          onClick={handleExit}
          className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-500 gap-1.5 text-sm whitespace-nowrap"
        >
          <X className="w-4 h-4" />
          <span>退出</span>
        </Button>
      </div>
    </motion.div>
  );
} 