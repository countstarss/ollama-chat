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

// Type for the API request body
export type ApiTaskType = "analyze_json_add_tags" | "general_chat"; // Add more task types here

export interface ApiRequestBody {
  task: ApiTaskType;
  payload: any; 
  model?: string; 
}