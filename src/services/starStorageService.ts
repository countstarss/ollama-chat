import { openDB, DBSchema, IDBPDatabase } from "idb";
import { DisplayMessage } from "@/components/chat/ChatMessage";

// 定义数据库结构
interface StarredMessagesDB extends DBSchema {
  starredMessages: {
    key: string;
    value: StarredMessage;
    indexes: { "by-date": Date };
  };
}

// 扩展收藏消息类型，添加标题字段
export interface StarredMessage extends DisplayMessage {
  starredAt: Date;
  title: string;
  chatId?: string;
}

// 数据库名称和版本
const DB_NAME = "ollama-chat-starred-messages";
const DB_VERSION = 1;

// 获取数据库连接
async function getDB(): Promise<IDBPDatabase<StarredMessagesDB>> {
  return openDB<StarredMessagesDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // 创建存储对象和索引
      const store = db.createObjectStore("starredMessages", { keyPath: "id" });
      store.createIndex("by-date", "starredAt");
    },
  });
}

// 数据库操作服务
const starStorageService = {
  // 添加或更新收藏消息
  async saveStarredMessage(message: DisplayMessage): Promise<StarredMessage> {
    const db = await getDB();

    // 构建收藏消息对象
    const starredMessage: StarredMessage = {
      ...message,
      starredAt: new Date(),
      title: message.summary || "未命名",
    };

    await db.put("starredMessages", starredMessage);
    return starredMessage;
  },

  // 获取所有收藏消息
  async getAllStarredMessages(): Promise<StarredMessage[]> {
    const db = await getDB();
    return db.getAllFromIndex("starredMessages", "by-date");
  },

  // 根据 ID 获取收藏消息
  async getStarredMessage(id: string): Promise<StarredMessage | undefined> {
    const db = await getDB();
    return db.get("starredMessages", id);
  },

  // 删除收藏消息
  async removeStarredMessage(id: string): Promise<void> {
    const db = await getDB();
    await db.delete("starredMessages", id);
  },

  // 更新收藏消息标题
  async updateStarredMessageTitle(id: string, title: string): Promise<void> {
    const db = await getDB();
    const message = await db.get("starredMessages", id);

    if (message) {
      message.title = title;
      await db.put("starredMessages", message);
    }
  },

  // 搜索收藏消息
  async searchStarredMessages(query: string): Promise<StarredMessage[]> {
    const allMessages = await this.getAllStarredMessages();

    if (!query.trim()) return allMessages;

    const lowerQuery = query.toLowerCase();
    return allMessages.filter((message) => {
      return (
        message.title.toLowerCase().includes(lowerQuery) ||
        message.content.toLowerCase().includes(lowerQuery) ||
        (message.mainContent &&
          message.mainContent.toLowerCase().includes(lowerQuery))
      );
    });
  },
};

export default starStorageService;
