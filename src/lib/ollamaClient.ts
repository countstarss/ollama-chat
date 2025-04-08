import { ChatMessage, JsonAnalysisInput, JsonAnalysisResult, ApiTaskType } from './types';

const OLLAMA_API_URL = process.env.OLLAMA_API_URL || 'http://localhost:11434/v1/chat/completions';
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'deepseek-r1:7b';

interface OllamaOptions {
  temperature?: number;
}

// MARK: - OllamaStream
export async function OllamaStream(
  payload: any, // 可能是 ChatMessage[] 或 JsonAnalysisInput
  model: string = DEFAULT_MODEL,
  task: ApiTaskType // 需要知道任务类型来构建 prompt
): Promise<ReadableStream<Uint8Array>> {
    let messages: { role: string; content: string }[];
    let temperature = 0.7; // 默认温度

    // --- 根据任务类型构建不同的消息列表 ---
    if (task === 'analyze_json_add_tags') {
        const inputJson = payload as JsonAnalysisInput;
        // 再次强调不要输出 think 标签，但准备好前端会处理它
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

    console.log(`Requesting stream from Ollama (${model}) for task: ${task}`);

    try {
        const response = await fetch(OLLAMA_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: model,
                messages: messages,
                stream: true, // *** 启用流式响应 ***
                options: { temperature }
            }),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error("Ollama API Error Response:", errorBody);
            throw new Error(`Ollama API request failed with status ${response.status}: ${errorBody}`);
        }
        if (!response.body) {
             throw new Error("Ollama API response body is null.");
        }

        // 直接返回响应体流
        return response.body;

    } catch (error) {
        console.error('Error calling Ollama API for streaming:', error);
        // 重新抛出错误，让 API 路由处理
        throw error;
    }
}

// 保留非流式函数（或者让它们内部调用流式并聚合结果）
// 为了简单，暂时让 API route 直接调用 OllamaStream
// export async function analyzeJsonAndAddTags(...) { ... }
// export async function getChatCompletion(...) { ... }