'use client';

import React, { useState, useCallback } from 'react';
import { ChatWindow } from '@/components/ChatWindow';
import { ChatInput } from '@/components/ChatInput';
import { ApiRequestBody, ApiTaskType } from '@/lib/types';
import { DisplayMessage } from '@/components/ChatMessage'; // 导入扩展后的类型
import { v4 as uuidv4 } from 'uuid';

type InteractionMode = "chat" | "json_analysis";

export default function Home() {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [mode, setMode] = useState<InteractionMode>("chat");
  const [abortController, setAbortController] = useState<AbortController | null>(null);

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

  // 中断当前请求
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

    // --- 准备请求体 (与之前类似) ---
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

    // --- 处理流式响应 ---
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: controller.signal // 添加AbortController信号
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || errorData.error || `API request failed with status ${response.status}`);
      }
      if (!response.body) {
        throw new Error("Response body is null");
      }

      // --- SSE 流处理逻辑 ---
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let partialLine = ''; // 用于处理跨块的行

      let isParsingThinking = false;
      let currentThinkContent = '';
      let currentMainContent = ''; // 用于拼接主要内容
      let thinkingDone = false;
      let accumulatedJson = ''; // 用于拼接 JSON 分析任务的输出

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // 将接收到的数据块解码并与上一块剩余的部分拼接
        partialLine += decoder.decode(value, { stream: true });

        // 按换行符分割处理 SSE 消息行
        const lines = partialLine.split('\n');
        // 最后一行可能不完整，保留在 partialLine 中等待下一块
        partialLine = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataContent = line.substring('data: '.length).trim();

            if (dataContent === '[DONE]') {
              console.log("Stream finished [DONE]");
              thinkingDone = true; // 标记思考结束（即使没有</think>）
              updateLastMessage(_ => ({ isThinkingComplete: thinkingDone }));
              break; // 跳出内层 for 循环 (不是 while)
            }

            try {
              const parsedData = JSON.parse(dataContent);
              // 提取实际的文本增量
              const textChunk = parsedData.choices?.[0]?.delta?.content ?? '';

              if (textChunk) {
                 // --- 处理 <think> 标签 ---
                 let remainingChunk = textChunk;
                 while(remainingChunk.length > 0) {
                     if (isParsingThinking) {
                         const endThinkIndex = remainingChunk.indexOf('</think>');
                         if (endThinkIndex !== -1) {
                             currentThinkContent += remainingChunk.substring(0, endThinkIndex);
                             isParsingThinking = false;
                             thinkingDone = true;
                             remainingChunk = remainingChunk.substring(endThinkIndex + '</think>'.length);
                             // 更新 UI (标记思考完成)
                             updateLastMessage(prev => ({
                                 thinkContent: currentThinkContent,
                                 isThinkingComplete: thinkingDone,
                                 mainContent: currentMainContent + remainingChunk // 处理紧跟在</think>后的内容
                             }));
                             currentMainContent += remainingChunk; // 更新累积的 main content
                             remainingChunk = ''; // 这个 chunk 处理完了

                         } else {
                             currentThinkContent += remainingChunk;
                             remainingChunk = ''; // 这个 chunk 处理完了
                             // 更新 UI (持续更新思考内容)
                             updateLastMessage(prev => ({ thinkContent: currentThinkContent, isThinkingComplete: false }));
                         }
                     } else { // 不在解析 thinking 块
                         const startThinkIndex = remainingChunk.indexOf('<think>');
                         if (startThinkIndex !== -1) {
                             const textBeforeThink = remainingChunk.substring(0, startThinkIndex);
                             currentMainContent += textBeforeThink;
                             isParsingThinking = true;
                             thinkingDone = false;
                             // 处理 <think> 之后的部分
                             currentThinkContent += remainingChunk.substring(startThinkIndex + '<think>'.length);
                             remainingChunk = ''; // 这个 chunk 处理完了
                             // 更新 UI
                             updateLastMessage(prev => ({
                                 mainContent: currentMainContent,
                                 thinkContent: currentThinkContent, // 开始填充思考内容
                                 isThinkingComplete: false,
                             }));
                         } else {
                             // 没有 think 标签，全部是 main content
                             currentMainContent += remainingChunk;
                             remainingChunk = ''; // 这个 chunk 处理完了
                             // 更新 UI
                              updateLastMessage(prev => ({ mainContent: currentMainContent }));
                         }
                     }
                 }
                 // --- 结束 <think> 标签处理 ---

                 // 如果是 JSON 分析任务，将 mainContent 累加到 accumulatedJson
                 if (currentTask === 'analyze_json_add_tags' && !isParsingThinking && currentMainContent.length > 0) {
                     accumulatedJson += currentMainContent; // 累加可能是 JSON 的部分
                     // 注意：这里不立即解析，等流结束后再解析 accumulatedJson
                 }
              } // end if (textChunk)

              // 处理流结束标志 (finish_reason)
              if (parsedData.choices?.[0]?.finish_reason === 'stop') {
                  console.log("Stream finished (finish_reason=stop)");
                  thinkingDone = true; // 标记思考结束
                  updateLastMessage(prev => ({ isThinkingComplete: thinkingDone }));
                  break; // 跳出内层 for 循环
              }

            } catch (e) {
              console.error('Failed to parse SSE data chunk:', dataContent, e);
            }
          } // end if (line.startsWith('data: '))
        } // end for loop (lines)

        if (lines.includes('[DONE]') || (messages.length > 0 && messages[messages.length-1].isThinkingComplete && !isParsingThinking) ) {
           // 检查是否是因为 [DONE] 或 finish_reason='stop' 跳出的
           if(lines.includes('[DONE]') || decoder.decode(value).includes('"finish_reason":"stop"')) break; // 退出外层 while
        }

      } // --- End while loop ---

      // --- 流结束后处理 JSON 分析任务的最终结果 ---
      if (currentTask === 'analyze_json_add_tags') {
        if (accumulatedJson.trim()) {
          try {
            console.log("Attempting to parse accumulated JSON:", accumulatedJson);
            // 清理可能的 markdown (虽然 prompt 要求不加，但以防万一)
            const finalCleanedJson = accumulatedJson.replace(/^```json\s*|```$/g, '').trim();
            const finalResult = JSON.parse(finalCleanedJson);
            // 成功解析，用格式化的 JSON 更新最后一条消息
            updateLastMessage(_ => ({
                mainContent: JSON.stringify(finalResult, null, 2) // 最终显示格式化的 JSON
            }));
          } catch (e) {
            console.error("Failed to parse final accumulated JSON:", e);
            updateLastMessage(_ => ({
              role: 'error',
              mainContent: `JSON 解析失败: ${e instanceof Error ? e.message : String(e)}\n接收到的内容片段: ${accumulatedJson.substring(0, 200)}...`
            }));
          }
        } else if (thinkingDone && !accumulatedJson.trim()) {
             // 只有思考过程，没有 JSON 输出
             console.warn("JSON Analysis task finished, but no JSON content was accumulated after <think> block.");
             updateLastMessage(prev => ({
                 mainContent: "(模型仅输出了思考过程，未找到有效的 JSON 输出)"
             }));
        }
      }

    } catch (error) {
      console.error('Streaming API call failed:', error);
      // 检查是否是中断错误
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Request was aborted');
        // 已经在handleAbort中更新了消息，这里不需要额外处理
      } else {
        updateLastMessage(prev => ({
          role: 'error',
          content: '', // 清空占位符
          mainContent: `流式请求错误: ${error instanceof Error ? error.message : String(error)}`,
          thinkContent: prev.thinkContent, // 保留已接收的思考
          isThinkingComplete: true,
        }));
      }
    } finally {
      setIsLoading(false);
      setAbortController(null); // 清除AbortController
    }
  }, [messages, addMessage, updateLastMessage, mode]);

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900">
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

      <ChatWindow messages={messages} />

      <ChatInput 
        onSendMessage={handleSendMessage} 
        onAbort={handleAbort} 
        isLoading={isLoading} 
      />
    </div>
  );
}