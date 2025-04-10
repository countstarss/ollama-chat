'use client';

import React, { useState, useCallback } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useStarStore } from '@/store/useStarStore';
import { StarredMessage } from '@/services/starStorage';
import toastService from '@/services/toastService';

// 组件导入
import { SearchFilter } from './SearchFilter';
import { StarredMessageDialog } from './StarredMessageDialog';
import { ArrowLeft, Star } from 'lucide-react';
import { StarredMessageCard } from './StarredMessageCard';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export function StarredMessages() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentMessage, setCurrentMessage] = useState<StarredMessage | null>(null);
  const [isFiltered, setIsFiltered] = useState(false);
  const router = useRouter();
  
  // 使用Zustand store
  const { 
    starredMessages, 
    isLoading, 
    removeStar, 
    searchStars, 
    refreshStars 
  } = useStarStore();

  // 处理搜索
  const handleSearch = useCallback(async (query: string, dateRange: { from?: Date; to?: Date }) => {
    try {
      let timeRange: { start?: number; end?: number } = {};
      
      if (dateRange.from) {
        timeRange.start = dateRange.from.getTime();
      }
      if (dateRange.to) {
        const endDate = new Date(dateRange.to);
        endDate.setHours(23, 59, 59, 999);
        timeRange.end = endDate.getTime();
      }
      
      await searchStars(query, timeRange);
      setIsFiltered(!!query || !!dateRange.from || !!dateRange.to);
    } catch (error) {
      console.error('搜索收藏失败:', error);
      toastService.error('搜索失败');
    }
  }, [searchStars]);

  // 处理删除
  const handleDelete = useCallback(async (id: string) => {
    await removeStar(id);
    // 如果当前打开的模态框正在显示将被删除的消息，则关闭模态框
    if (currentMessage && currentMessage.id === id) {
      setIsModalOpen(false);
      setCurrentMessage(null);
    }
  }, [removeStar, currentMessage]);

  // 打开模态框查看完整内容
  const openModal = useCallback((message: StarredMessage) => {
    setCurrentMessage(message);
    setIsModalOpen(true);
  }, []);

  // 清除筛选
  const clearFilters = useCallback(() => {
    setIsFiltered(false);
    refreshStars();
  }, [refreshStars]);

  // 格式化时间
  const formatTime = useCallback((timestamp: number) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { 
        addSuffix: true,
        locale: zhCN 
      });
    } catch (error) {
      return '未知时间';
    }
  }, []);
  
  // 格式化时间 (带时间)
  const formatFullTime = useCallback((timestamp: number) => {
    try {
      return format(new Date(timestamp), 'yyyy年MM月dd日 HH:mm:ss', { locale: zhCN });
    } catch (error) {
      return '未知时间';
    }
  }, []);

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回聊天
          </Button>
          <h1 className="text-2xl font-bold flex items-center">
            <Star className="h-5 w-5 mr-2 text-yellow-500" />
            我的收藏
          </h1>
        </div>
      </div>
      
      <SearchFilter 
        onSearch={handleSearch}
        onClearFilters={clearFilters}
      />

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : starredMessages.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <Star className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-xl font-medium text-gray-500 dark:text-gray-400">暂无收藏内容</h3>
          <p className="text-gray-400 dark:text-gray-500 mt-2">
            {isFiltered
              ? '没有符合条件的收藏，请尝试其他搜索条件'
              : '在聊天中使用收藏按钮来保存重要内容'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto max-h-[calc(100vh-200px)] scrollbar-hide pb-24">
          {starredMessages.map((message) => (
            <StarredMessageCard
              key={message.id}
              message={message}
              onClick={() => openModal(message)}
              onDelete={() => handleDelete(message.id)}
              formatTime={formatTime}
            />
          ))}
        </div>
      )}

      <StarredMessageDialog
        message={currentMessage}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onDelete={handleDelete}
        formatFullTime={formatFullTime}
      />
    </div>
  );
} 