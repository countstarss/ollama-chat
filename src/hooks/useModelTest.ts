import { useState, useCallback } from 'react';
import { ModelConfig } from './useModelConfig';

interface ModelTestResult {
  isValid: boolean;
  error?: string;
  responseTime?: number;
}

interface ModelTestHook {
  testModel: (model: ModelConfig) => Promise<ModelTestResult>;
  isTestingModel: boolean;
  testError: string | null;
}

// API请求的基础配置
const API_TIMEOUT = 10000; // 10秒超时
const TEST_MESSAGE = "Say 'Hello' to confirm you are working.";

/**
 * 构建不同API提供商的请求配置
 */
function buildApiRequest(model: ModelConfig) {
  const baseHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  let apiUrl = '';
  let requestBody: any = {};

  if (!model.isApiModel) {
    // 本地Ollama模型
    return {
      url: process.env.NEXT_PUBLIC_OLLAMA_API_URL || 'http://localhost:11434/v1/chat/completions',
      headers: baseHeaders,
      body: {
        model: model.modelId,
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: TEST_MESSAGE }
        ],
        stream: false,
        max_tokens: 50,
        temperature: 0.7
      }
    };
  }

  // API模型
  switch (model.apiProvider) {
    case 'openai':
      apiUrl = model.apiEndpoint || 'https://api.openai.com/v1/chat/completions';
      baseHeaders['Authorization'] = `Bearer ${model.apiKey}`;
      requestBody = {
        model: model.modelId,
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: TEST_MESSAGE }
        ],
        max_tokens: 50,
        temperature: 0.7
      };
      break;

    case 'anthropic':
      apiUrl = model.apiEndpoint || 'https://api.anthropic.com/v1/messages';
      baseHeaders['x-api-key'] = model.apiKey || '';
      baseHeaders['anthropic-version'] = model.apiVersion || '2023-06-01';
      requestBody = {
        model: model.modelId,
        messages: [
          { role: 'user', content: TEST_MESSAGE }
        ],
        max_tokens: 50,
        temperature: 0.7
      };
      break;

    case 'custom':
      apiUrl = model.apiEndpoint || '';
      if (model.apiKey) {
        baseHeaders['Authorization'] = `Bearer ${model.apiKey}`;
      }
      requestBody = {
        model: model.modelId,
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: TEST_MESSAGE }
        ],
        max_tokens: 50,
        temperature: 0.7
      };
      break;

    default:
      throw new Error(`不支持的API提供商: ${model.apiProvider}`);
  }

  return {
    url: apiUrl,
    headers: baseHeaders,
    body: requestBody
  };
}

/**
 * 验证API响应
 */
function validateApiResponse(data: any, apiProvider?: string): boolean {
  if (!data) return false;

  if (apiProvider === 'anthropic') {
    return !!(data.content && data.content[0]?.text);
  }

  // OpenAI 格式（包括 Ollama 和大多数兼容API）
  return !!(data.choices && data.choices[0]?.message?.content);
}

/**
 * Hook for testing model availability
 */
export function useModelTest(): ModelTestHook {
  const [isTestingModel, setIsTestingModel] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);

  const testModel = useCallback(async (model: ModelConfig): Promise<ModelTestResult> => {
    setIsTestingModel(true);
    setTestError(null);

    const startTime = Date.now();

    try {
      // 验证必要的配置
      if (model.isApiModel && !model.apiKey) {
        throw new Error('API模型未配置密钥');
      }

      // 构建请求配置
      const { url, headers, body } = buildApiRequest(model);

      if (!url) {
        throw new Error('API端点未配置');
      }

      // 发送测试请求
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(API_TIMEOUT)
      });

      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `模型测试失败 (${response.status})`;
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error?.message || errorData.message || errorMessage;
        } catch {
          errorMessage += `: ${errorText.substring(0, 100)}`;
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();
      const isValid = validateApiResponse(data, model.apiProvider);

      if (!isValid) {
        throw new Error('API响应格式无效');
      }

      setIsTestingModel(false);
      return {
        isValid: true,
        responseTime
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      setTestError(errorMessage);
      setIsTestingModel(false);

      console.error(`[ModelTest] 测试模型 ${model.modelId} 失败:`, error);

      return {
        isValid: false,
        error: errorMessage
      };
    }
  }, []);

  return {
    testModel,
    isTestingModel,
    testError
  };
}