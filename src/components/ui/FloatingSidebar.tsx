"use client";

import React, { useState, useRef } from 'react';
import { ChevronUp, ChevronDown, Bookmark, BookmarkCheck, Menu, X } from 'lucide-react'; // 保持 lucide-react
import { cn } from '@/lib/utils';
import { DisplayMessage } from '@/components/ChatMessage'; // 保持原有类型引用
import { motion, AnimatePresence } from 'framer-motion'; // 引入 framer-motion

interface FloatingSidebarProps {
  onPrevious: () => void;
  onNext: () => void;
  onMark: () => void;
  isMarked: boolean;
  hasNext: boolean;
  hasPrevious: boolean;
  markedMessages: DisplayMessage[];
  onJumpToMessage: (messageId: string) => void;
}

export const FloatingSidebar: React.FC<FloatingSidebarProps> = ({
  onPrevious,
  onNext,
  onMark,
  isMarked,
  hasNext,
  hasPrevious,
  markedMessages,
  onJumpToMessage
}) => {
  const [isOutlineExpanded, setIsOutlineExpanded] = useState(false);
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  const outlineRef = useRef<HTMLDivElement>(null);

  const toggleOutline = () => {
    setIsOutlineExpanded(!isOutlineExpanded);
  };

  // 弹性动画过渡效果 (保持不变)
  const springTransition = {
    type: "spring",
    stiffness: 260,
    damping: 25,
  };

  const outlineRightOffset = "right-14"; // 2.5rem (w-10) + 1rem (mr-4) = 3.5rem => 14 * 0.25rem = 3.5rem

  return (
    // 1. 外层锚点容器：保持 fixed 定位和垂直居中，移除 flex 布局
    <div className="fixed right-4 md:right-8 top-1/2 -translate-y-1/2 z-20 pointer-events-none h-[60vh] max-h-[600px] select-none"> {/* 可以限制最大高度 */}

      <div
        className={cn(
            "absolute top-1/2 right-0 -translate-y-1/2", // 绝对定位并垂直居中
            "flex flex-col gap-2 md:gap-3 flex-shrink-0 pointer-events-auto" // 保持内部 flex 布局
        )}
       >
        {/* --- 按钮代码保持不变，使用 Lucide 图标和原有样式 --- */}
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

        <button
          onClick={onMark}
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
        {/* --- 结束按钮代码 --- */}
      </div>

      {/* 3. 大纲内容区域：绝对定位，位于按钮组左侧，独立动画 */}
      <AnimatePresence>
        {isOutlineExpanded && (
          <motion.div
            ref={outlineRef}
            key="outline-sidebar-content-abs" // 更新 key
            // 添加绝对定位，并计算 right 值使其位于按钮左侧 (w-10 + gap-3 or mr-4)
            className={cn(
                "absolute top-1/2 -translate-y-1/2", // 绝对定位并垂直居中
                outlineRightOffset, // 例如 "right-14" (3.5rem)
                "bg-white/90 dark:bg-gray-800/90 backdrop-blur-md shadow-lg rounded-lg h-[60vh] max-h-[600px] overflow-hidden w-64 pointer-events-auto" // 保持样式
            )}
            // Framer Motion 动画属性 (保持不变，现在相对其绝对定位的位置进行动画)
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={springTransition}
          >
            {/* --- 大纲内部结构和内容保持不变 --- */}
            <div className="flex flex-col h-full">
              <div className="p-3 flex justify-between items-center border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                <h3 className="font-medium text-base flex items-center whitespace-nowrap overflow-hidden">
                  <Bookmark className="w-4 h-4 mr-2 flex-shrink-0 text-gray-500" />
                  <span className="truncate text-gray-700 dark:text-gray-200">内容大纲</span>
                </h3>
                 <button onClick={toggleOutline} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 -mr-1 rounded">
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
                        onClick={() => {
                          onJumpToMessage(message.id);
                        }}
                        onMouseEnter={() => setHoveredItemId(message.id)}
                        onMouseLeave={() => setHoveredItemId(null)}
                      >
                        {/* ... 列表项内部结构 ... */}
                        <div className="flex items-start space-x-2">
                          <Bookmark className={cn(
                            "flex-shrink-0 mt-0.5 transition-all duration-200",
                             hoveredItemId === message.id
                              ? "w-[18px] h-[18px] text-blue-500"
                              : "w-4 h-4 text-blue-400/70"
                          )} />
                          <div className="min-w-0">
                            {/* ... 标题和内容 ... */}
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
          </motion.div>
        )}
      </AnimatePresence>
      {/* 结束大纲内容区域 */}

    </div>
  );
};

// 确保 framer-motion 已安装: pnpm add framer-motion