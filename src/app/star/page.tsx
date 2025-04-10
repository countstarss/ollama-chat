'use client';

import React, { useState } from 'react';
import { StarredMessage } from '@/services/starStorage';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Search, Star, TrashIcon, Calendar, ChevronDown, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { CopyButton } from '@/components/button/CopyButton';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'; 
import { coldarkDark } from 'react-syntax-highlighter/dist/esm/styles/prism'; 
import toastService from '@/services/toastService';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useStarStore } from '@/store/useStarStore';

export default function StarPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [showCalendar, setShowCalendar] = useState(false);
  
  // 模态框状态
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentMessage, setCurrentMessage] = useState<StarredMessage | null>(null);
  
  // 使用Zustand store
  const { 
    starredMessages, 
    isLoading, 
    removeStar, 
    searchStars, 
    refreshStars 
  } = useStarStore();

  // 处理搜索
  const handleSearch = async () => {
    try {
      let timeRange: { start?: number; end?: number } = {};
      
      if (dateRange.from) {
        timeRange.start = dateRange.from.getTime();
      }
      
      if (dateRange.to) {
        // 设置为当天的最后一刻
        const endDate = new Date(dateRange.to);
        endDate.setHours(23, 59, 59, 999);
        timeRange.end = endDate.getTime();
      }
      
      await searchStars(searchQuery, timeRange);
    } catch (error) {
      console.error('搜索收藏失败:', error);
      toastService.error('搜索失败');
    }
  };

  // 处理删除
  const handleDelete = async (id: string) => {
    await removeStar(id);
    // 如果当前打开的模态框正在显示将被删除的消息，则关闭模态框
    if (currentMessage && currentMessage.id === id) {
      setIsModalOpen(false);
      setCurrentMessage(null);
    }
  };

  // 打开模态框查看完整内容
  const openModal = (message: StarredMessage) => {
    setCurrentMessage(message);
    setIsModalOpen(true);
  };

  // 清除筛选
  const clearFilters = () => {
    setSearchQuery('');
    setDateRange({});
    refreshStars();
  };

  // 格式化时间
  const formatTime = (timestamp: number) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { 
        addSuffix: true,
        locale: zhCN 
      });
    } catch (error) {
      return '未知时间';
    }
  };
  
  // 格式化日期 (不带时间)
  const formatDate = (timestamp: number) => {
    try {
      return format(new Date(timestamp), 'yyyy年MM月dd日', { locale: zhCN });
    } catch (error) {
      return '未知日期';
    }
  };
  
  // 格式化时间 (带时间)
  const formatFullTime = (timestamp: number) => {
    try {
      return format(new Date(timestamp), 'yyyy年MM月dd日 HH:mm:ss', { locale: zhCN });
    } catch (error) {
      return '未知时间';
    }
  };

  // 日期范围文本
  const dateRangeText = () => {
    if (!dateRange.from && !dateRange.to) return '选择日期范围';
    
    if (dateRange.from && dateRange.to) {
      if (dateRange.from.getTime() === dateRange.to.getTime()) {
        return format(dateRange.from, 'yyyy-MM-dd');
      }
      return `${format(dateRange.from, 'yyyy-MM-dd')} 至 ${format(dateRange.to, 'yyyy-MM-dd')}`;
    }
    
    if (dateRange.from) {
      return `${format(dateRange.from, 'yyyy-MM-dd')} 起`;
    }
    
    if (dateRange.to) {
      return `截至 ${format(dateRange.to, 'yyyy-MM-dd')}`;
    }
    
    return '选择日期范围';
  };
  
  // Markdown 组件配置，包括代码高亮
  const markdownComponents = {
    code({ inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      return !inline && match ? (
        <div className="relative group">
          <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <CopyButton 
              text={String(children).replace(/\n$/, '')} 
              size="sm" 
              variant="subtle" 
              className="bg-gray-700 hover:bg-gray-600 text-white"
            />
          </div>
          <SyntaxHighlighter
            style={coldarkDark} // 使用导入的主题
            language={match[1]}
            PreTag="div"
            {...props}
          >
            {String(children).replace(/\n$/, '')}
          </SyntaxHighlighter>
        </div>
      ) : (
        <code className={className} {...props}>
          {children}
        </code>
      );
    },
  };

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

      {/* 搜索和筛选 */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="flex-1 flex gap-2">
          <Input
            placeholder="搜索收藏内容..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="flex-1"
            onKeyDown={e => {
              if (e.key === 'Enter') handleSearch();
            }}
          />
          <Button onClick={handleSearch}>
            <Search className="h-4 w-4 mr-2" />
            搜索
          </Button>
        </div>
        
        <div className="flex gap-2">
          <Popover open={showCalendar} onOpenChange={setShowCalendar}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[180px] justify-start">
                <Calendar className="h-4 w-4 mr-2" />
                <span className="truncate">{dateRangeText()}</span>
                <ChevronDown className="h-3.5 w-3.5 ml-auto opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                initialFocus
                mode="range"
                defaultMonth={dateRange.from}
                selected={dateRange.from && dateRange.to ? {
                  from: dateRange.from,
                  to: dateRange.to
                } : undefined}
                onSelect={(range: { from?: Date; to?: Date } | undefined) => {
                  setDateRange(range || {});
                  if (range?.to) {
                    setShowCalendar(false); // 选择完成后关闭日历
                  }
                }}
                numberOfMonths={2}
              />
              <div className="flex justify-end p-2 border-t">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    setDateRange({});
                    setShowCalendar(false);
                  }}
                  className="mr-2"
                >
                  清除
                </Button>
                <Button 
                  size="sm" 
                  onClick={() => {
                    handleSearch();
                    setShowCalendar(false);
                  }}
                >
                  应用
                </Button>
              </div>
            </PopoverContent>
          </Popover>
          
          <Button variant="ghost" onClick={clearFilters}>
            清除筛选
          </Button>
        </div>
      </div>

      {/* 收藏列表 */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : starredMessages.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <Star className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-xl font-medium text-gray-500 dark:text-gray-400">暂无收藏内容</h3>
          <p className="text-gray-400 dark:text-gray-500 mt-2">
            {searchQuery || dateRange.from || dateRange.to
              ? '没有符合条件的收藏，请尝试其他搜索条件'
              : '在聊天中使用收藏按钮来保存重要内容'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 overflow-y-auto max-h-[calc(100vh-200px)] scrollbar-hide pb-24">
          {starredMessages.map((message) => (
            <Card key={message.id} className="overflow-hidden">
              <CardHeader className="bg-gray-50 dark:bg-gray-800 px-4 py-3 flex flex-row justify-between items-center">
                <div className="flex items-center">
                  <Star className="h-4 w-4 text-yellow-500 mr-2" />
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {formatTime(message.createdAt)}
                  </span>
                </div>
                <div className="flex gap-2">
                  <CopyButton 
                    text={message.content} 
                    variant="outline" 
                    size="sm"
                    className="text-gray-400"
                  />
                  <button
                    onClick={() => handleDelete(message.id)}
                    className="h-6 w-6 p-1 rounded-md flex items-center justify-center text-red-500 hover:text-red-600 transition-colors duration-200"
                    title="删除收藏"
                  >
                    <TrashIcon className="h-full w-full" />
                  </button>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="whitespace-pre-wrap">
                  {message.content.length > 300
                    ? `${message.content.substring(0, 300)}...`
                    : message.content}
                </div>
              </CardContent>
              {message.content.length > 300 && (
                <CardFooter className="flex justify-end p-4 pt-0">
                  <button 
                    className="text-blue-500 hover:text-blue-600 text-sm font-medium"
                    onClick={() => openModal(message)}
                  >
                    查看更多
                  </button>
                </CardFooter>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* 完整内容查看模态框 */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader className="pb-2 border-b">
            <DialogTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              <span>收藏内容</span>
            </DialogTitle>
            <DialogDescription className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
              <span className="text-gray-500 dark:text-gray-400">
                收藏于 {currentMessage && formatFullTime(currentMessage.createdAt)}
              </span>
              <div className="flex gap-2">
                {currentMessage && (
                  <CopyButton 
                    text={currentMessage.content} 
                    variant="subtle" 
                    size="sm"
                    successText="已复制全部内容"
                  />
                )}
                {currentMessage && (
                  <button
                    onClick={() => handleDelete(currentMessage.id)}
                    className="h-6 w-6 p-1 rounded-md flex items-center justify-center text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-200"
                    title="删除收藏"
                  >
                    <TrashIcon className="h-full w-full" />
                  </button>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 flex-1 overflow-y-auto">
            <div className="prose prose-sm dark:prose-invert max-w-full">
              <ReactMarkdown 
                components={markdownComponents} 
                remarkPlugins={[remarkGfm]}
              >
                {currentMessage?.content || ''}
              </ReactMarkdown>
            </div>
          </div>
          <DialogFooter className="pt-2 border-t">
            <Button onClick={() => setIsModalOpen(false)} variant="outline">关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 