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
import { useChatSession } from '@/hooks/useChatSession';
import { Menu, ChevronLeft, Plus } from 'lucide-react';
import { useSidebar } from '@/components/context/sidebar-context';
import { Button } from '@/components/ui/button';
import { EditableChatTitle } from '@/components/ui/EditableChatTitle';
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
  
  // 使用聊天会话hook
  const {
    currentChatId,
    chatName,
    loadChat,
    saveCurrentChat,
    createNewChat,
    renameChat
  } = useChatSession();
  
  // 追踪消息数量和生成状态
  const previousMessagesCountRef = useRef<number>(0);
  const isStreamCompletedRef = useRef<boolean>(true);
  
  // 使用聊天操作hook
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
  
  // 如果URL里有chatId参数，加载相应的聊天记录
  useEffect(() => {
    const loadMessages = async () => {
      if (currentChatId) {
        const loadedMessages = await loadChat(currentChatId);
        if (loadedMessages && loadedMessages.length > 0) {
          setMessages(loadedMessages);
        } else {
          // 如果没有加载到消息，清空当前消息列表
          setMessages([]);
        }
      }
    };
    
    loadMessages();
  }, [currentChatId, loadChat]);
  
  // 在消息变化时保存聊天，但仅在消息数量变化或消息生成完成时
  useEffect(() => {
    // 只有当currentChatId存在且有消息时才继续
    if (!currentChatId || messages.length === 0) {
      previousMessagesCountRef.current = messages.length;
      return;
    }
    
    // 检查消息数量是否变化
    const messageCountChanged = previousMessagesCountRef.current !== messages.length;
    
    // 检查最后一条消息是否完成生成（非流式响应中）
    const lastMessage = messages[messages.length - 1];
    const isLastMessageComplete = lastMessage && 
                                 (lastMessage.role !== 'assistant' || 
                                  lastMessage.isThinkingComplete === true);
                                  
    // 更新消息数量引用
    previousMessagesCountRef.current = messages.length;
    // 只有在以下情况下保存:
    // 1. 消息数量发生变化 2. 最后一条消息完成生成 3. 流式响应已完成
    if (messageCountChanged || (isLastMessageComplete && isStreamCompletedRef.current)) {
      console.log('保存聊天: 消息数量变化或消息生成完成');
      saveCurrentChat(messages, selectedModel || undefined);
    }
  }, [messages, currentChatId, selectedModel, saveCurrentChat]);

  // 处理聊天标题重命名
  const handleRenameChat = useCallback((newTitle: string) => {
    if (currentChatId) {
      renameChat(currentChatId, newTitle);
    }
  }, [currentChatId, renameChat]);
  
  // 处理新建聊天按钮点击
  const handleNewChat = useCallback(() => {
    createNewChat();
    setMessages([]);
  }, [createNewChat]);
  
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
    // 标记流式响应开始
    isStreamCompletedRef.current = false;

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
      
      // 标记流式响应完成，并保存当前聊天
      isStreamCompletedRef.current = true;
      saveCurrentChat(messages, selectedModel || undefined);
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
      isStreamCompletedRef.current = true;
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
    setModelError,
    saveCurrentChat
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
          
          <EditableChatTitle 
            title={chatName} 
            onRename={handleRenameChat} 
          />
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
            onClick={handleNewChat}
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">新建聊天</span>
          </Button>
        
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