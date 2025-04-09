'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ChatWindow, ChatWindowHandle } from '@/components/chat/ChatWindow';
import { DisplayMessage } from '@/components/chat/ChatMessage';
import { useStreamResponse } from '@/hooks/useStreamResponse';
import { ModelConfig, useModelConfig } from '@/hooks/useModelConfig';
import { ModelSelectorContainer } from '@/components/ui/model-setting/ModelSelectorContainer';
import { ModelSettingsButton } from '@/components/ui/model-setting/ModelSettingsButton';
import { useModelSettings } from '@/hooks/useModelSettings';
import { useChatActions } from '@/hooks/useChatActions';
import { Menu, ChevronLeft } from 'lucide-react';
import { useSidebar } from '@/components/context/sidebar-context';
import { Button } from '@/components/ui/button';
import { v4 as uuidv4 } from 'uuid';

export default function Home() {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [modelError, setModelError] = useState<string | null>(null);
  
  // 使用hooks
  const { modelSettings } = useModelSettings();
  const { getSelectedModel } = useModelConfig();
  const [selectedModel, setSelectedModel] = useState<ModelConfig | null>(null);
  const chatWindowRef = useRef<ChatWindowHandle>(null);
  const { sendStreamRequest } = useStreamResponse();
  const { toggleSidebar, isCollapsed } = useSidebar();
  
  // 使用新的聊天操作hook
  const {
    handleAbort,
    updateLastMessage,
    scrollToBottom,
    prepareRequestBody,
    addAssistantPlaceholder,
    createAbortController
  } = useChatActions(
    chatWindowRef,
    messages,
    setMessages,
    setIsLoading,
    setModelError
  );
  
  // 初始化时设置当前选中的模型
  useEffect(() => {
    const model = getSelectedModel();
    if (model) {
      setSelectedModel(model);
    }
  }, [getSelectedModel]);

  // MARK: 处理发送消息
  const handleSendMessage = useCallback(async (userInput: string) => {
    // 清除任何之前的错误
    setModelError(null);
    
    // 添加用户消息
    setMessages((prev) => [...prev, { 
      id: uuidv4(), 
      role: 'user', 
      content: userInput 
    }]);
  
    setIsLoading(true);

    // 创建新的AbortController
    const controller = createAbortController();
    // 检查是否有选中的模型
    if (!selectedModel) {
      setModelError('未选择模型');
      setIsLoading(false);
      return;
    }
    console.log(`使用模型发送消息: ${selectedModel.name} (${selectedModel.modelId})`);
    // 准备请求体
    const requestBody = prepareRequestBody(userInput, messages, selectedModel, modelSettings);

    // 添加助手占位消息
    addAssistantPlaceholder();

    try {
      // 使用流式响应hook处理请求
      const success = await sendStreamRequest(
        requestBody, 
        (updates) => updateLastMessage(() => updates),
        controller
      );
      
      if (!success) {
        console.error("流式请求未能成功完成");
      }
      
      // MARK: 响应完成后滚到底部
      scrollToBottom();
    } catch (error) {
      console.error('消息发送错误:', error);
      
      // 处理模型特定错误
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // 检查是否是模型相关错误
      const isModelError = 
        errorMessage.includes('模型') || 
        errorMessage.includes('model') ||
        errorMessage.includes('找不到') || 
        errorMessage.includes('not found');
      
      if (isModelError) {
        // 设置模型错误状态，用于UI显示
        setModelError(`模型 "${selectedModel.modelId}" 可能不可用。错误: ${errorMessage}`);
        
        // 向聊天添加错误消息
        updateLastMessage(() => ({
          role: 'error',
          content: '',
          mainContent: `模型错误: ${errorMessage}\n\n请尝试选择其他模型或检查Ollama服务是否正常运行。`,
          isThinkingComplete: true,
        }));
      } else {
        // 处理一般错误
        updateLastMessage(() => ({
          role: 'error',
          content: '',
          mainContent: `发送消息错误: ${errorMessage}`,
          isThinkingComplete: true,
        }));
      }
    } finally {
      setIsLoading(false);
    }
  }, [
    messages,
    selectedModel,
    modelSettings,
    updateLastMessage,
    sendStreamRequest,
    prepareRequestBody,
    addAssistantPlaceholder,
    createAbortController,
    scrollToBottom,
    setModelError
  ]);

  // 处理模型选择变更
  const handleModelChange = useCallback((modelId: string) => {
    // 获取完整的模型信息
    const model = getSelectedModel();
    if (model) {
      setSelectedModel(model);
      setModelError(null);
    }
  }, [getSelectedModel]);

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900 scrollbar-hide">
      <header className="p-2 border-b border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={toggleSidebar} className="h-8 w-8">
            {isCollapsed ? <Menu className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
          <h1 className="text-xl font-semibold">Ollama 助手</h1>
        </div>
        
        <div className="flex items-center gap-3">
          <ModelSelectorContainer 
            isLoading={isLoading} 
            onModelChange={handleModelChange} 
          />
          <ModelSettingsButton isLoading={isLoading} />
        </div>
      </header>

      <ChatWindow 
        messages={messages} 
        ref={chatWindowRef}
        onSendMessage={handleSendMessage}
        onAbort={handleAbort}
        isLoading={isLoading}
      />
    </div>
  );
}