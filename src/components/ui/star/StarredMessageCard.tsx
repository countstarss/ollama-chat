import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { StarredMessage } from '@/services/starStorageService';
import { Trash2, Copy, Eye, ChevronsRight, Layers } from 'lucide-react';
import { EditableStarTitle } from './EditableStarTitle';
import { useStarStore } from '@/store/useStarStore';
import toastService from '@/services/toastService';
import { Button } from '../button';

interface StarredMessageCardProps {
  message: StarredMessage;
  onView?: (message: StarredMessage) => void;
  onNavigate?: () => void;
}

export const StarredMessageCard: React.FC<StarredMessageCardProps> = ({ 
  message, 
  onView,
  onNavigate 
}) => {
  const { removeStar } = useStarStore();
  
  // 计算相对时间
  const timeAgo = formatDistanceToNow(new Date(message.starredAt), {
    addSuffix: true,
    locale: zhCN
  });
  
  // 判断是否为集合类型
  const isCollection = message.isCollection || message.role === 'collection';
  
  // 预览消息内容，截取前100个字符
  const previewContent = message.mainContent || message.content;
  const truncatedContent = previewContent.length > 200 
    ? `${previewContent.substring(0, 200)}...` 
    : previewContent;
  
  // 复制消息内容
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(previewContent)
      .then(() => {
        toastService.success('已复制到剪贴板');
      })
      .catch(() => {
        toastService.error('复制失败');
      });
  };
  
  // 删除收藏消息
  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (confirm('确定要删除这条收藏消息吗？')) {
      const success = await removeStar(message.id);
      if (success) {
        toastService.success('收藏消息已删除');
      }
    }
  };
  
  // 查看消息详情
  const handleView = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onView) {
      onView(message);
    }
  };
  
  // 导航到原对话
  const handleNavigate = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onNavigate) return;
    
    // 无论是否为集合类型，都使用统一的导航方法
    // StarredMessages组件中的handleNavigateToChat方法将处理导航逻辑
    onNavigate();
  };
  
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3 hover:shadow-md transition-shadow duration-200 ${isCollection ? 'border-l-4 border-l-purple-500' : ''}`}>
      <div className="flex flex-col gap-2">
        {/* 标题和编辑按钮 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isCollection && (
              <Layers className="h-4 w-4 text-purple-500" />
            )}
            <EditableStarTitle 
              messageId={message.id} 
              title={message.title || '未命名'} 
            />
            
            {isCollection && (
              <span className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full">
                集合
              </span>
            )}
          </div>
          
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {timeAgo}
          </span>
        </div>
        
        {/* 消息内容预览 */}
        <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-4">
          {truncatedContent}
        </p>
        
        {/* 操作按钮 */}
        <div className="flex justify-end gap-2 pt-1">
          <Button
            onClick={handleCopy}
            variant="outline"
            className="h-8 w-8 p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors duration-200"
            title="复制内容"
          >
            <Copy size={16} />
          </Button>
          
          <Button
            onClick={handleView}
            variant="outline"
            className="h-8 w-8 p-1 text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors duration-200"
            title="查看详情"
          >
            <Eye size={16} />
          </Button>
          
          <Button
            onClick={handleNavigate}
            variant="outline"
            className="h-8 w-8 p-1 text-green-500 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 transition-colors duration-200"
            title="跳转到对话"
          >
            <ChevronsRight size={16} />
          </Button>
          
          <Button
            onClick={handleDelete}
            variant="outline"
            className="h-8 w-8 p-1 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors duration-200"
            title="删除收藏"
          >
            <Trash2 size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}; 