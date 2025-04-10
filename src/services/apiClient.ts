import { ModelConfig } from "@/hooks/useModelConfig";
import toastService from "./toastService";

// 基础请求接口
interface ApiRequestBase {
  messages: Array<{ role: string; content: string }>;
  model: string;
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}

// OpenAI 请求
interface OpenAIRequest extends ApiRequestBase {}

// Anthropic 请求
interface AnthropicRequest {
  model: string;
  messages: Array<{ role: string; content: string }>;
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  system?: string;
}

// 响应接口
export interface ApiResponse {
  id: string;
  content: string;
  role: string;
  thinking?: string;
  isThinkingComplete?: boolean;
  mainContent?: string;
}

/**
 * API客户端，处理与外部LLM服务的通信
 */
export class ApiClient {
  private modelConfig: ModelConfig;
  private controller: AbortController;

  constructor(modelConfig: ModelConfig) {
    this.modelConfig = modelConfig;
    this.controller = new AbortController();
  }

  /**
   * 发送请求到API服务
   */
  async sendRequest(
    messages: Array<{ role: string; content: string }>,
    onUpdate: (content: Partial<ApiResponse>) => void
  ): Promise<boolean> {
    try {
      // 根据不同的API提供商选择不同的处理方法
      switch (this.modelConfig.apiProvider) {
        case "openai":
          return await this.sendOpenAIRequest(messages, onUpdate);
        case "anthropic":
          return await this.sendAnthropicRequest(messages, onUpdate);
        case "custom":
          return await this.sendCustomRequest(messages, onUpdate);
        default:
          throw new Error(`不支持的API提供商: ${this.modelConfig.apiProvider}`);
      }
    } catch (error) {
      // 如果是因为用户取消请求而导致的错误，不显示错误提示
      if (error instanceof Error && error.name === "AbortError") {
        console.log("请求被用户取消");
        return false;
      }

      console.error("API请求失败:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      toastService.error(`API请求失败: ${errorMessage}`);

      onUpdate({
        role: "error",
        content: "",
        mainContent: `API请求错误: ${errorMessage}`,
        isThinkingComplete: true,
      });

      return false;
    }
  }

  /**
   * 中止正在进行的请求
   */
  abort() {
    this.controller.abort();
    // 创建新的控制器供下次使用
    this.controller = new AbortController();
  }

  /**
   * 发送请求到OpenAI API
   */
  private async sendOpenAIRequest(
    messages: Array<{ role: string; content: string }>,
    onUpdate: (content: Partial<ApiResponse>) => void
  ): Promise<boolean> {
    const apiKey = this.modelConfig.apiKey;
    const endpoint =
      this.modelConfig.apiEndpoint ||
      "https://api.openai.com/v1/chat/completions";

    const requestBody: OpenAIRequest = {
      model: this.modelConfig.modelId,
      messages: messages,
      max_tokens: 2000,
      temperature: 0.7,
    };

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
      signal: this.controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API 错误 (${response.status}): ${errorText}`);
    }

    // 检查响应是否是流式的
    if (response.headers.get("content-type")?.includes("text/event-stream")) {
      return this.handleOpenAIStream(response, onUpdate);
    } else {
      const data = await response.json();
      if (data.choices && data.choices.length > 0) {
        const content = data.choices[0].message.content;
        onUpdate({
          role: "assistant",
          content: content,
          mainContent: content,
          isThinkingComplete: true,
        });
        return true;
      } else {
        throw new Error("OpenAI API 返回了无效的响应格式");
      }
    }
  }

  /**
   * 处理OpenAI的流式响应
   */
  private async handleOpenAIStream(
    response: Response,
    onUpdate: (content: Partial<ApiResponse>) => void
  ): Promise<boolean> {
    const reader = response.body?.getReader();
    const decoder = new TextDecoder("utf-8");
    let content = "";

    if (!reader) {
      throw new Error("无法读取响应流");
    }

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk
          .split("\n")
          .filter(
            (line) => line.trim() !== "" && line.trim() !== "data: [DONE]"
          );

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const jsonStr = line.slice(6);
              const json = JSON.parse(jsonStr);

              if (json.choices && json.choices.length > 0) {
                const delta = json.choices[0].delta;
                if (delta.content) {
                  content += delta.content;
                  onUpdate({
                    role: "assistant",
                    content: content,
                    mainContent: content,
                  });
                }
              }
            } catch (e) {
              console.warn("解析流数据失败:", e);
            }
          }
        }
      }

      // 完成流式传输后，标记为完成
      onUpdate({
        isThinkingComplete: true,
      });

      return true;
    } catch (error) {
      // 如果是因为用户取消请求而导致的错误，优雅地处理
      if (error instanceof Error && error.name === "AbortError") {
        console.log("流式处理被用户取消");
        onUpdate({
          isThinkingComplete: true,
        });
        return false;
      }
      throw error;
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * 发送请求到Anthropic API
   */
  private async sendAnthropicRequest(
    messages: Array<{ role: string; content: string }>,
    onUpdate: (content: Partial<ApiResponse>) => void
  ): Promise<boolean> {
    const apiKey = this.modelConfig.apiKey;
    const endpoint =
      this.modelConfig.apiEndpoint || "https://api.anthropic.com/v1/messages";

    if (!apiKey) {
      throw new Error("Anthropic API 密钥未提供");
    }

    // 提取system消息，如果有的话
    const systemMessage = messages.find((msg) => msg.role === "system");
    const userAssistantMessages = messages.filter((msg) =>
      ["user", "assistant"].includes(msg.role)
    );

    const requestBody: AnthropicRequest = {
      model: this.modelConfig.modelId,
      messages: userAssistantMessages,
      max_tokens: 2000,
      temperature: 0.7,
    };

    // 如果有system消息，添加到请求中
    if (systemMessage) {
      requestBody.system = systemMessage.content;
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(requestBody),
      signal: this.controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Anthropic API 错误 (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    if (data.content && data.content.length > 0) {
      const content = data.content[0].text;
      onUpdate({
        role: "assistant",
        content: content,
        mainContent: content,
        isThinkingComplete: true,
      });
      return true;
    } else {
      throw new Error("Anthropic API 返回了无效的响应格式");
    }
  }

  /**
   * 发送请求到自定义API端点
   */
  private async sendCustomRequest(
    messages: Array<{ role: string; content: string }>,
    onUpdate: (content: Partial<ApiResponse>) => void
  ): Promise<boolean> {
    const apiKey = this.modelConfig.apiKey;
    const endpoint = this.modelConfig.apiEndpoint;

    if (!endpoint) {
      throw new Error("自定义API端点未指定");
    }

    // 通用请求格式，根据实际使用的API进行调整
    const requestBody = {
      model: this.modelConfig.modelId,
      messages: messages,
      max_tokens: 2000,
      temperature: 0.7,
    };

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
      signal: this.controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`自定义API 错误 (${response.status}): ${errorText}`);
    }

    const data = await response.json();

    // 为自定义API提供一个灵活的处理方式，假设返回格式类似OpenAI
    if (data.choices && data.choices.length > 0) {
      const content = data.choices[0].message.content;
      onUpdate({
        role: "assistant",
        content: content,
        mainContent: content,
        isThinkingComplete: true,
      });
      return true;
    } else if (data.content) {
      // 尝试不同的响应格式
      onUpdate({
        role: "assistant",
        content: data.content,
        mainContent: data.content,
        isThinkingComplete: true,
      });
      return true;
    } else {
      throw new Error("自定义API 返回了无法识别的响应格式");
    }
  }
}
