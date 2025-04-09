'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ChatWindow, ChatWindowHandle } from '@/components/ChatWindow';
import { ChatInput } from '@/components/ChatInput';
import { ApiRequestBody, ApiTaskType } from '@/lib/types';
import { DisplayMessage } from '@/components/ChatMessage'; // 导入扩展后的类型
import { v4 as uuidv4 } from 'uuid';
import { useStreamResponse } from '@/hooks/useStreamResponse';

type InteractionMode = "chat" | "json_analysis";

export default function Home() {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [mode, setMode] = useState<InteractionMode>("chat");
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  // 添加对ChatWindow的引用 - 修改为正确的类型
  const chatWindowRef = useRef<ChatWindowHandle>(null);
  
  // 使用新实现的hook
  const { sendStreamRequest } = useStreamResponse();

  const addMessage = useCallback((message: Omit<DisplayMessage, 'id'>) => {
    setMessages((prev) => [...prev, { ...message, id: uuidv4() }]);
  }, []);

  const updateLastMessage = useCallback((updater: (prevContent: DisplayMessage) => Partial<DisplayMessage>) => {
      setMessages(prevMessages => {
          if (prevMessages.length === 0) return prevMessages; // 防止空数组更新
          const lastMessageIndex = prevMessages.length - 1;
          // 确保只更新最后一条助手消息
          if(prevMessages[lastMessageIndex].role !== 'assistant') return prevMessages;

          const lastMessage = prevMessages[lastMessageIndex];
          const updates = updater(lastMessage);
          // 创建新数组以触发 React 更新
          const newMessages = [...prevMessages];
          newMessages[lastMessageIndex] = { ...lastMessage, ...updates };
          return newMessages;
      });
  }, []);

  // MARK: 中断当前请求
  const handleAbort = useCallback(() => {
    if (abortController) {
      console.log('aborting request...');
      abortController.abort();
      setAbortController(null);
      
      // 向用户显示请求已中断
      updateLastMessage(prev => ({
        mainContent: prev.mainContent + '\n\n[用户已中断回复]',
        isThinkingComplete: true
      }));
      
      setIsLoading(false);
    }
  }, [abortController, updateLastMessage]);

  const handleSendMessage = useCallback(async (userInput: string) => {
    const userMessage: DisplayMessage = { id: uuidv4(), role: 'user', content: userInput };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    // 创建新的AbortController
    const controller = new AbortController();
    setAbortController(controller);

    let requestBody: ApiRequestBody;
    let currentTask: ApiTaskType;

    // MARK: --- 准备请求体 ---
    if (mode === "json_analysis") {
      currentTask = "analyze_json_add_tags";
      try {
        const parsedJson = JSON.parse(userInput);
        if (typeof parsedJson.content !== 'string') {
          throw new Error('Input JSON must contain a "content" field (string).');
        }
        requestBody = { task: currentTask, payload: parsedJson };
      } catch (e) {
         console.error("Invalid JSON input:", e);
         addMessage({ role: 'error', content: `输入不是有效的 JSON 或缺少 "content" 字段。\n错误: ${e instanceof Error ? e.message : String(e)}` });
         setIsLoading(false);
         return;
      }
    } else {
      currentTask = "general_chat";
      // 简化：只发送当前用户消息，让后端处理历史（如果后端支持）
      // 或者在这里组装历史记录
       const historyToSend = messages.slice(-6) // 发送最近几条消息 + 当前消息
           .filter(m => m.role === 'user' || m.role === 'assistant') // 只发送用户和助手消息
           .map(m => ({ role: m.role, content: m.mainContent ?? m.content })); // 发送最终内容
       historyToSend.push({role: 'user', content: userInput});
      requestBody = { task: currentTask, payload: historyToSend };
    }

    // --- 添加助手消息占位符 ---
    let assistantMessageId = uuidv4();
    setMessages((prev) => [...prev, { id: assistantMessageId, role: 'assistant', content: '', thinkContent: '', mainContent: '', isThinkingComplete: false }]);

    // 发送消息后滚动到底部
    setTimeout(() => chatWindowRef.current?.scrollToBottom(), 100);

    try {
      // 使用新的useStreamResponse hook处理请求
      await sendStreamRequest(
        requestBody, 
        (updates: Partial<DisplayMessage>) => updateLastMessage(() => updates),
        controller
      );
      
      // 响应完成后再次滚动到底部
      setTimeout(() => chatWindowRef.current?.scrollToBottom(), 100);
    } catch (error) {
      console.error('Error in handleSendMessage:', error);
    } finally {
      setIsLoading(false);
      setAbortController(null); // 清除AbortController
    }
  }, [messages, addMessage, updateLastMessage, mode, sendStreamRequest]);

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900 scrollbar-hide">
      <header className="p-4 border-b border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 flex justify-between items-center sticky top-0 z-10">
        <h1 className="text-xl font-semibold">Ollama 助手 ({mode === 'chat' ? '对话' : 'JSON 分析'})</h1>
        <button
          onClick={() => setMode(prev => prev === 'chat' ? 'json_analysis' : 'chat')}
          className="px-3 py-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm"
          disabled={isLoading} // 在加载时禁用切换
        >
          切换到 {mode === 'chat' ? 'JSON 分析' : '对话'} 模式
        </button>
      </header>

      <ChatWindow 
        messages={messages} 
        ref={chatWindowRef}
      />

      <ChatInput 
        onSendMessage={handleSendMessage} 
        onAbort={handleAbort} 
        isLoading={isLoading} 
      />
    </div>
  );
}