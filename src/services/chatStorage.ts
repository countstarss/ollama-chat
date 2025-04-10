import { DisplayMessage } from "@/components/chat/ChatMessage";
import { openDB, IDBPDatabase } from "idb";
import toastService from "./toastService";

interface ChatSession {
  id: string;
  name: string;
  lastUpdated: number; // 时间戳
  messages: DisplayMessage[];
  modelId?: string; // 可选，记录使用的模型
}

// 数据库名称和版本
const DB_NAME = "ollama-chat-db";
const DB_VERSION = 1;
const STORE_NAME = "chat-sessions";

// MARK: 打开数据库连接
const openDatabase = async (): Promise<IDBPDatabase> => {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // 如果数据库尚不存在，创建对象存储
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        // 创建索引用于按最后更新时间排序
        store.createIndex("lastUpdated", "lastUpdated", { unique: false });
      }
    },
  });
};

// MARK: saveChat
export const saveChat = async (chatSession: ChatSession): Promise<void> => {
  try {
    const db = await openDatabase();
    await db.put(STORE_NAME, {
      ...chatSession,
      lastUpdated: Date.now(), // 更新时间戳
    });
    console.log(`聊天会话已保存: ${chatSession.id}`);
  } catch (error) {
    console.error("保存聊天会话失败:", error);
    // 如果IndexedDB失败，尝试使用localStorage作为备选
    try {
      localStorage.setItem(
        `chat_${chatSession.id}`,
        JSON.stringify({
          ...chatSession,
          lastUpdated: Date.now(),
        })
      );
    } catch (e) {
      console.error("localStorage备份也失败:", e);
    }
  }
};

// MARK: getChat
export const getChat = async (chatId: string): Promise<ChatSession | null> => {
  try {
    const db = await openDatabase();
    const chat = await db.get(STORE_NAME, chatId);
    return chat || null;
  } catch (error) {
    console.error(`获取聊天会话失败 ${chatId}:`, error);
    // 尝试从localStorage获取
    try {
      const chatJson = localStorage.getItem(`chat_${chatId}`);
      return chatJson ? JSON.parse(chatJson) : null;
    } catch (e) {
      console.error("从localStorage获取也失败:", e);
      return null;
    }
  }
};

// MARK: getAllChats
// NOTE: 获取所有聊天会话，按最近更新排序
export const getAllChats = async (): Promise<ChatSession[]> => {
  try {
    const db = await openDatabase();
    // 使用索引按更新时间倒序获取所有会话
    const chats = await db.getAllFromIndex(STORE_NAME, "lastUpdated");
    return chats.reverse(); // 最新的排在前面
  } catch (error) {
    console.error("获取所有聊天会话失败:", error);
    // 尝试从localStorage获取
    try {
      const chats: ChatSession[] = [];
      // 遍历localStorage中的所有键
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("chat_")) {
          const chatJson = localStorage.getItem(key);
          if (chatJson) {
            chats.push(JSON.parse(chatJson));
          }
        }
      }
      // 按lastUpdated排序
      return chats.sort((a, b) => b.lastUpdated - a.lastUpdated);
    } catch (e) {
      console.error("从localStorage获取也失败:", e);
      return [];
    }
  }
};

// MARK: deleteChat
// NOTE: 删除聊天会话
export const deleteChat = async (chatId: string): Promise<void> => {
  try {
    const db = await openDatabase();
    await db.delete(STORE_NAME, chatId);
  } catch (error) {
    toastService.error(`删除聊天会话失败 ${chatId}`);
    // 尝试从localStorage删除
    try {
      localStorage.removeItem(`chat_${chatId}`);
    } catch (e) {
      toastService.error(`从localStorage删除也失败: ${e}`);
    }
  }
};

// MARK: updateChatName
// NOTE: 更新聊天会话的名称
export const updateChatName = async (
  chatId: string,
  newName: string
): Promise<void> => {
  console.log(`[chatStorage] 开始更新聊天名称: ${chatId}, 新名称: ${newName}`);
  try {
    const db = await openDatabase();
    const chat = await db.get(STORE_NAME, chatId);
    if (chat) {
      console.log(
        `[chatStorage] 找到聊天记录: ${chatId}, 当前名称: ${chat.name}`
      );
      chat.name = newName;
      chat.lastUpdated = Date.now();
      await db.put(STORE_NAME, chat);
      console.log(`[chatStorage] 聊天名称已更新并保存: ${chatId}`);
      toastService.success(`聊天会话名称已更新`);
    } else {
      console.warn(`[chatStorage] 未找到聊天记录: ${chatId}`);
    }
  } catch (error) {
    console.error(`[chatStorage] 更新聊天会话名称失败 ${chatId}:`, error);
    toastService.error("更新聊天会话名称失败");

    // 尝试从localStorage更新
    try {
      console.log(`[chatStorage] 尝试从localStorage更新聊天名称: ${chatId}`);
      const chatJson = localStorage.getItem(`chat_${chatId}`);
      if (chatJson) {
        const chat = JSON.parse(chatJson);
        chat.name = newName;
        chat.lastUpdated = Date.now();
        localStorage.setItem(`chat_${chatId}`, JSON.stringify(chat));
        console.log(`[chatStorage] 从localStorage更新聊天名称成功: ${chatId}`);
      } else {
        console.warn(`[chatStorage] localStorage中未找到聊天记录: ${chatId}`);
      }
    } catch (e) {
      console.error("[chatStorage] 从localStorage更新也失败:", e);
      throw e; // 重新抛出错误以便调用者处理
    }
  }
};

// MARK: clearAllChats
// NOTE: 清理所有聊天会话数据（危险操作，谨慎使用）
export const clearAllChats = async (): Promise<void> => {
  try {
    const db = await openDatabase();
    await db.clear(STORE_NAME);
    toastService.success("所有聊天会话已清除");
  } catch (error) {
    toastService.error("清除所有聊天会话失败");
  }
};

// MARK: export type
// NOTE: 导出类型
export type { ChatSession };
