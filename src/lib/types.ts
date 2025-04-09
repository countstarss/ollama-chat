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
  temperature: number; // 温度，控制输出的随机性 (0-2)
  topP: number; // Top-P (核心采样), 控制多样性 (0-1)
  topK: number; // Top-K，只考虑最高概率的K个词 (1-100)
  maxTokens: number; // 最大生成的token数量
  presencePenalty: number; // 存在惩罚，减少重复话题 (0-1)
  frequencyPenalty: number; // 频率惩罚，减少重复词语 (0-1)
}

// MARK: API请求体类型
// NOTE: 未来可以拓展
export type ApiTaskType = "general_chat"; // Add more task types here

export interface ApiRequestBody {
  task: ApiTaskType;
  payload: any;
  model?: string;
  settings?: ModelGenerationSettings; // 添加可选的生成设置
}
