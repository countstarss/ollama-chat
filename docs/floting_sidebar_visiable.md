<think>我需要：

1. 创建一个全局状态来控制FloatingSidebar的显示/隐藏
2. 创建一个Hook来管理这个状态
3. 修改FloatingSidebar组件使其使用这个状态并添加动画
4. 在页面header中添加一个按钮来切换这个状态
5. 为ChatMessage组件添加条件类名(mr-16)，基于sidebar是否显示

我会按照以下步骤实现：

1. 首先创建一个Context和Hook来管理FloatingSidebar的显示状态
2. 修改FloatingSidebar组件来使用这个状态，添加动画效果
3. 修改ChatWindow组件，基于sidebar状态添加margin
4. 在page.tsx的header中添加一个按钮来切换状态

让我们开始：</think>首先，我需要创建一个全局状态Hook来管理FloatingSidebar的显示和隐藏状态。这样可以在不同组件间共享这个状态。

### 步骤1：创建FloatingSidebar上下文和Hook

```typescript jsx:src/components/context/floating-sidebar-context.tsx
"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

type FloatingSidebarContextType = {
  isFloatingSidebarVisible: boolean;
  toggleFloatingSidebar: () => void;
  showFloatingSidebar: () => void;
  hideFloatingSidebar: () => void;
};

const FloatingSidebarContext = createContext<FloatingSidebarContextType | undefined>(undefined);

export function FloatingSidebarProvider({ children }: { children: React.ReactNode }) {
  // 默认从localStorage中读取状态，如果没有则默认为true（显示）
  const [isFloatingSidebarVisible, setIsFloatingSidebarVisible] = useState<boolean>(true);
  
  // 组件加载时从localStorage读取状态
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedState = localStorage.getItem('floating-sidebar-visible');
      if (savedState !== null) {
        setIsFloatingSidebarVisible(savedState === 'true');
      }
    }
  }, []);
  
  // 保存状态到localStorage
  const saveToLocalStorage = useCallback((isVisible: boolean) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('floating-sidebar-visible', String(isVisible));
    }
  }, []);

  // 切换侧边栏显示状态
  const toggleFloatingSidebar = useCallback(() => {
    setIsFloatingSidebarVisible(prev => {
      const newState = !prev;
      saveToLocalStorage(newState);
      return newState;
    });
  }, [saveToLocalStorage]);
  
  // 显示侧边栏
  const showFloatingSidebar = useCallback(() => {
    setIsFloatingSidebarVisible(true);
    saveToLocalStorage(true);
  }, [saveToLocalStorage]);
  
  // 隐藏侧边栏
  const hideFloatingSidebar = useCallback(() => {
    setIsFloatingSidebarVisible(false);
    saveToLocalStorage(false);
  }, [saveToLocalStorage]);

  return (
    <FloatingSidebarContext.Provider 
      value={{ 
        isFloatingSidebarVisible, 
        toggleFloatingSidebar,
        showFloatingSidebar,
        hideFloatingSidebar
      }}
    >
      {children}
    </FloatingSidebarContext.Provider>
  );
}

export function useFloatingSidebar() {
  const context = useContext(FloatingSidebarContext);
  if (context === undefined) {
    throw new Error('useFloatingSidebar must be used within a FloatingSidebarProvider');
  }
  return context;
}
```
### 步骤2：在应用根组件中添加提供者

```typescript jsx:src/app/layout.tsx
// ... 保留原有的导入
import { FloatingSidebarProvider } from '@/components/context/floating-sidebar-context';

// ... 保留其他代码

// 在返回的JSX中包装FloatingSidebarProvider
return (
  <html lang="en" suppressHydrationWarning>
    <body className={inter.className}>
      <ThemeProvider 
        attribute="class" 
        defaultTheme="system" 
        enableSystem
        disableTransitionOnChange
      >
        <Toaster />
        <SidebarProvider>
          <FloatingSidebarProvider>
            {children}
          </FloatingSidebarProvider>
        </SidebarProvider>
      </ThemeProvider>
    </body>
  </html>
);
```
### 步骤3：修改FloatingSidebar组件添加动画效果

```typescript jsx:src/components/ui/FloatingSidebar.tsx
import React, { useState, useRef } from 'react';
import { ChevronUp, ChevronDown, Bookmark, BookmarkCheck, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DisplayMessage } from '@/components/chat/ChatMessage';
import { motion, AnimatePresence } from 'framer-motion';
import { BookmarkInput } from './BookmarkInput';
import { BookmarkList } from './BookmarkList';
import { useFloatingSidebar } from '@/components/context/floating-sidebar-context';

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
  
  // 使用FloatingSidebar状态钩子
  const { isFloatingSidebarVisible } = useFloatingSidebar();

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
    <motion.div 
      className="fixed right-4 md:right-8 top-1/2 -translate-y-1/2 z-20 pointer-events-none h-[60vh] max-h-[600px] select-none"
      animate={{
        translateX: isFloatingSidebarVisible ? 0 : '100%',
        opacity: isFloatingSidebarVisible ? 1 : 0
      }}
      transition={{
        duration: 0.3,
        ease: "easeInOut"
      }}
    >
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
              ? "bg-blue-600 hover:bg-blue-600/95 text-white"
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
    </motion.div>
  );
};
```
### 步骤4：修改ChatMessage组件，基于sidebar状态添加margin

```typescript jsx:src/components/chat/ChatMessage.tsx
// 在文件顶部导入useFloatingSidebar
import { useFloatingSidebar } from '@/components/context/floating-sidebar-context';

// ...保留其他代码

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, isActive = false, onInView }) => {
  const [isThinkingExpanded, setIsThinkingExpanded] = useState(true);
  const messageRef = useRef<HTMLDivElement>(null);
  
  // 使用FloatingSidebar状态钩子
  const { isFloatingSidebarVisible } = useFloatingSidebar();

  // ...保留其他代码

  // 添加外层容器的类
  const containerClasses = cn(
    "flex mb-3", 
    isUser ? "justify-end" : "justify-start", 
    "transition-all duration-300",
    isActive && "scroll-mt-16", // 当消息激活时添加滚动边距，避免被顶部元素遮挡
    isFloatingSidebarVisible && "mr-16 transition-all duration-300" // 当侧边栏可见时添加右边距
  );

  // ...保留其他代码
```
### 步骤5：在页面Header中添加切换FloatingSidebar的按钮

```typescript jsx:src/app/page.tsx
// 添加新的导入
import { SidebarRight, SidebarRightClose } from 'lucide-react';
import { useFloatingSidebar } from '@/components/context/floating-sidebar-context';

export default function Home() {
  // ...保留其他代码
  
  // 使用FloatingSidebar状态钩子
  const { isFloatingSidebarVisible, toggleFloatingSidebar } = useFloatingSidebar();
  
  // ...保留其他代码

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900 scrollbar-hide">
      <header className="p-2 border-b border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={toggleSidebar} className="h-8 w-8">
            {isCollapsed ? <Menu className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
          
          <EditableChatTitle 
            title={chatName} 
            onRename={handleRenameChat} 
          />
        </div>
        
        <div className="flex items-center gap-3">
          <ModelSelectorContainer 
            isLoading={isLoading}
            onModelChange={handleModelChange}
            isModelReady={isModelReady}
          />
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
            onClick={handleNewChat}
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">新建聊天</span>
          </Button>
          
          {/* 添加切换FloatingSidebar的按钮 */}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleFloatingSidebar}
            className="h-8 w-8 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            title={isFloatingSidebarVisible ? "隐藏工具栏" : "显示工具栏"}
          >
            {isFloatingSidebarVisible ? (
              <SidebarRightClose className="h-4 w-4" />
            ) : (
              <SidebarRight className="h-4 w-4" />
            )}
          </Button>
        
          <ModelSettingsButton isLoading={isLoading} />
        </div>
      </header>

      <ChatWindow 
        messages={messages} 
        ref={chatWindowRef}
        onSendMessage={handleSendMessage}
        onAbort={handleAbort}
        isLoading={isLoading}
        onBookmarkChange={handleBookmarkChange}
      />
    </div>
  );
```
修正Lucide图标导入问题：

```typescript jsx:src/app/page.tsx
// 修正图标导入
import { Menu, ChevronLeft, Plus, PanelRight, PanelRightClose } from 'lucide-react';
import { useFloatingSidebar } from '@/components/context/floating-sidebar-context';

// ... 保留其他代码

// 修正使用的图标名称
{isFloatingSidebarVisible ? (
  <PanelRightClose className="h-4 w-4" />
) : (
  <PanelRight className="h-4 w-4" />
)}
```
### 完美！我们已成功实现了所有功能。下面总结一下我们所做的修改：

## 功能实现总结

### 1. 创建了全局状态管理

- 创建了 `floating-sidebar-context.tsx` 文件，提供了一个Hook `useFloatingSidebar` 来管理FloatingSidebar的显示状态
- 实现了状态的本地存储，使得用户偏好可以被记住
- 提供了 `toggleFloatingSidebar`, `showFloatingSidebar`, 和 `hideFloatingSidebar` 方法

### 2. 增强了FloatingSidebar组件

- 将FloatingSidebar包装在motion.div中，添加了平滑的显示/隐藏动画
- 当状态为隐藏时，使用translateX(100%)将侧边栏移出视图
- 保留了原有的功能和动画效果

### 3. 调整了ChatMessage的布局

- 当侧边栏可见时，给ChatMessage添加了右边距 `mr-16`
- 添加了过渡动画 `transition-all duration-300`，使得边距变化平滑

### 4. 在页面Header中添加了控制按钮

- 添加了一个图标按钮来切换FloatingSidebar的显示/隐藏状态
- 使用了Lucide的 `PanelRight` 和 `PanelRightClose` 图标来直观表示当前状态
- 添加了悬停颜色变化和提示文字

### 5. 更新了应用根布局

- 修改了 `layout.tsx` 文件，添加了 `FloatingSidebarProvider` 以便全局访问状态

## 使用方法

现在，用户可以通过以下方式控制FloatingSidebar：

1. 点击页面头部的切换按钮来显示/隐藏侧边栏
2. 当侧边栏隐藏时，聊天消息会扩展到完整宽度
3. 当侧边栏显示时，聊天消息会自动留出右侧空间
4. 所有过渡都是平滑动画的，提供流畅的用户体验
5. 用户的偏好会被保存到localStorage中，下次访问时会保持相同状态

这个实现方案保持了代码的模块化和可维护性，使用了React的最佳实践（Context API、自定义Hooks、组件组合），并且提供了良好的用户体验。
