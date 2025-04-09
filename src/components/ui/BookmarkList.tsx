'use client';

import React, { useState } from 'react';
import { Bookmark, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DisplayMessage } from '@/components/chat/ChatMessage';

interface BookmarkListProps {
  markedMessages: DisplayMessage[];
  onJumpToMessage: (messageId: string) => void;
  onClose: () => void;
}

export const BookmarkList: React.FC<BookmarkListProps> = ({
  markedMessages,
  onJumpToMessage,
  onClose
}) => {
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 flex justify-between items-center border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <h3 className="font-medium text-base flex items-center whitespace-nowrap overflow-hidden">
          <Bookmark className="w-4 h-4 mr-2 flex-shrink-0 text-gray-500" />
          <span className="truncate text-gray-700 dark:text-gray-200">书签</span>
        </h3>
        <button 
          onClick={onClose} 
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 -mr-1 rounded"
        >
          <X className="w-4 h-4"/>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide p-2">
        {markedMessages.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 mt-8 p-2">
            <p>暂无标记内容</p>
            <p className="text-xs mt-2">点击消息旁的书签按钮可添加到大纲</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {markedMessages.map((message) => (
              <li
                key={message.id}
                className={cn(
                  "cursor-pointer rounded-lg p-2 transition-all duration-200",
                  hoveredItemId === message.id
                    ? "bg-gray-100/90 dark:bg-gray-700/90 scale-[1.02] shadow-sm"
                    : "bg-white/70 dark:bg-gray-900/70 hover:bg-gray-100/80 dark:hover:bg-gray-800/80"
                )}
                onClick={() => onJumpToMessage(message.id)}
                onMouseEnter={() => setHoveredItemId(message.id)}
                onMouseLeave={() => setHoveredItemId(null)}
              >
                <div className="flex items-start space-x-2">
                  <Bookmark className={cn(
                    "flex-shrink-0 mt-0.5 transition-all duration-200",
                    hoveredItemId === message.id
                      ? "w-[18px] h-[18px] text-blue-500"
                      : "w-4 h-4 text-blue-400/70"
                  )} />
                  <div className="min-w-0">
                    <div className={cn(
                      "font-medium transition-all duration-200 whitespace-nowrap overflow-hidden text-ellipsis",
                      hoveredItemId === message.id
                        ? "text-[15px] text-gray-800 dark:text-gray-100"
                        : "text-sm text-gray-600/90 dark:text-gray-300/90"
                    )}>
                      {message.summary || '未命名书签'}
                    </div>
                    <div className={cn(
                      "mt-1 line-clamp-2 transition-all duration-200",
                      hoveredItemId === message.id
                        ? "text-xs text-gray-700 dark:text-gray-200"
                        : "text-xs text-gray-500/70 dark:text-gray-400/70"
                    )}>
                      {message.content && message.content.length > 120
                        ? `${message.content.substring(0, 120)}...`
                        : message.content}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}; 