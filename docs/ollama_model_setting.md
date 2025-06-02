<think>用户要求我们在应用的 Header 右边添加一个设置按钮，点击后打开一个 modal 对话框，用于设置模型的温度等权重参数。这些设置应该可以由用户进行调整，并且要能够恢复默认值。

首先，我需要：
1. 创建一个设置按钮并添加到 Header 右侧
2. 创建一个模态对话框用于设置各种模型参数
3. 实现参数保存和恢复默认值的功能
4. 将这些设置传递给 API 请求

让我开始实现这个功能：

1. 首先，我需要在 page.tsx 中添加状态来存储模型的设置
2. 创建一个新的 Modal 组件，用于进行模型设置
3. 将设置按钮添加到 Header 中
4. 将设置参数传递给API请求

根据现有代码，我看到 ollamaClient.ts 中已经有了温度参数的使用，但是是硬编码的。我需要修改它，使其能够接受用户的自定义设置。</think># 向Ollama聊天应用添加模型设置功能

我将为应用添加一个设置按钮，让用户可以自定义模型的温度等参数。以下是实现方案：

## 1. 首先，创建一个ModelSettings组件

Ran tool
我需要创建一个新的ModelSettings组件，用于展示和修改模型的各种参数：

```typescript jsx:src/components/ui/ModelSettings.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { X, RotateCcw, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ModelSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ModelSettingsData;
  onSave: (settings: ModelSettingsData) => void;
}

export interface ModelSettingsData {
  temperature: number;
  topP: number;
  topK: number;
  maxTokens: number;
  presencePenalty: number;
  frequencyPenalty: number;
}

export const DEFAULT_SETTINGS: ModelSettingsData = {
  temperature: 0.7,
  topP: 0.9,
  topK: 40,
  maxTokens: 2048,
  presencePenalty: 0,
  frequencyPenalty: 0
};

export const ModelSettings: React.FC<ModelSettingsProps> = ({
  isOpen,
  onClose,
  settings,
  onSave
}) => {
  const [formData, setFormData] = useState<ModelSettingsData>(settings);
  
  // 当对话框打开或设置变更时重置表单
  useEffect(() => {
    if (isOpen) {
      setFormData(settings);
    }
  }, [isOpen, settings]);
  
  // 处理表单提交
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };
  
  // 处理数值字段变更
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let numValue = parseFloat(value);
    
    // 验证各字段的范围
    if (name === 'temperature') {
      numValue = Math.min(Math.max(numValue, 0), 2);
    } else if (name === 'topP' || name === 'presencePenalty' || name === 'frequencyPenalty') {
      numValue = Math.min(Math.max(numValue, 0), 1);
    } else if (name === 'topK') {
      numValue = Math.min(Math.max(Math.round(numValue), 1), 100);
    } else if (name === 'maxTokens') {
      numValue = Math.min(Math.max(Math.round(numValue), 16), 8192);
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: numValue
    }));
  };
  
  // 恢复默认设置
  const resetToDefault = () => {
    setFormData(DEFAULT_SETTINGS);
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            模型参数设置
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
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="temperature" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  温度 (Temperature)
                </label>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {formData.temperature.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                id="temperature"
                name="temperature"
                min="0"
                max="2"
                step="0.01"
                value={formData.temperature}
                onChange={handleChange}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                控制输出的随机性：较低值使输出更加确定性和连贯，较高值增加创造性和多样性。
              </p>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="topP" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Top P (核心采样)
                </label>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {formData.topP.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                id="topP"
                name="topP"
                min="0"
                max="1"
                step="0.01"
                value={formData.topP}
                onChange={handleChange}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                只考虑最可能的token，累积概率达到P值时停止。较低的值使输出更集中和确定性。
              </p>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="topK" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Top K
                </label>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {formData.topK}
                </span>
              </div>
              <input
                type="range"
                id="topK"
                name="topK"
                min="1"
                max="100"
                step="1"
                value={formData.topK}
                onChange={handleChange}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                仅从K个最可能的token中采样。较低的值提高输出一致性，较高的值增加多样性。
              </p>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="maxTokens" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  最大Token数
                </label>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {formData.maxTokens}
                </span>
              </div>
              <input
                type="range"
                id="maxTokens"
                name="maxTokens"
                min="16"
                max="8192"
                step="16"
                value={formData.maxTokens}
                onChange={handleChange}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                限制模型生成的最大token数量，防止过长回复。较大值允许更长的回复。
              </p>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="presencePenalty" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  存在惩罚 (Presence Penalty)
                </label>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {formData.presencePenalty.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                id="presencePenalty"
                name="presencePenalty"
                min="0"
                max="1"
                step="0.01"
                value={formData.presencePenalty}
                onChange={handleChange}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                对已出现过的token进行惩罚，增加模型讨论新主题的可能性。
              </p>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="frequencyPenalty" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  频率惩罚 (Frequency Penalty)
                </label>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {formData.frequencyPenalty.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                id="frequencyPenalty"
                name="frequencyPenalty"
                min="0"
                max="1"
                step="0.01"
                value={formData.frequencyPenalty}
                onChange={handleChange}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                根据频率对token进行惩罚，减少重复的句子和短语。
              </p>
            </div>
          </div>
          
          <div className="mt-6 flex justify-between">
            <button
              type="button"
              onClick={resetToDefault}
              className="flex items-center gap-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <RotateCcw className="w-4 h-4" />
              <span>恢复默认</span>
            </button>
            
            <div className="flex gap-3">
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
                保存
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
```
## 2. 修改 types.ts 文件，添加模型设置类型

```typescript:src/lib/types.ts
export interface ChatMessage {
  id: string; // Unique ID for each message
  role: "user" | "assistant" | "system" | "error"; // Sender role
  content: string; // Message content (text or stringified JSON)
}

export interface JsonAnalysisInput {
  content: string; // The text content to analyze
  [key: string]: any; // Allow other existing fields in the JSON
}

export interface JsonAnalysisResult extends JsonAnalysisInput {
  tags?: string[]; 
  error?: string; 
}

// 模型生成设置接口
export interface ModelGenerationSettings {
  temperature: number;     // 温度，控制输出的随机性 (0-2)
  topP: number;            // Top-P (核心采样), 控制多样性 (0-1)
  topK: number;            // Top-K，只考虑最高概率的K个词 (1-100)
  maxTokens: number;       // 最大生成的token数量
  presencePenalty: number; // 存在惩罚，减少重复话题 (0-1)
  frequencyPenalty: number; // 频率惩罚，减少重复词语 (0-1)
}

// Type for the API request body
export type ApiTaskType = "analyze_json_add_tags" | "general_chat"; // Add more task types here

export interface ApiRequestBody {
  task: ApiTaskType;
  payload: any; 
  model?: string;
  settings?: ModelGenerationSettings; // 添加可选的生成设置
}
```
## 3. 更新 OllamaClient 以支持自定义参数

```typescript:src/lib/ollamaClient.ts
import { ChatMessage, JsonAnalysisInput, ApiTaskType, ModelGenerationSettings } from "./types";

const OLLAMA_API_URL =
  process.env.OLLAMA_API_URL || "http://localhost:11434/v1/chat/completions";
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || "deepseek-r1:7b";

// 默认模型生成设置
export const DEFAULT_GENERATION_SETTINGS: ModelGenerationSettings = {
  temperature: 0.7,
  topP: 0.9,
  topK: 40,
  maxTokens: 2048,
  presencePenalty: 0,
  frequencyPenalty: 0
};

// MARK: - 添加模型验证函数
async function validateModel(model: string): Promise<boolean> {
  try {
    // 尝试查询Ollama API获取模型列表（如果API支持）
    const response = await fetch(
      `${OLLAMA_API_URL.split("/v1/")[0]}/v1/models`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      }
    );

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
  task: ApiTaskType, // 需要知道任务类型来构建 prompt
  settings?: ModelGenerationSettings // 添加可选的设置参数
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

  // 合并用户提供的设置与默认设置
  const finalSettings = settings 
    ? { ...DEFAULT_GENERATION_SETTINGS, ...settings }
    : DEFAULT_GENERATION_SETTINGS;

  let messages: { role: string; content: string }[];
  let temperature = finalSettings.temperature; // 使用设置中的温度

  // --- 根据任务类型构建不同的消息列表 ---
  if (task === 'analyze_json_add_tags') {
    const inputJson = payload as JsonAnalysisInput;
    const systemPrompt = `You are an expert data analyst. Analyze the "content" in the JSON below. Add a "tags" field (JSON array of strings) with relevant keywords/categories. IMPORTANT: You MUST output your reasoning process within <think>...</think> tags FIRST, then output the complete, modified JSON object *immediately* after the closing </think> tag. Do NOT add any other text outside the <think> block or the final JSON object.`;
    const userPrompt = `JSON object:\n\`\`\`json\n${JSON.stringify(inputJson, null, 2)}\n\`\`\`\nOutput format: <think>Your reasoning</think>{ "id": ..., "content": ..., "author": ..., "tags": [...] }`;
    messages = [ { role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }];
    // JSON 分析任务默认使用较低的温度，但也可以被用户设置覆盖
  } 
  else {
    if (!Array.isArray(payload)) {
      throw new Error("Invalid payload for general_chat task. Expecting ChatMessage[].");
    }
    messages = (payload as ChatMessage[]).map(({ role, content }) => ({
      role,
      content,
    }));
    // 可以添加通用聊天 System Prompt
    messages.unshift({
      role: "system",
      content:
        "You are a helpful AI assistant. If you need to think step-by-step, use <think>...</think> tags for your reasoning before providing the final answer.",
    });
  }

  console.log(
    `Requesting stream from Ollama (${selectedModel}) for task: ${task}, temperature: ${temperature}`
  );

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 30000); // 30秒超时

    // 构建API请求选项
    const options = {
      temperature: finalSettings.temperature,
      top_p: finalSettings.topP,
      top_k: finalSettings.topK,
      num_predict: finalSettings.maxTokens,
      presence_penalty: finalSettings.presencePenalty,
      frequency_penalty: finalSettings.frequencyPenalty
    };

    const response = await fetch(OLLAMA_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: selectedModel,
        messages: messages,
        stream: true,
        options: options // 传递完整的选项对象
      }),
      signal: controller.signal,
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
        throw new Error(
          `Ollama服务器错误，可能是模型 "${selectedModel}" 加载失败: ${errorBody}`
        );
      } else {
        throw new Error(
          `Ollama API请求失败 (${response.status}): ${errorBody}`
        );
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
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(
        `请求模型 "${selectedModel}" 超时，请检查Ollama服务是否正常运行`
      );
    }

    // 重新抛出错误，让 API 路由处理
    throw error;
  }
}
```
## 4. 更新 API 路由以传递设置参数

```typescript:src/app/api/chat/route.ts
import { NextRequest } from 'next/server';
import { ApiRequestBody } from '@/lib/types';
import { OllamaStream } from '@/lib/ollamaClient'; // 导入流式处理函数

export const runtime = 'edge'; // 推荐 Edge Runtime 处理流式响应

// MARK: - POST 请求
export async function POST(request: NextRequest) {
  try {
    const body: ApiRequestBody = await request.json();
    const { task, payload, model, settings } = body;

    console.log(`API收到任务: ${task}${model ? `, 模型: ${model}` : ''}${settings ? ', 带自定义设置' : ''}`);

    // MARK: - 验证请求
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
            // 传递设置参数给OllamaStream
            const stream = await OllamaStream(payload, model, task, settings);

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
## 5. 更新主页组件以添加设置按钮和功能

```typescript jsx:src/app/page.tsx
'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ChatWindow, ChatWindowHandle } from '@/components/ChatWindow';
import { ChatInput } from '@/components/ChatInput';
import { ApiRequestBody, ApiTaskType, ModelGenerationSettings } from '@/lib/types';
import { DisplayMessage } from '@/components/ChatMessage';
import { v4 as uuidv4 } from 'uuid';
import { useStreamResponse } from '@/hooks/useStreamResponse';
import { useModelConfig, ModelConfig } from '@/hooks/useModelConfig';
import { ModelSelector } from '@/components/ui/ModelSelector';
import { ModelEditDialog } from '@/components/ui/ModelEditDialog';
import { ModelSettings, ModelSettingsData, DEFAULT_SETTINGS } from '@/components/ui/ModelSettings';
import { Settings } from 'lucide-react';

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
      <header className="p-4 border-b border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 flex justify-between items-center sticky top-0 z-10">
        <h1 className="text-xl font-semibold">Ollama 助手</h1>
        
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
```
## 完成！

现在我们已经实现了模型参数设置功能！以下是已完成的改进：

1. **创建了ModelSettings模态对话框组件**
   - 提供了温度、Top-P、Top-K等参数的设置界面
   - 为每个参数提供了滑动条和详细说明
   - 添加了恢复默认值功能

2. **扩展了类型定义**
   - 添加了`ModelGenerationSettings`接口
   - 更新了API请求体类型以支持设置参数

3. **修改了OllamaClient**
   - 添加了默认生成设置
   - 更新了API调用以传递用户自定义参数
   - 扩展了现有的错误处理

4. **更新了API路由**
   - 支持接收和处理模型设置参数
   - 增强了日志记录，显示是否使用了自定义设置

5. **更新了主页组件**
   - 在Header右侧添加了设置按钮
   - 实现了设置的本地存储和恢复
   - 将设置参数传递给API请求

你现在可以点击界面右上角的设置图标调整模型参数，这些设置会被保存到浏览器的本地存储中，下次访问网站时会自动恢复。如果你想恢复默认设置，只需点击设置对话框中的"恢复默认"按钮。

这些参数允许用户根据自己的偏好调整模型输出：
- **温度**：控制输出的随机性
- **Top-P**：核心采样，控制多样性
- **Top-K**：只考虑最高概率的K个词
- **最大Token数**：限制模型生成的长度
- **存在/频率惩罚**：减少重复内容

所有这些设置都会在用户发送新消息时应用，让用户可以根据需要调整模型行为。
