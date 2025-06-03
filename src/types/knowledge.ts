import { DisplayMessage } from "@/components/chat/ChatMessage";

export interface KnowledgeLibrary {
  id: string;
  name: string;
  createdAt: number;
  /**
   * 与该知识库相关的对话消息（仅 RAG 问答产生）
   */
  messages: DisplayMessage[];
}
