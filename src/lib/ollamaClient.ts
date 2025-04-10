import {
  ChatMessage,
  JsonAnalysisInput,
  ApiTaskType,
  ModelGenerationSettings,
} from "./types";

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
  frequencyPenalty: 0,
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
  model: string,
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

  if (!Array.isArray(payload)) {
    throw new Error(
      "Invalid payload for general_chat task. Expecting ChatMessage[]."
    );
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
      frequency_penalty: finalSettings.frequencyPenalty,
    };

    const response = await fetch(OLLAMA_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: selectedModel,
        messages: messages,
        stream: true,
        options: options, // 传递完整的选项对象
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
