import React, { useState, useEffect } from 'react';
import { ChatMessage as ChatMessageType } from '@/lib/types';
import { cn } from "@/lib/utils"; 
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'; 
import { coldarkDark } from 'react-syntax-highlighter/dist/esm/styles/prism'; 

// 扩展消息类型以包含思考过程
export interface DisplayMessage extends ChatMessageType {
  thinkContent?: string;
  isThinkingComplete?: boolean;
  mainContent?: string; // 用于流式接收
}

interface ChatMessageProps {
  message: DisplayMessage;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const [isThinkingExpanded, setIsThinkingExpanded] = useState(false);

  // 当思考完成时自动折叠思考内容
  useEffect(() => {
    if (message.isThinkingComplete) {
      setIsThinkingExpanded(false);
    }
  }, [message.isThinkingComplete]);

  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  const isError = message.role === 'error';

  const bubbleClasses = cn(
    "p-3 rounded-lg max-w-[85%] md:max-w-[80%]", // 调整宽度
    "prose prose-sm dark:prose-invert prose-p:my-1 prose-headings:my-2 prose-pre:my-2 prose-pre:p-2 prose-pre:bg-gray-800 prose-pre:rounded", // Markdown 基础样式
    isUser ? "bg-blue-600 text-white self-end" : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 self-start",
    isError ? "bg-red-100 dark:bg-red-900 border border-red-500 text-red-700 dark:text-red-200 self-start prose-red" : ""
  );

  // 最终要显示的内容 (流式部分或完整内容)
  const contentToDisplay = message.mainContent ?? message.content;

  // Markdown 组件配置，包括代码高亮
  const markdownComponents = {
    code({ node, inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      return !inline && match ? (
        <SyntaxHighlighter
          style={coldarkDark} // 使用导入的主题
          language={match[1]}
          PreTag="div"
          {...props}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      ) : (
        <code className={className} {...props}>
          {children}
        </code>
      );
    },
  };

  return (
    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} mb-3`}>
      <div className={bubbleClasses}>
        {/* 思考过程部分 (仅助手消息且存在时显示) */}
        {isAssistant && message.thinkContent && (
          <details className="mb-2 border-b border-gray-300 dark:border-gray-600 pb-2" open={isThinkingExpanded}>
            <summary
              className="text-xs text-gray-500 dark:text-gray-400 cursor-pointer select-none italic"
              onClick={(e) => {
                // 阻止默认的 details 切换行为，手动控制状态
                e.preventDefault();
                // 仅当思考完成后才允许切换折叠状态
                if (message.isThinkingComplete) {
                    setIsThinkingExpanded(!isThinkingExpanded);
                }
              }}
            >
              思考过程... {!message.isThinkingComplete && "(进行中)"} {(message.isThinkingComplete && !isThinkingExpanded) && "(点击展开)"} {(message.isThinkingComplete && isThinkingExpanded) && "(点击折叠)"}
            </summary>
            {/* 使用 Markdown 渲染思考过程 */}
            <div className="mt-1 text-xs opacity-80">
              <ReactMarkdown components={markdownComponents} remarkPlugins={[remarkGfm]}>
                {message.thinkContent}
              </ReactMarkdown>
            </div>
          </details>
        )}

        {/* 主要内容部分 (使用 Markdown 渲染) */}
        <ReactMarkdown components={markdownComponents} remarkPlugins={[remarkGfm]}>
          {contentToDisplay}
        </ReactMarkdown>
      </div>
    </div>
  );
};

// --- 需要安装 markdown 和代码高亮库 ---
// pnpm add react-markdown remark-gfm react-syntax-highlighter