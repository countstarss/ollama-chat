import React, { useState, useEffect } from 'react';
import { ChatMessage as ChatMessageType } from '@/lib/types';
import { cn } from "@/lib/utils"; 
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'; 
import { coldarkDark } from 'react-syntax-highlighter/dist/esm/styles/prism'; 
import { CopyButton } from './ui/CopyButton';
import Image from 'next/image';

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
  const [isThinkingExpanded, setIsThinkingExpanded] = useState(true);

  // 当思考完成时自动折叠思考内容
  useEffect(() => {
    if (message.isThinkingComplete) {
      setIsThinkingExpanded(false);
    }
  }, [message.isThinkingComplete]);

  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  const isError = message.role === 'error';

  // 获取头像URL
  const getAvatarUrl = () => {
    if (isUser) {
      return 'https://avatar.vercel.sh/user?size=32';
    } else if (isAssistant) {
      return 'https://avatar.vercel.sh/ollama?size=32';
    } else {
      return 'https://avatar.vercel.sh/error?size=32';
    }
  };

  const bubbleClasses = cn(
    "p-3 rounded-lg", // 调整宽度
    "prose prose-sm dark:prose-invert prose-p:my-1 prose-headings:my-2 prose-pre:my-2 prose-pre:p-2 prose-pre:bg-gray-800 prose-pre:rounded", // Markdown 基础样式
    isUser ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100",
    isError ? "bg-red-100 dark:bg-red-900 border border-red-500 text-red-700 dark:text-red-200 prose-red" : ""
  );

  // 最终要显示的内容 (流式部分或完整内容)
  const contentToDisplay = message.mainContent ?? message.content;

  // Markdown 组件配置，包括代码高亮
  const markdownComponents = {
    code({ node, inline, className, children, ...props }: any) {
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
    <div className={`flex mb-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {/* 非用户消息时，左侧显示头像 */}
      {!isUser && (
        <div className="flex-shrink-0 mr-2">
          <div className="w-8 h-8 rounded-full overflow-hidden">
            <Image 
              src={getAvatarUrl()} 
              alt={isAssistant ? "AI" : "Error"} 
              width={32} 
              height={32}
              className={cn(
                "w-full h-full",
                isError ? "border border-red-500" : ""
              )}
            />
          </div>
        </div>
      )}
      
      <div className="flex flex-col max-w-[75%]">
        <div className={bubbleClasses}>
          {/* 思考过程部分 (仅助手消息且存在时显示) */}
          {isAssistant && message.thinkContent && (
            <details className="mb-2 border-b border-gray-300 dark:border-gray-600 pb-2" open={isThinkingExpanded}>
              <summary
                className="text-xs text-gray-500 dark:text-gray-400 cursor-pointer select-none italic"
                onClick={(e) => {
                  // 阻止默认的 details 切换行为，手动控制状态
                  e.preventDefault();
                }}
              >
                思考过程... {!message.isThinkingComplete && "(进行中)"} {(message.isThinkingComplete && !isThinkingExpanded) && "(点击展开)"} {(message.isThinkingComplete && isThinkingExpanded) && "(点击折叠)"}
              </summary>
              {/* 使用 Markdown 渲染思考过程 */}
              <div className="mt-1 text-xs opacity-80 relative group">
                {/* 思考内容复制按钮 */}
                {message.thinkContent && message.thinkContent.trim().length > 0 && isThinkingExpanded && (
                  <div className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <CopyButton 
                      text={message.thinkContent} 
                      size="sm" 
                      variant="subtle" 
                      className="text-gray-500"
                    />
                  </div>
                )}
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
          
          {/* 消息底部的复制按钮 - 常驻显示 */}
          {contentToDisplay && contentToDisplay.trim().length > 0 && (
            <div className="flex justify-end mt-2">
              <CopyButton 
                text={contentToDisplay} 
                size="sm" 
                variant={isUser ? "outline" : "subtle"}
                className={isUser ? "text-white bg-blue-700/50" : "text-gray-400 bg-gray-800/30"}
                successText="已复制全部内容"
              />
            </div>
          )}
        </div>
      </div>
      
      {/* 用户消息时，右侧显示头像 */}
      {isUser && (
        <div className="flex-shrink-0 ml-2">
          <div className="w-8 h-8 rounded-full overflow-hidden">
            <Image 
              src={getAvatarUrl()} 
              alt="User" 
              width={32} 
              height={32}
              className="w-full h-full"
            />
          </div>
        </div>
      )}
    </div>
  );
};