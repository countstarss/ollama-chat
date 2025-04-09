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

// MARK: API请求体类型
// NOTE: 未来可以拓展
export type ApiTaskType = "general_chat"; // Add more task types here

export interface ApiRequestBody {
  task: ApiTaskType;
  payload: any; 
  model?: string; 
}