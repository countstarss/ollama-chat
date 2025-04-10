import { v4 as uuidv4 } from "uuid";

// 收藏消息的接口
export interface StarredMessage {
  id: string;
  content: string;
  createdAt: number; // 时间戳
  tags?: string[]; // 可选标签
}

// 本地存储键
const STORAGE_KEY = "ollama-chat-starred-messages";

// 保存收藏消息
export async function saveStarredMessage(
  content: string,
  tags: string[] = []
): Promise<StarredMessage> {
  try {
    // 创建新的收藏消息
    const newStarredMessage: StarredMessage = {
      id: uuidv4(),
      content,
      createdAt: Date.now(),
      tags,
    };

    // 获取现有收藏
    const existingMessages = await getAllStarredMessages();

    // 合并并保存
    const updatedMessages = [newStarredMessage, ...existingMessages];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedMessages));

    return newStarredMessage;
  } catch (error) {
    console.error("保存收藏消息失败:", error);
    throw new Error("保存收藏消息失败");
  }
}

// 获取所有收藏消息
export async function getAllStarredMessages(): Promise<StarredMessage[]> {
  try {
    const storedData = localStorage.getItem(STORAGE_KEY);
    if (storedData) {
      return JSON.parse(storedData);
    }
    return [];
  } catch (error) {
    console.error("获取收藏消息失败:", error);
    return [];
  }
}

// 删除特定收藏消息
export async function deleteStarredMessage(id: string): Promise<boolean> {
  try {
    const messages = await getAllStarredMessages();
    const updatedMessages = messages.filter((msg) => msg.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedMessages));
    return true;
  } catch (error) {
    console.error(`删除收藏消息 ${id} 失败:`, error);
    return false;
  }
}

// 搜索收藏消息
export async function searchStarredMessages(
  query: string,
  timeRange?: { start?: number; end?: number }
): Promise<StarredMessage[]> {
  try {
    const allMessages = await getAllStarredMessages();

    return allMessages.filter((msg) => {
      // 内容匹配
      const contentMatch = query
        ? msg.content.toLowerCase().includes(query.toLowerCase())
        : true;

      // 时间范围匹配
      let timeMatch = true;
      if (timeRange) {
        if (timeRange.start && msg.createdAt < timeRange.start) {
          timeMatch = false;
        }
        if (timeRange.end && msg.createdAt > timeRange.end) {
          timeMatch = false;
        }
      }

      return contentMatch && timeMatch;
    });
  } catch (error) {
    console.error("搜索收藏消息失败:", error);
    return [];
  }
}

// 检查消息是否已收藏 (基于内容匹配)
export async function isMessageStarred(content: string): Promise<boolean> {
  try {
    const messages = await getAllStarredMessages();
    return messages.some((msg) => msg.content === content);
  } catch (error) {
    console.error("检查消息是否已收藏失败:", error);
    return false;
  }
}
