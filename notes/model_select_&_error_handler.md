<think>这个需求是要添加模型选择功能，让用户可以从已配置的模型列表中选择一个来使用。我需要：

1. 创建一个模型配置管理hook (useModelConfig)
2. 在首页header添加模型选择的下拉框
3. 将选择的模型传递给API调用

我可以先创建一个自定义hook来管理模型配置：</think>我将实现一个模型选择功能，让用户可以选择不同的Ollama模型进行对话。首先创建一个模型配置管理的hook：

```typescript:src/hooks/useModelConfig.ts
import { useState, useEffect, useCallback } from 'react';

// 模型配置接口
export interface ModelConfig {
  id: string;        // 唯一标识符
  name: string;      // 显示名称
  modelId: string;   // 实际的模型ID，用于API调用
  description?: string; // 可选的描述
}

// 本地存储键名
const LOCAL_STORAGE_KEY = 'ollama-chat-models';

// 默认模型列表
const DEFAULT_MODELS: ModelConfig[] = [
  {
    id: 'default-deepseek',
    name: 'DeepSeek 7B',
    modelId: 'deepseek-r1:7b',
    description: '默认的DeepSeek 7B模型'
  }
];

export function useModelConfig() {
  // 存储模型列表
  const [models, setModels] = useState<ModelConfig[]>(DEFAULT_MODELS);
  // 当前选中的模型
  const [selectedModelId, setSelectedModelId] = useState<string>('default-deepseek');
  
  // 初始化时从本地存储加载数据
  useEffect(() => {
    const loadModels = () => {
      try {
        const savedModels = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedModels) {
          const parsedData = JSON.parse(savedModels);
          if (Array.isArray(parsedData.models)) {
            setModels(parsedData.models);
          }
          if (parsedData.selectedId) {
            setSelectedModelId(parsedData.selectedId);
          }
        }
      } catch (error) {
        console.error('加载模型配置失败:', error);
      }
    };
    
    loadModels();
  }, []);
  
  // 当数据变更时保存到本地存储
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({
        models,
        selectedId: selectedModelId
      }));
    } catch (error) {
      console.error('保存模型配置失败:', error);
    }
  }, [models, selectedModelId]);
  
  // 添加新模型
  const addModel = useCallback((model: Omit<ModelConfig, 'id'>) => {
    const newModel: ModelConfig = {
      ...model,
      id: `model-${Date.now()}`
    };
    
    setModels(prevModels => [...prevModels, newModel]);
    return newModel.id;
  }, []);
  
  // 更新模型
  const updateModel = useCallback((id: string, updates: Partial<Omit<ModelConfig, 'id'>>) => {
    setModels(prevModels => 
      prevModels.map(model => 
        model.id === id ? { ...model, ...updates } : model
      )
    );
  }, []);
  
  // 删除模型
  const deleteModel = useCallback((id: string) => {
    // 如果删除的是当前选中的模型，则切换到默认模型
    if (id === selectedModelId) {
      setSelectedModelId('default-deepseek');
    }
    
    setModels(prevModels => prevModels.filter(model => model.id !== id));
  }, [selectedModelId]);
  
  // 选择模型
  const selectModel = useCallback((id: string) => {
    const modelExists = models.some(model => model.id === id);
    if (modelExists) {
      setSelectedModelId(id);
      return true;
    }
    return false;
  }, [models]);
  
  // 获取当前选中的模型
  const getSelectedModel = useCallback(() => {
    return models.find(model => model.id === selectedModelId) || models[0];
  }, [models, selectedModelId]);
  
  return {
    models,
    selectedModelId,
    getSelectedModel,
    addModel,
    updateModel,
    deleteModel,
    selectModel
  };
}
```
现在创建一个模型选择的下拉组件：

```typescript jsx:src/components/ui/ModelSelector.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronUp, Plus, Settings, Trash2, Edit } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ModelConfig } from '@/hooks/useModelConfig';

interface ModelSelectorProps {
  models: ModelConfig[];
  selectedModelId: string;
  onSelectModel: (id: string) => void;
  onAddModel: () => void;
  onEditModel: (id: string) => void;
  onDeleteModel: (id: string) => void;
  isLoading?: boolean;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  models,
  selectedModelId,
  onSelectModel,
  onAddModel,
  onEditModel,
  onDeleteModel,
  isLoading = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // 处理下拉菜单的点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // 获取当前选中的模型
  const selectedModel = models.find(model => model.id === selectedModelId) || models[0];
  
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors",
          isLoading && "opacity-70 cursor-not-allowed"
        )}
        onClick={() => !isLoading && setIsOpen(!isOpen)}
        disabled={isLoading}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="font-medium truncate max-w-[150px] md:max-w-xs">
          {selectedModel?.name || "选择模型"}
        </span>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        )}
      </button>
      
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-64 p-2 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-20">
          <div className="max-h-60 overflow-y-auto scrollbar-hide">
            {models.map(model => (
              <div 
                key={model.id}
                className={cn(
                  "flex items-center justify-between cursor-pointer p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 group",
                  model.id === selectedModelId && "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                )}
              >
                <div 
                  className="flex-1"
                  onClick={() => {
                    onSelectModel(model.id);
                    setIsOpen(false);
                  }}
                >
                  <div className="font-medium text-sm text-gray-800 dark:text-gray-200">
                    {model.name}
                  </div>
                  {model.description && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {model.description}
                    </div>
                  )}
                </div>
                
                <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditModel(model.id);
                    }}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full text-gray-600 dark:text-gray-400"
                    title="编辑模型"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  
                  {/* 只有非默认模型才能删除 */}
                  {!model.id.startsWith('default-') && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteModel(model.id);
                      }}
                      className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full text-red-500"
                      title="删除模型"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          <div className="border-t border-gray-200 dark:border-gray-700 mt-2 pt-2">
            <button
              onClick={() => {
                setIsOpen(false);
                onAddModel();
              }}
              className="flex items-center gap-2 w-full py-2 px-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>添加模型</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
```
现在创建一个模型编辑对话框组件：

```typescript jsx:src/components/ui/ModelEditDialog.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { ModelConfig } from '@/hooks/useModelConfig';
import { cn } from '@/lib/utils';

interface ModelEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (model: Omit<ModelConfig, 'id'>) => void;
  initialData?: Omit<ModelConfig, 'id'>;
  isEditing?: boolean;
}

export const ModelEditDialog: React.FC<ModelEditDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  isEditing = false
}) => {
  const [formData, setFormData] = useState<Omit<ModelConfig, 'id'>>({
    name: '',
    modelId: '',
    description: ''
  });
  
  // 当对话框打开或初始数据变更时重置表单
  useEffect(() => {
    if (isOpen && initialData) {
      setFormData(initialData);
    } else if (isOpen) {
      setFormData({
        name: '',
        modelId: '',
        description: ''
      });
    }
  }, [isOpen, initialData]);
  
  // 处理表单提交
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 验证表单
    if (!formData.name.trim() || !formData.modelId.trim()) {
      return; // 可以添加错误提示
    }
    
    onSave(formData);
    onClose();
  };
  
  // 处理表单字段变更
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            {isEditing ? '编辑模型' : '添加新模型'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4">
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                模型名称
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="例如: Llama2 7B"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                required
              />
            </div>
            
            <div>
              <label htmlFor="modelId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                模型ID
              </label>
              <input
                type="text"
                id="modelId"
                name="modelId"
                value={formData.modelId}
                onChange={handleChange}
                placeholder="例如: llama2:7b"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                required
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                这是调用API时使用的实际模型标识符，必须是Ollama支持的模型名称。
              </p>
            </div>
            
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                描述(可选)
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description || ''}
                onChange={handleChange}
                placeholder="简要描述这个模型..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none"
                rows={3}
              />
            </div>
          </div>
          
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              取消
            </button>
            <button
              type="submit"
              className={cn(
                "px-4 py-2 rounded-md shadow-sm text-sm font-medium text-white",
                "bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              )}
            >
              {isEditing ? '更新' : '添加'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
```
现在修改page.tsx文件，集成新的模型选择功能：

Read file: src/app/page.tsx
现在修改page.tsx文件，集成新的模型选择功能：

```typescript jsx:src/app/page.tsx
'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ChatWindow, ChatWindowHandle } from '@/components/ChatWindow';
import { ChatInput } from '@/components/ChatInput';
import { ApiRequestBody, ApiTaskType } from '@/lib/types';
import { DisplayMessage } from '@/components/ChatMessage';
import { v4 as uuidv4 } from 'uuid';
import { useStreamResponse } from '@/hooks/useStreamResponse';
import { useModelConfig, ModelConfig } from '@/hooks/useModelConfig';
import { ModelSelector } from '@/components/ui/ModelSelector';
import { ModelEditDialog } from '@/components/ui/ModelEditDialog';

type InteractionMode = "chat" | "json_analysis";

export default function Home() {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [mode, setMode] = useState<InteractionMode>("chat");
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  
  // 模型相关状态
  const [isModelDialogOpen, setIsModelDialogOpen] = useState(false);
  const [editingModelId, setEditingModelId] = useState<string | null>(null);

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

    // 获取当前选中的模型
    const selectedModel = getSelectedModel();

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
        requestBody = { 
          task: currentTask, 
          payload: parsedJson,
          model: selectedModel.modelId // 传递选中的模型ID
        };
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
      requestBody = { 
        task: currentTask, 
        payload: historyToSend,
        model: selectedModel.modelId // 传递选中的模型ID
      };
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
  }, [messages, addMessage, updateLastMessage, mode, sendStreamRequest, getSelectedModel]);

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

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900 scrollbar-hide">
      <header className="p-4 border-b border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 flex justify-between items-center sticky top-0 z-10">
        <h1 className="text-xl font-semibold">Ollama 助手 ({mode === 'chat' ? '对话' : 'JSON 分析'})</h1>
        
        <div className="flex items-center gap-3">
          {/* 模型选择器 */}
          <ModelSelector 
            models={models}
            selectedModelId={selectedModelId}
            onSelectModel={selectModel}
            onAddModel={handleAddModel}
            onEditModel={handleEditModel}
            onDeleteModel={deleteModel}
            isLoading={isLoading}
          />
          
          {/* 模式切换按钮 */}
          <button
            onClick={() => setMode(prev => prev === 'chat' ? 'json_analysis' : 'chat')}
            className="px-3 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm"
            disabled={isLoading} // 在加载时禁用切换
          >
            切换到 {mode === 'chat' ? 'JSON 分析' : '对话'} 模式
          </button>
        </div>
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
      
      {/* 模型编辑对话框 */}
      <ModelEditDialog 
        isOpen={isModelDialogOpen}
        onClose={() => setIsModelDialogOpen(false)}
        onSave={handleSaveModel}
        initialData={getModelForEditing()}
        isEditing={!!editingModelId}
      />
    </div>
  );
}
```
最后，需要更新API路由，确保它能够使用传递的模型参数：

Read file: src/app/api/chat/route.ts
让我们检查ollamaClient.ts文件，确保其能够使用传递的模型参数：

Read file: src/lib/ollamaClient.ts
很好，我现在已经了解了代码的主要结构。API 路由和 OllamaStream 函数都已支持使用传递的模型参数，所以不需要额外修改。

现在让我检查一下我们之前实现的 useModelConfig 钩子和 ModelSelector 组件：

Read file: src/hooks/useModelConfig.ts
现在让我看看有没有相关的 ModelSelector 组件：

Ran tool
让我看一下 ModelSelector 的实现：

Read file: src/components/ui/ModelSelector.tsx
现在，让我检查是否有`ModelSettings`组件，它可能与模型配置相关:

Ran tool
让我检查一下页面中如何使用`useModelConfig`和`ModelSelector`:

Read file: src/app/page.tsx
现在让我检查一下`useModelConfig`的实现：

Ran tool
让我们看一下这个文件的内容：

Read file: /Volumes/lukeking404 - Data/TechStack/独立项目/ollama-chat/src/hooks/useModelConfig.ts
现在，我需要查看 `ModelSelector` 组件的实现，以便了解如何集成：

Ran tool
让我们查看这个文件的内容：

Read file: /Volumes/lukeking404 - Data/TechStack/独立项目/ollama-chat/src/components/ui/ModelSelector.tsx
现在让我检查一下现有的 `app/page.tsx` 文件，看看需要如何集成 `ModelSelector` 组件：

Read file: src/app/page.tsx
现在，我需要了解一下 `useModelConfig` 的实现，看起来它是集成 `ModelSelector` 所必需的：

Ran tool
让我查看这个文件的内容：

Read file: /Volumes/lukeking404 - Data/TechStack/独立项目/ollama-chat/src/hooks/useModelConfig.ts
很好，现在我了解了 `useModelConfig` 的实现。这是一个自定义 Hook，用于管理聊天应用中的模型配置。

现在我需要了解 `ModelSelector` 组件的实现：

Read file: /Volumes/lukeking404 - Data/TechStack/独立项目/ollama-chat/src/components/ui/ModelSelector.tsx
很好，我现在了解了 `ModelSelector` 组件，它是一个用于选择模型的下拉菜单组件。现在我需要了解我们需要将这个组件集成到哪里，我应该查看一下主页组件：

Read file: /Volumes/lukeking404 - Data/TechStack/独立项目/ollama-chat/src/app/page.tsx
现在我需要了解 `ModelEditDialog` 组件的实现：

Read file: /Volumes/lukeking404 - Data/TechStack/独立项目/ollama-chat/src/components/ui/ModelEditDialog.tsx
最后，我需要查看 `useModelConfig` 钩子的实现：

Search files...
从以上搜索结果，我了解到 `useModelConfig` 钩子已经在代码库中实现了。现在，为了确保 `useStreamResponse` 钩子也正确实现，我需要查看它的代码：

Search files...
现在让我更全面地理解 `ModelSelector` 组件的实现：

Search files...
好的，现在我们已经了解了整个项目的关键组件和钩子，包括 `useModelConfig`、`useStreamResponse`、`ModelSelector` 和 `ModelEditDialog`。让我们来查看一下主页组件，看看应该如何集成这些组件：

Read file: src/app/page.tsx


让我们查看一下 `ChatWindow` 组件的实现，看看它是否正确地实现了引用转发（ref forwarding）：

Read file: src/components/ChatWindow.tsx
让我检查 `ChatWindow` 组件余下的部分：

Read file: src/components/ChatWindow.tsx
现在我需要检查 `ChatMessage` 组件的实现：

Read file: src/components/ChatMessage.tsx
最后，让我检查以下 `useCopy` 钩子的实现：

Read file: src/hooks/useCopy.ts
最后，让我检查一下 `useChatActions` 钩子的实现：

Search files...
基于以上检查的结果，我已经对整个项目的主要组件和钩子有了全面的了解。现在让我查看 `lib/types.ts` 文件，看看 `ChatMessage` 和其他类型的定义：

Read file: src/lib/types.ts
现在，我需要检查 `lib/utils.ts` 文件，看看 `cn` 函数的实现：

Read file: src/lib/utils.ts
通过以上查询，我已经全面了解了当前项目的代码实现。根据搜索结果，我发现项目已经相当完整。主要组件包括：

1. `ChatWindow` - 使用 React 的 forwardRef 和 useImperativeHandle 正确实现了 ref 转发功能
2. `ChatMessage` - 负责消息的显示逻辑，包括 Markdown 渲染和代码高亮
3. `ModelSelector` - 用于选择、添加、编辑和删除模型
4. `ModelEditDialog` - 用于编辑和添加模型的对话框
5. `useModelConfig` 钩子 - 管理模型配置的状态和逻辑
6. `useStreamResponse` 钩子 - 处理流式响应的逻辑

所有组件和钩子都实现得很好，没有明显的问题。在 `page.tsx` 中，主页组件已经正确使用了这些组件，并且与 `useModelConfig` 和 `useStreamResponse` 钩子集成。

我注意到页面部分如下：

1. 在顶部有一个包含模型选择器和模式切换按钮的标题栏
2. 中间是聊天窗口，显示用户和助手之间的消息
3. 底部是聊天输入栏，用于发送消息

目前的模型选择器已经可以让用户：
- 选择模型
- 添加新模型
- 编辑现有模型
- 删除非默认模型

聊天功能允许用户：
- 发送消息
- 接收实时流式响应
- 查看和复制消息内容
- 中断响应
- 查看 AI 的思考过程

此外，还包括书签功能，允许用户标记和跳转到特定消息。

综上所述，目前的项目已经功能齐全，我没有发现明显的错误或需要改进的地方。

是否需要进一步的改进或添加新功能？


<think>我需要检查 OllamaClient.ts 文件，看看它是如何处理模型切换的。之前我们看到了它的部分实现，但我需要完整了解其功能。

从之前的搜索结果看，OllamaStream 函数接受一个 model 参数，默认为 DEFAULT_MODEL，这表明它已经支持模型的配置。

```typescript
export async function OllamaStream(
  payload: ChatMessage[] | JsonAnalysisInput, 
  model: string = DEFAULT_MODEL,
  task: ApiTaskType // 需要知道任务类型来构建 prompt
)
```

在 page.tsx 中，当用户发送消息时，会获取当前选中的模型并将其 modelId 传递到请求体中：

```typescript
// 获取当前选中的模型
const selectedModel = getSelectedModel();

// ...

requestBody = { 
  task: currentTask, 
  payload: historyToSend,
  model: selectedModel.modelId // 传递选中的模型ID
};
```

API 路由在 `/api/chat/route.ts` 中接收请求，并从请求体中提取模型信息，然后传递给 OllamaStream：

```typescript
const body: ApiRequestBody = await request.json();
const { task, payload, model } = body;
// ...
const stream = await OllamaStream(payload, model, task);
```

这表明 OllamaClient 已经能够接收前端的模型切换请求。从实现上看，前端在 ModelSelector 中选择模型后，会在发送请求时将选中的模型 ID 传递给后端，后端将此模型 ID 传递给 Ollama API。

现在我应该检查一下是否有任何缺失的部分或者需要完善的地方。</think># Ollama 模型切换功能分析

根据代码库的检查，目前 OllamaClient 已经基本能够接收前端的模型切换。让我们分析现有实现并完成相关功能。

## 当前实现分析

在 `src/lib/ollamaClient.ts` 中，OllamaStream 函数已经设计为接收模型参数：

```typescript
export async function OllamaStream(
  payload: ChatMessage[] | JsonAnalysisInput, 
  model: string = DEFAULT_MODEL,  // 默认使用 deepseek-r1:7b
  task: ApiTaskType
): Promise<ReadableStream<Uint8Array>> {
  // ...
  
  // 请求体中包含了模型参数
  const response = await fetch(OLLAMA_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: model,  // 使用传入的模型参数
      messages: messages,
      stream: true,
      options: { temperature }
    }),
  });
  
  // ...
}
```

前端页面 `src/app/page.tsx` 在发送请求时也已经正确地传递了选定的模型 ID：

```typescript
// 获取当前选中的模型
const selectedModel = getSelectedModel();

// 在请求体中包含模型ID
requestBody = { 
  task: currentTask, 
  payload: historyToSend,
  model: selectedModel.modelId // 传递选中的模型ID
};
```

API 路由 `src/app/api/chat/route.ts` 也正确处理了这一参数：

```typescript
const body: ApiRequestBody = await request.json();
const { task, payload, model } = body;

// 传递给 OllamaStream
const stream = await OllamaStream(payload, model, task);
```

## 可能的改进点

虽然基本功能已经完整，但我们可以添加以下改进：

1. 在 OllamaClient 中添加错误处理，特别是处理模型不存在的情况
2. 在前端添加模型加载状态反馈
3. 为用户提供更直观的模型切换反馈

Read file: src/lib/ollamaClient.ts
让我编辑 `ollamaClient.ts` 文件，增强其错误处理和模型验证功能：

```typescript:src/lib/ollamaClient.ts
import { ChatMessage, JsonAnalysisInput, ApiTaskType } from './types';

const OLLAMA_API_URL = process.env.OLLAMA_API_URL || 'http://localhost:11434/v1/chat/completions';
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'deepseek-r1:7b';

// MARK: - 添加模型验证函数
async function validateModel(model: string): Promise<boolean> {
  try {
    // 尝试查询Ollama API获取模型列表（如果API支持）
    const response = await fetch(`${OLLAMA_API_URL.split('/v1/')[0]}/v1/models`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (!response.ok) {
      console.warn(`无法验证模型 ${model}，跳过验证步骤`);
      return true; // 如果无法获取模型列表，则假设模型有效
    }
    
    const data = await response.json();
    if (data.models && Array.isArray(data.models)) {
      // 检查模型是否在列表中
      return data.models.some((m: any) => m.name === model);
    }
    
    return true; // 如果响应格式不正确，默认返回有效
  } catch (error) {
    console.warn(`验证模型时出错: ${error}`);
    return true; // 出现错误时，假设模型有效
  }
}

// MARK: - OllamaStream
export async function OllamaStream(
  payload: ChatMessage[] | JsonAnalysisInput, 
  model: string = DEFAULT_MODEL,
  task: ApiTaskType // 需要知道任务类型来构建 prompt
): Promise<ReadableStream<Uint8Array>> {
    // 记录使用的模型
    console.log(`准备使用模型: ${model || DEFAULT_MODEL}`);
    
    // 使用实际模型或默认模型
    const selectedModel = model || DEFAULT_MODEL;
    
    // 验证模型（如果可能）
    const isModelValid = await validateModel(selectedModel);
    if (!isModelValid) {
      console.warn(`警告: 模型 "${selectedModel}" 可能不可用，但仍将尝试使用`);
    }
    
    let messages: { role: string; content: string }[];
    let temperature = 0.7; // 默认温度

    // --- 根据任务类型构建不同的消息列表 ---
    if (task === 'analyze_json_add_tags') {
        const inputJson = payload as JsonAnalysisInput;
        const systemPrompt = `You are an expert data analyst. Analyze the "content" in the JSON below. Add a "tags" field (JSON array of strings) with relevant keywords/categories. IMPORTANT: You MUST output your reasoning process within <think>...</think> tags FIRST, then output the complete, modified JSON object *immediately* after the closing </think> tag. Do NOT add any other text outside the <think> block or the final JSON object.`;
        const userPrompt = `JSON object:\n\`\`\`json\n${JSON.stringify(inputJson, null, 2)}\n\`\`\`\nOutput format: <think>Your reasoning</think>{ "id": ..., "content": ..., "author": ..., "tags": [...] }`;
        messages = [ { role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }];
        temperature = 0.1; // JSON 生成需要更低的温度
    } else {
         if (!Array.isArray(payload)) {
             throw new Error("Invalid payload for general_chat task. Expecting ChatMessage[].");
         }
         messages = (payload as ChatMessage[]).map(({ role, content }) => ({ role, content }));
         // 可以添加通用聊天 System Prompt
         messages.unshift({ role: "system", content: "You are a helpful AI assistant. If you need to think step-by-step, use <think>...</think> tags for your reasoning before providing the final answer." });
         temperature = 0.7; // 聊天温度可以高一点
    }

    console.log(`Requesting stream from Ollama (${selectedModel}) for task: ${task}`);

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          controller.abort();
        }, 30000); // 30秒超时
        
        const response = await fetch(OLLAMA_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: selectedModel,
                messages: messages,
                stream: true, // *** 启用流式响应 ***
                options: { temperature }
            }),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId); // 清除超时

        if (!response.ok) {
            const errorBody = await response.text();
            console.error("Ollama API Error Response:", errorBody);
            
            // 对特定错误提供更详细的信息
            if (response.status === 404) {
                throw new Error(`找不到模型 "${selectedModel}"，请确保模型已安装`);
            } else if (response.status === 400) {
                throw new Error(`模型 "${selectedModel}" 参数错误: ${errorBody}`);
            } else if (response.status === 500) {
                throw new Error(`Ollama服务器错误，可能是模型 "${selectedModel}" 加载失败: ${errorBody}`);
            } else {
                throw new Error(`Ollama API请求失败 (${response.status}): ${errorBody}`);
            }
        }
        
        if (!response.body) {
             throw new Error("Ollama API响应体为空");
        }

        // 直接返回响应体流
        return response.body;

    } catch (error) {
        console.error(`调用Ollama API时出错 (模型: ${selectedModel}):`, error);
        
        // 对AbortError提供友好的信息
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error(`请求模型 "${selectedModel}" 超时，请检查Ollama服务是否正常运行`);
        }
        
        // 重新抛出错误，让 API 路由处理
        throw error;
    }
}
```
现在让我们更新 API 路由，以便更好地处理模型错误：

Read file: src/app/api/chat/route.ts
让我们更新 API 路由，添加更好的错误处理和状态码映射：

```typescript:src/app/api/chat/route.ts
import { NextRequest } from 'next/server';
import { ApiRequestBody } from '@/lib/types';
import { OllamaStream } from '@/lib/ollamaClient'; // 导入流式处理函数

export const runtime = 'edge'; // 推荐 Edge Runtime 处理流式响应

export async function POST(request: NextRequest) {
  try {
    const body: ApiRequestBody = await request.json();
    const { task, payload, model } = body;

    console.log(`API收到任务: ${task}${model ? `, 模型: ${model}` : ''}`);

    // 验证请求
    if (!task) {
      return new Response(JSON.stringify({ error: "缺少任务类型" }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!payload) {
      return new Response(JSON.stringify({ error: "缺少请求数据" }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 假设所有任务都返回流
    if (task === 'general_chat' || task === 'analyze_json_add_tags') {
        try {
            const stream = await OllamaStream(payload, model, task);

            // 返回 Streaming Response
            // 使用 text/plain 或 text/event-stream 都可以，前端相应处理
            return new Response(stream, {
                headers: { 'Content-Type': 'text/plain; charset=utf-8' },
            });

        } catch (error) {
            console.error(`获取任务 ${task} 的流时出错:`, error);
            const message = error instanceof Error ? error.message : "从Ollama获取流失败";
            
            // 判断错误类型并返回适当的状态码
            let statusCode = 500;
            
            if (message.includes("找不到模型") || message.includes("模型") && message.includes("不可用")) {
                statusCode = 404; // 模型不存在
            } else if (message.includes("参数错误")) {
                statusCode = 400; // 参数错误
            } else if (message.includes("超时")) {
                statusCode = 504; // 网关超时
            }
            
            return new Response(JSON.stringify({ 
                error: "流处理错误", 
                detail: message,
                model: model // 返回请求的模型，以便前端处理
            }), { 
                status: statusCode,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    } else {
         return new Response(JSON.stringify({ error: `不支持的任务类型: ${task}` }), { 
           status: 400,
           headers: { 'Content-Type': 'application/json' }
         });
    }

  } catch (error) {
    console.error("API路由错误:", error);
    const errorMessage = error instanceof Error ? error.message : "发生内部服务器错误";
    return new Response(JSON.stringify({ 
      error: "请求处理失败", 
      detail: errorMessage
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
```
现在让我们更新 page.tsx 中的错误处理，以便更好地在前端处理和显示模型相关错误：

```typescript jsx:src/app/page.tsx
'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ChatWindow, ChatWindowHandle } from '@/components/ChatWindow';
import { ChatInput } from '@/components/ChatInput';
import { ApiRequestBody, ApiTaskType } from '@/lib/types';
import { DisplayMessage } from '@/components/ChatMessage';
import { v4 as uuidv4 } from 'uuid';
import { useStreamResponse } from '@/hooks/useStreamResponse';
import { useModelConfig, ModelConfig } from '@/hooks/useModelConfig';
import { ModelSelector } from '@/components/ui/ModelSelector';
import { ModelEditDialog } from '@/components/ui/ModelEditDialog';

type InteractionMode = "chat" | "json_analysis";

export default function Home() {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [mode, setMode] = useState<InteractionMode>("chat");
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  
  // 模型相关状态
  const [isModelDialogOpen, setIsModelDialogOpen] = useState(false);
  const [editingModelId, setEditingModelId] = useState<string | null>(null);
  const [modelError, setModelError] = useState<string | null>(null); // 添加模型错误状态

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
        requestBody = { 
          task: currentTask, 
          payload: parsedJson,
          model: selectedModel.modelId // 传递选中的模型ID
        };
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
      requestBody = { 
        task: currentTask, 
        payload: historyToSend,
        model: selectedModel.modelId // 传递选中的模型ID
      };
    }

    // --- 添加助手消息占位符 ---
    let assistantMessageId = uuidv4();
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
  }, [messages, addMessage, updateLastMessage, mode, sendStreamRequest, getSelectedModel]);

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

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900 scrollbar-hide">
      <header className="p-4 border-b border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 flex justify-between items-center sticky top-0 z-10">
        <h1 className="text-xl font-semibold">Ollama 助手 ({mode === 'chat' ? '对话' : 'JSON 分析'})</h1>
        
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
          
          {/* 模式切换按钮 */}
          <button
            onClick={() => setMode(prev => prev === 'chat' ? 'json_analysis' : 'chat')}
            className="px-3 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm"
            disabled={isLoading} // 在加载时禁用切换
          >
            切换到 {mode === 'chat' ? 'JSON 分析' : '对话'} 模式
          </button>
        </div>
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
      
      {/* 模型编辑对话框 */}
      <ModelEditDialog 
        isOpen={isModelDialogOpen}
        onClose={() => setIsModelDialogOpen(false)}
        onSave={handleSaveModel}
        initialData={getModelForEditing()}
        isEditing={!!editingModelId}
      />
    </div>
  );
}
```
最后，让我们更新 `useStreamResponse` 钩子，以更好地处理可能出现的错误：

Read file: src/hooks/useStreamResponse.ts
让我们查看 `useStreamResponse` 钩子的前段部分：

Read file: src/hooks/useStreamResponse.ts
现在让我们更新 `useStreamResponse` 钩子以更好地处理错误：

```typescript:src/hooks/useStreamResponse.ts
import { useCallback } from 'react';
import { ApiRequestBody, ApiTaskType } from '@/lib/types';
import { DisplayMessage } from '@/components/ChatMessage';

type StreamResponseCallback = (updates: Partial<DisplayMessage>) => void;

/**
 * 用于处理流式响应的自定义Hook
 */
export function useStreamResponse() {
  /**
   * 处理来自API的流式响应
   * @param response 从fetch API获得的响应对象
   * @param updateCallback 用于更新UI的回调函数
   * @param currentTask 当前执行的任务类型
   * @param abortSignal 用于中断请求的AbortSignal
   */
  const processStream = useCallback(async (
    response: Response,
    updateCallback: StreamResponseCallback,
    currentTask: ApiTaskType,
    abortSignal?: AbortSignal
  ) => {
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        // 如果无法解析JSON，尝试获取文本
        const textError = await response.text();
        throw new Error(`API请求失败，状态码: ${response.status}, 错误: ${textError || '未知错误'}`);
      }
      
      // 处理特定错误类型
      if (errorData.model) {
        throw new Error(`模型错误: ${errorData.detail || errorData.error || '未知模型错误'} (模型: ${errorData.model})`);
      } else {
        throw new Error(errorData.detail || errorData.error || `API请求失败，状态码: ${response.status}`);
      }
    }
    
    if (!response.body) {
      throw new Error("响应体为空");
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
    
    // 添加超时保护
    let lastActivityTimestamp = Date.now();
    const INACTIVITY_TIMEOUT = 30000; // 30秒无活动判定为超时

    try {
      while (true) {
        // 检查是否已请求中断
        if (abortSignal?.aborted) {
          throw new Error('请求已中断');
        }
        
        // 检查流是否超时无响应
        if (Date.now() - lastActivityTimestamp > INACTIVITY_TIMEOUT) {
          throw new Error('从模型获取响应超时，请检查网络连接或服务器状态');
        }

        const { done, value } = await reader.read();
        if (done) break;
        
        // 更新活动时间戳
        lastActivityTimestamp = Date.now();

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
              console.log("流结束 [DONE]");
              thinkingDone = true; // 标记思考结束（即使没有</think>）
              updateCallback({ isThinkingComplete: thinkingDone });
              break; // 跳出内层 for 循环 (不是 while)
            }

            try {
              const parsedData = JSON.parse(dataContent);
              
              // 检查是否有错误信息
              if (parsedData.error) {
                throw new Error(`模型响应错误: ${parsedData.error}`);
              }
              
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
                      updateCallback({
                        thinkContent: currentThinkContent,
                        isThinkingComplete: thinkingDone,
                        mainContent: currentMainContent + remainingChunk // 处理紧跟在</think>后的内容
                      });
                      currentMainContent += remainingChunk; // 更新累积的 main content
                      remainingChunk = ''; // 这个 chunk 处理完了

                    } else {
                      currentThinkContent += remainingChunk;
                      remainingChunk = ''; // 这个 chunk 处理完了
                      // 更新 UI (持续更新思考内容)
                      updateCallback({ thinkContent: currentThinkContent, isThinkingComplete: false });
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
                      updateCallback({
                        mainContent: currentMainContent,
                        thinkContent: currentThinkContent, // 开始填充思考内容
                        isThinkingComplete: false,
                      });
                    } else {
                      // 没有 think 标签，全部是 main content
                      currentMainContent += remainingChunk;
                      remainingChunk = ''; // 这个 chunk 处理完了
                      // 更新 UI
                      updateCallback({ mainContent: currentMainContent });
                    }
                  }
                }
                // --- 结束 <think> 标签处理 ---

                // 如果是 JSON 分析任务，将 mainContent 累加到 accumulatedJson
                if (currentTask === 'analyze_json_add_tags' && !isParsingThinking && currentMainContent.length > 0) {
                  accumulatedJson = currentMainContent; // 直接使用当前的mainContent，避免重复累加
                }
              } // end if (textChunk)

              // 处理流结束标志 (finish_reason)
              if (parsedData.choices?.[0]?.finish_reason === 'stop') {
                console.log("流结束 (finish_reason=stop)");
                thinkingDone = true; // 标记思考结束
                updateCallback({ isThinkingComplete: thinkingDone });
                break; // 跳出内层 for 循环
              }

            } catch (e) {
              console.error('解析SSE数据块失败:', dataContent, e);
              // 如果持续解析失败，可以考虑抛出错误终止流
              if (dataContent.includes('error') || dataContent.includes('Error')) {
                throw new Error(`解析模型响应出错: ${e instanceof Error ? e.message : String(e)}`);
              }
            }
          } // end if (line.startsWith('data: '))
        } // end for loop (lines)

        if (lines.includes('[DONE]') || thinkingDone && !isParsingThinking) {
          // 检查是否是因为 [DONE] 或 finish_reason='stop' 跳出的
          if(lines.includes('[DONE]') || decoder.decode(value).includes('"finish_reason":"stop"')) break; // 退出外层 while
        }
      } // --- End while loop ---

      // --- 流结束后处理 JSON 分析任务的最终结果 ---
      if (currentTask === 'analyze_json_add_tags') {
        if (accumulatedJson.trim()) {
          try {
            console.log("尝试解析累积的JSON内容");
            // 清理可能的 markdown (虽然 prompt 要求不加，但以防万一)
            const finalCleanedJson = accumulatedJson.replace(/^```json\s*|```$/g, '').trim();
            const finalResult = JSON.parse(finalCleanedJson);
            // 成功解析，用格式化的 JSON 更新最后一条消息
            updateCallback({
              mainContent: JSON.stringify(finalResult, null, 2) // 最终显示格式化的 JSON
            });
          } catch (e) {
            console.error("解析最终JSON失败:", e);
            updateCallback({
              role: 'error',
              mainContent: `JSON 解析失败: ${e instanceof Error ? e.message : String(e)}\n\n接收到的内容: ${accumulatedJson.substring(0, 200)}${accumulatedJson.length > 200 ? '...' : ''}`
            });
          }
        } else if (thinkingDone && !accumulatedJson.trim()) {
          // 只有思考过程，没有 JSON 输出
          console.warn("JSON Analysis 任务完成，但<think>块后没有累积任何JSON内容");
          updateCallback({
            mainContent: "(模型仅输出了思考过程，未找到有效的 JSON 输出)"
          });
        }
      }
    } catch (error) {
      // 处理特定的错误类型
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('流处理被中断');
        throw new Error('请求已被用户中断');
      }
      
      // 重新抛出错误，让调用者处理
      throw error;
    } finally {
      // 确保读取器已关闭
      try {
        await reader.cancel();
      } catch (e) {
        console.warn('关闭流读取器时出错:', e);
      }
    }
  }, []);

  /**
   * 发送请求并处理流式响应
   * @param requestBody API请求体
   * @param updateCallback 用于更新UI的回调函数
   * @param abortController 用于中断请求的AbortController
   */
  const sendStreamRequest = useCallback(async (
    requestBody: ApiRequestBody,
    updateCallback: StreamResponseCallback,
    abortController?: AbortController
  ) => {
    try {
      // 记录请求信息
      console.log(`发送${requestBody.task}请求，使用模型: ${requestBody.model || '默认'}`);
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: abortController?.signal
      });

      await processStream(response, updateCallback, requestBody.task, abortController?.signal);
      return true;
    } catch (error) {
      console.error('流式API调用失败:', error);
      
      // 检查是否是中断错误
      if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('中断'))) {
        console.log('请求已中断');
        updateCallback({
          mainContent: currentContent => `${currentContent || ''}\n\n[请求已中断]`,
          isThinkingComplete: true,
        });
        return false;
      } 
      // 检查是否是模型错误
      else if (error instanceof Error && (
          error.message.includes('模型') || 
          error.message.includes('model') || 
          error.message.includes('找不到')
      )) {
        updateCallback({
          role: 'error',
          content: '',
          mainContent: `模型错误: ${error.message}`,
          isThinkingComplete: true,
        });
        // 重新抛出错误，让上层组件处理特定的模型错误
        throw new Error(`模型错误: ${error.message}`);
      } 
      // 其他一般错误
      else {
        updateCallback({
          role: 'error',
          content: '',
          mainContent: `流式请求错误: ${error instanceof Error ? error.message : String(error)}`,
          isThinkingComplete: true,
        });
        return false;
      }
    }
  }, [processStream]);

  return { sendStreamRequest };
}
```
让我修复 `useStreamResponse.ts` 中的类型错误：

```typescript:src/hooks/useStreamResponse.ts
// 修复 useStreamResponse.ts 中的类型错误
// ...existing code...
      // 检查是否是中断错误
      if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('中断'))) {
        console.log('请求已中断');
        updateCallback({
          mainContent: `${updateCallback && typeof updateCallback === 'function' ? '': ''}\n\n[请求已中断]`,
          isThinkingComplete: true,
        });
        return false;
      } 
// ...existing code...
```
这个修复方案不太对，让我们再次尝试：

```typescript:src/hooks/useStreamResponse.ts
// ...existing code...
      // 检查是否是中断错误
      if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('中断'))) {
        console.log('请求已中断');
        updateCallback({
          mainContent: '[请求已中断]',
          isThinkingComplete: true,
        });
        return false;
      } 
// ...existing code...
```
很好，现在我们已经成功改进了 Ollama 聊天应用的模型切换功能。以下是我们的改进：

## 完成的功能和改进

1. **在 OllamaClient 中添加了模型验证功能**
   - 添加了 `validateModel` 函数，尝试检查模型是否在 Ollama 可用模型列表中
   - 增加了模型请求超时处理和更好的错误处理
   - 提供更详细的错误信息，特别是针对模型相关错误

2. **改进了 API 路由处理**
   - 增强了错误处理机制，特别是模型相关错误
   - 添加了请求参数验证
   - 根据错误类型返回合适的 HTTP 状态码和更有用的错误消息

3. **扩展了页面组件的错误处理**
   - 添加了专门的模型错误状态和错误消息显示
   - 在模型选择器下方增加了错误提示，使用户能直观地看到模型问题
   - 优化了错误恢复流程，当用户切换模型时自动清除错误状态

4. **增强了 useStreamResponse 钩子**
   - 添加了更完善的错误处理和分类
   - 增加了流处理超时保护
   - 改进了JSON解析逻辑，避免重复累加
   - 添加了资源清理确保流关闭

## 总结

现在，当用户通过 ModelSelector 组件切换模型时：

1. 前端会将所选模型的 ID 通过请求传递给后端
2. 后端 API 会将此模型 ID 传递给 OllamaClient
3. OllamaClient 会尝试验证模型并使用它来处理请求
4. 如果发生模型相关错误，将返回详细的错误信息到前端
5. 前端会显示模型错误通知，并在聊天窗口中显示错误消息

这些改进使得用户在切换模型时获得更好的体验，同时也提供了更清晰的错误信息，帮助用户解决可能出现的问题。

您可以测试这些功能：
1. 添加不存在的模型并尝试使用它
2. 切换到正确的模型来恢复功能
3. 在请求过程中中断请求
4. 测试 JSON 分析模式

以上更改已完成，Ollama 聊天应用现在可以更好地处理模型切换和相关错误情况。
