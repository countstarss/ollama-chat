import { useState, useCallback } from "react";
import { ModelConfig } from "./useModelConfig";

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
const TEST_MESSAGE = "Hi"; // 极简的测试消息，减少生成时间

/**
 * 构建不同API提供商的请求配置
 */
function buildApiRequest(model: ModelConfig) {
  const baseHeaders: Record<string, string> = {
    "Content-Type": "application/json",
  };

  let apiUrl = "";
  let requestBody: any = {};

  if (!model.isApiModel) {
    // 本地Ollama模型
    return {
      url:
        process.env.NEXT_PUBLIC_OLLAMA_API_URL ||
        "http://localhost:11434/v1/chat/completions",
      headers: baseHeaders,
      body: {
        model: model.modelId,
        messages: [
          { role: "user", content: TEST_MESSAGE },
        ],
        stream: false,
        max_tokens: 10, // 减少到10个token
        temperature: 0.1, // 降低温度使响应更确定
      },
    };
  }

  // API模型
  switch (model.apiProvider) {
    case "openai":
      apiUrl =
        model.apiEndpoint || "https://api.openai.com/v1/chat/completions";
      baseHeaders["Authorization"] = `Bearer ${model.apiKey}`;
      requestBody = {
        model: model.modelId,
        messages: [
          { role: "user", content: TEST_MESSAGE },
        ],
        max_tokens: 10,
        temperature: 0.1,
      };
      break;

    case "anthropic":
      apiUrl = model.apiEndpoint || "https://api.anthropic.com/v1/messages";
      baseHeaders["x-api-key"] = model.apiKey || "";
      baseHeaders["anthropic-version"] = model.apiVersion || "2023-06-01";
      requestBody = {
        model: model.modelId,
        messages: [{ role: "user", content: TEST_MESSAGE }],
        max_tokens: 10,
        temperature: 0.1,
      };
      break;

    case "custom":
      apiUrl = model.apiEndpoint || "";
      if (model.apiKey) {
        baseHeaders["Authorization"] = `Bearer ${model.apiKey}`;
      }
      requestBody = {
        model: model.modelId,
        messages: [
          { role: "user", content: TEST_MESSAGE },
        ],
        max_tokens: 10,
        temperature: 0.1,
      };
      break;

    default:
      throw new Error(`不支持的API提供商: ${model.apiProvider}`);
  }

  return {
    url: apiUrl,
    headers: baseHeaders,
    body: requestBody,
  };
}

/**
 * 验证API响应
 */
function validateApiResponse(data: any, apiProvider?: string): boolean {
  if (!data) return false;

  if (apiProvider === "anthropic") {
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

  const testModel = useCallback(
    async (model: ModelConfig): Promise<ModelTestResult> => {
      setIsTestingModel(true);
      setTestError(null);

      const startTime = Date.now();

      try {
        // 验证必要的配置
        if (model.isApiModel && !model.apiKey) {
          throw new Error("API模型未配置密钥");
        }

        // 构建请求配置
        const { url, headers, body } = buildApiRequest(model);

        if (!url) {
          throw new Error("API端点未配置");
        }

        // 发送测试请求 - 使用流式响应以加快验证速度
        const response = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify({
            ...body,
            stream: true, // 强制使用流式响应
          }),
          signal: AbortSignal.timeout(API_TIMEOUT),
        });

        if (!response.ok) {
          const errorText = await response.text();
          let errorMessage = `模型测试失败 (${response.status})`;

          try {
            const errorData = JSON.parse(errorText);
            errorMessage =
              errorData.error?.message || errorData.message || errorMessage;
          } catch {
            errorMessage += `: ${errorText.substring(0, 100)}`;
          }

          throw new Error(errorMessage);
        }

        // 处理流式响应 - 只需要验证第一个有效chunk
        if (response.body) {
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          let foundValidContent = false;

          try {
            while (!foundValidContent) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              for (const line of lines) {
                if (line.trim() === '') continue;
                
                // 处理 SSE 格式
                if (line.startsWith('data: ')) {
                  const data = line.substring(6);
                  if (data === '[DONE]') continue;

                  try {
                    const parsed = JSON.parse(data);
                    
                    // 检查是否包含有效内容
                    if (model.apiProvider === 'anthropic') {
                      // Anthropic 格式
                      if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                        foundValidContent = true;
                        break;
                      }
                    } else {
                      // OpenAI 格式（包括 Ollama）
                      if (parsed.choices?.[0]?.delta?.content) {
                        foundValidContent = true;
                        break;
                      }
                    }
                  } catch (e) {
                    // 忽略解析错误，继续处理下一行
                  }
                }
              }

              // 如果已经找到有效内容，提前结束
              if (foundValidContent) {
                reader.cancel(); // 取消剩余的流
                break;
              }
            }
          } finally {
            reader.releaseLock();
          }

          const responseTime = Date.now() - startTime;

          if (foundValidContent) {
            setIsTestingModel(false);
            return {
              isValid: true,
              responseTime,
            };
          } else {
            throw new Error("未收到有效的响应内容");
          }
        } else {
          throw new Error("响应没有body");
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "未知错误";
        setTestError(errorMessage);
        setIsTestingModel(false);

        console.error(`[ModelTest] 测试模型 ${model.modelId} 失败:`, error);

        return {
          isValid: false,
          error: errorMessage,
        };
      }
    },
    []
  );

  return {
    testModel,
    isTestingModel,
    testError,
  };
}
