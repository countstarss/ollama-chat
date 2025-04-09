"use client";

import React, { useState, useRef } from 'react';
import { ChevronUp, ChevronDown, Bookmark, BookmarkCheck, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DisplayMessage } from '@/components/chat/ChatMessage';
import { motion, AnimatePresence } from 'framer-motion';
import { BookmarkInput } from './BookmarkInput';
import { BookmarkList } from './BookmarkList';

interface FloatingSidebarProps {
  onPrevious: () => void;
  onNext: () => void;
  onMark: () => void;
  isMarked: boolean;
  hasNext: boolean;
  hasPrevious: boolean;
  markedMessages: DisplayMessage[];
  onJumpToMessage: (messageId: string) => void;
  onSaveBookmark?: (bookmarkName: string) => void;
}

export const FloatingSidebar: React.FC<FloatingSidebarProps> = ({
  onPrevious,
  onNext,
  onMark,
  isMarked,
  hasNext,
  hasPrevious,
  markedMessages,
  onJumpToMessage,
  onSaveBookmark
}) => {
  const [isOutlineExpanded, setIsOutlineExpanded] = useState(false);
  const [showBookmarkInput, setShowBookmarkInput] = useState(false);
  const outlineRef = useRef<HTMLDivElement>(null);

  const toggleOutline = () => {
    setIsOutlineExpanded(!isOutlineExpanded);
  };

  // 处理书签按钮点击
  const handleBookmarkClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isMarked) {
      onMark(); // 如果已标记，则取消标记
    } else {
      setShowBookmarkInput(true); // 显示书签输入
    }
  };

  // 处理保存书签
  const handleSaveBookmark = (name: string) => {
    if (onSaveBookmark) {
      onSaveBookmark(name);
    } else {
      onMark(); // 如果没有提供onSaveBookmark，则使用默认标记方法
    }
    setShowBookmarkInput(false);
  };

  // 处理取消书签
  const handleCancelBookmark = () => {
    setShowBookmarkInput(false);
  };

  const springTransition = {
    type: "spring",
    stiffness: 260,
    damping: 25,
  };

  const outlineRightOffset = "right-14";

  return (
    <div className="fixed right-4 md:right-8 top-1/2 -translate-y-1/2 z-20 pointer-events-none h-[60vh] max-h-[600px] select-none">
      {/* 侧边按钮组 */}
      <div
        className={cn(
          "absolute top-1/2 right-0 -translate-y-1/2",
          "flex flex-col gap-2 md:gap-3 flex-shrink-0 pointer-events-auto"
        )}
      >
        {/* 上一条消息按钮 */}
        <button
          onClick={onPrevious}
          disabled={!hasPrevious}
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200",
            "bg-gray-200/85 dark:bg-gray-800/85 hover:bg-gray-300/90 dark:hover:bg-gray-700/90 shadow-md",
            !hasPrevious && "opacity-50 cursor-not-allowed"
          )}
          title="上一条消息"
        >
          <ChevronUp className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </button>

        {/* 下一条消息按钮 */}
        <button
          onClick={onNext}
          disabled={!hasNext}
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200",
            "bg-gray-200/85 dark:bg-gray-800/85 hover:bg-gray-300/90 dark:hover:bg-gray-700/90 shadow-md",
            !hasNext && "opacity-50 cursor-not-allowed"
          )}
          title="下一条消息"
        >
          <ChevronDown className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </button>

        {/* 书签按钮 */}
        <button
          onClick={handleBookmarkClick}
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 shadow-md",
            isMarked
              ? "bg-blue-500/90 hover:bg-blue-600/95 text-white"
              : "bg-gray-200/85 dark:bg-gray-800/85 hover:bg-gray-300/90 dark:hover:bg-gray-700/90"
          )}
          title={isMarked ? "取消标记" : "标记此消息"}
        >
          {isMarked ? (
            <BookmarkCheck className="w-5 h-5" />
          ) : (
            <Bookmark className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          )}
        </button>

        {/* 书签输入弹出层 */}
        <AnimatePresence>
          {showBookmarkInput && (
            <motion.div 
              className="absolute right-12 top-[72px] z-30 pointer-events-auto"
              initial={{ opacity: 0, scale: 0.9, x: 10 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.9, x: 10 }}
              transition={{ duration: 0.15 }}
            >
              <BookmarkInput 
                onSave={handleSaveBookmark}
                onCancel={handleCancelBookmark}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* 大纲按钮 */}
        <button
          onClick={toggleOutline}
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 shadow-md",
            isOutlineExpanded
              ? "bg-blue-500/90 hover:bg-blue-600/95 text-white"
              : "bg-gray-200/85 dark:bg-gray-800/85 hover:bg-gray-300/90 dark:hover:bg-gray-700/90"
          )}
          title={isOutlineExpanded ? "关闭大纲" : "打开大纲"}
        >
          {isOutlineExpanded ? (
            <X className="w-5 h-5" />
          ) : (
            <Menu className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          )}
        </button>
      </div>

      {/* 大纲面板 */}
      <AnimatePresence>
        {isOutlineExpanded && (
          <motion.div
            ref={outlineRef}
            key="outline-sidebar-content"
            className={cn(
              "absolute top-1/2 -translate-y-1/2",
              outlineRightOffset,
              "bg-white/90 dark:bg-gray-800/90 backdrop-blur-md shadow-lg rounded-lg h-[60vh] max-h-[600px] overflow-hidden w-64 pointer-events-auto"
            )}
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={springTransition}
          >
            <BookmarkList 
              markedMessages={markedMessages}
              onJumpToMessage={onJumpToMessage}
              onClose={toggleOutline}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};