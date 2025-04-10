export interface StarredMessage {
  id: string;
  chatId: string;
  content: string;
  role: string;
  timestamp: string;
  modelName?: string;
  title?: string;
}
