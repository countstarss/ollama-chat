'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ChatWindow, ChatWindowHandle } from '@/components/chat/ChatWindow';
import { ApiRequestBody, ApiTaskType } from '@/lib/types';
import { DisplayMessage } from '@/components/chat/ChatMessage';
import { v4 as uuidv4 } from 'uuid';
import { useStreamResponse } from '@/hooks/useStreamResponse';
import { useModelConfig, ModelConfig } from '@/hooks/useModelConfig';
import { ModelSelector } from '@/components/ui/ModelSelector';
import { ModelEditDialog } from '@/components/ui/ModelEditDialog';
import { ModelSettings, ModelSettingsData, DEFAULT_SETTINGS } from '@/components/ui/ModelSettings';
import { Settings, Menu, ChevronLeft } from 'lucide-react';
import { useSidebar } from '@/components/context/sidebar-context';
import { Button } from '@/components/ui/button';

export default function Home() {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  
  // 模型相关状态
  const [isModelDialogOpen, setIsModelDialogOpen] = useState(false);
  const [editingModelId, setEditingModelId] = useState<string | null>(null);
  const [modelError, setModelError] = useState<string | null>(null); // 添加模型错误状态
  
  // 设置相关状态
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [modelSettings, setModelSettings] = useState<ModelSettingsData>(DEFAULT_SETTINGS);

  // 使用模型配置hook
  const { 
    models, 
    selectedModelId, 
    getSelectedModel, 
    addModel, 
    updateModel, 
    deleteModel, 
    selectModel 
  } = useModelConfig();

  // 添加对ChatWindow的引用 - 修改为正确的类型
  const chatWindowRef = useRef<ChatWindowHandle>(null);
  
  // 使用新实现的hook
  const { sendStreamRequest } = useStreamResponse();

  const { toggleSidebar, isCollapsed } = useSidebar();

  // 从本地存储加载模型设置
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem('ollama-chat-settings');
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        setModelSettings(parsedSettings);
      }
    } catch (error) {
      console.error('加载模型设置失败:', error);
    }
  }, []);

  // 当选择模型更改时，清除错误状态
  useEffect(() => {
    setModelError(null);
  }, [selectedModelId]);

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
    // 清除任何之前的错误
    setModelError(null);
    
    const userMessage: DisplayMessage = { id: uuidv4(), role: 'user', content: userInput };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    // 创建新的AbortController
    const controller = new AbortController();
    setAbortController(controller);

    // 获取当前选中的模型
    const selectedModel = getSelectedModel();
    console.log(`使用模型发送消息: ${selectedModel.name} (${selectedModel.modelId})`);

    // MARK: --- 准备请求体 ---
    // 简化：只发送当前用户消息，让后端处理历史（如果后端支持）
    // 或者在这里组装历史记录
    const historyToSend = messages.slice(-6) // 发送最近几条消息 + 当前消息
        .filter(m => m.role === 'user' || m.role === 'assistant') // 只发送用户和助手消息
        .map(m => ({ role: m.role, content: m.mainContent ?? m.content })); // 发送最终内容
    historyToSend.push({role: 'user', content: userInput});

    const currentTask: ApiTaskType = "general_chat";
    const requestBody: ApiRequestBody= { 
      task: currentTask, 
      payload: historyToSend,
      model: selectedModel.modelId, // 传递选中的模型ID
      settings: {
        temperature: modelSettings.temperature,
        topP: modelSettings.topP,
        topK: modelSettings.topK,
        maxTokens: modelSettings.maxTokens,
        presencePenalty: modelSettings.presencePenalty,
        frequencyPenalty: modelSettings.frequencyPenalty
      }
    };


    // --- 添加助手消息占位符 ---
    const assistantMessageId = uuidv4();
    setMessages((prev) => [...prev, { id: assistantMessageId, role: 'assistant', content: '', thinkContent: '', mainContent: '', isThinkingComplete: false }]);

    // 发送消息后滚动到底部
    setTimeout(() => chatWindowRef.current?.scrollToBottom(), 100);

    try {
      // 使用新的useStreamResponse hook处理请求
      const success = await sendStreamRequest(
        requestBody, 
        (updates: Partial<DisplayMessage>) => updateLastMessage(() => updates),
        controller
      );
      
      if (!success) {
        console.error("流式请求未能成功完成");
      }
      
      // 响应完成后再次滚动到底部
      setTimeout(() => chatWindowRef.current?.scrollToBottom(), 100);
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
      setAbortController(null); // 清除AbortController
    }
  }, [messages, addMessage, updateLastMessage, sendStreamRequest, getSelectedModel, modelSettings]);

  // 处理打开添加模型对话框
  const handleAddModel = useCallback(() => {
    setEditingModelId(null);
    setIsModelDialogOpen(true);
  }, []);

  // 处理编辑模型
  const handleEditModel = useCallback((id: string) => {
    setEditingModelId(id);
    setIsModelDialogOpen(true);
  }, []);

  // 处理保存模型
  const handleSaveModel = useCallback((modelData: Omit<ModelConfig, 'id'>) => {
    if (editingModelId) {
      updateModel(editingModelId, modelData);
    } else {
      const newId = addModel(modelData);
      selectModel(newId);
    }
    setIsModelDialogOpen(false);
    
    // 添加模型后清除任何之前的错误
    setModelError(null);
  }, [editingModelId, addModel, updateModel, selectModel]);

  // 获取编辑模型的初始数据
  const getModelForEditing = useCallback(() => {
    if (!editingModelId) return undefined;
    
    const model = models.find(m => m.id === editingModelId);
    if (!model) return undefined;
    
    return {
      name: model.name,
      modelId: model.modelId,
      description: model.description
    };
  }, [editingModelId, models]);

  // 处理保存模型设置
  const handleSaveSettings = useCallback((newSettings: ModelSettingsData) => {
    setModelSettings(newSettings);
    
    // 保存到本地存储
    try {
      localStorage.setItem('ollama-chat-settings', JSON.stringify(newSettings));
    } catch (error) {
      console.error('保存模型设置失败:', error);
    }
  }, []);

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900 scrollbar-hide">
      <header className="p-2 border-b border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={toggleSidebar} className="h-8 w-8">
            {
              isCollapsed ? (
                <Menu className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )
            }
          </Button>
          <h1 className="text-xl font-semibold">Ollama 助手</h1>

        </div>
        
        <div className="flex items-center gap-3">
          {/* 模型选择器 */}
          <div className="relative">
            <ModelSelector 
              models={models}
              selectedModelId={selectedModelId}
              onSelectModel={selectModel}
              onAddModel={handleAddModel}
              onEditModel={handleEditModel}
              onDeleteModel={deleteModel}
              isLoading={isLoading}
            />
            
            {/* 模型错误提示 */}
            {modelError && (
              <div className="absolute top-full left-0 mt-1 p-2 bg-red-50 dark:bg-red-900/40 text-red-600 dark:text-red-300 text-xs rounded-md border border-red-200 dark:border-red-800 max-w-xs z-30">
                {modelError}
              </div>
            )}
          </div>
          
          {/* 设置按钮 */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-md transition-colors"
            disabled={isLoading}
            title="模型参数设置"
          >
            <Settings className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
        </div>
      </header>

      <ChatWindow 
        messages={messages} 
        ref={chatWindowRef}
        onSendMessage={handleSendMessage}
        onAbort={handleAbort}
        isLoading={isLoading}
      />
      
      {/* 模型编辑对话框 */}
      <ModelEditDialog 
        isOpen={isModelDialogOpen}
        onClose={() => setIsModelDialogOpen(false)}
        onSave={handleSaveModel}
        initialData={getModelForEditing()}
        isEditing={!!editingModelId}
      />
      
      {/* 模型设置对话框 */}
      <ModelSettings
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={modelSettings}
        onSave={handleSaveSettings}
      />
    </div>
  );
}