import { openDB, DBSchema, IDBPDatabase } from "idb";
import { DisplayMessage } from "@/components/chat/ChatMessage";
import { v4 as uuidv4 } from "uuid";

// 扩展消息角色类型，添加collection类型
type ExtendedRole = "user" | "assistant" | "system" | "error" | "collection";

// 定义数据库结构
interface StarredMessagesDB extends DBSchema {
  starredMessages: {
    key: string;
    value: StarredMessage;
    indexes: { "by-date": Date };
  };
}

// 扩展收藏消息类型，添加标题字段
export interface StarredMessage extends Omit<DisplayMessage, "role"> {
  role: ExtendedRole;
  starredAt: Date;
  title: string;
  chatId?: string;
  libraryId?: string;
  messageId?: string; // 添加消息ID字段，用于定位具体消息
  isCollection?: boolean;
  collectionMessages?: DisplayMessage[];
}

// 数据库名称和版本
const DB_NAME = "ollama-chat-starred-messages";
const DB_VERSION = 1;

// MARK: 获取数据库连接
async function getDB(): Promise<IDBPDatabase<StarredMessagesDB>> {
  return openDB<StarredMessagesDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // 创建存储对象和索引
      const store = db.createObjectStore("starredMessages", { keyPath: "id" });
      store.createIndex("by-date", "starredAt");
    },
  });
}

// MARK: 数据库操作服务
const starStorageService = {
  // 添加或更新收藏消息
  async saveStarredMessage(message: DisplayMessage): Promise<StarredMessage> {
    const db = await getDB();

    // 构建收藏消息对象
    const starredMessage: StarredMessage = {
      ...message,
      starredAt: new Date(),
      title: message.summary || "未命名",
      messageId: message.id, // 保存原始消息ID
      libraryId: message.libraryId, // 直接使用原始的 libraryId
    };

    console.log("[收藏消息] 保存消息:", {
      id: starredMessage.id,
      libraryId: starredMessage.libraryId,
      originalLibraryId: message.libraryId,
    });

    await db.put("starredMessages", starredMessage);
    return starredMessage;
  },

  // MARK: 创建收藏集合
  // NOTE:（包含多条消息）
  async saveCollectionMessage(
    messages: DisplayMessage[],
    collectionName: string,
    chatId?: string,
    libraryId?: string // 添加libraryId参数
  ): Promise<StarredMessage> {
    const db = await getDB();

    // 为集合创建一个摘要内容
    const summary = `${messages.length}条消息: ${
      messages[0]?.mainContent?.substring(0, 50) ||
      messages[0]?.content?.substring(0, 50) ||
      "..."
    }${messages.length > 1 ? "..." : ""}`;

    // 构建集合收藏消息对象
    const collectionMessage: StarredMessage = {
      id: uuidv4(), // 生成唯一ID
      role: "collection", // 使用特殊角色标识集合
      content: summary,
      mainContent: messages
        .map(
          (m) =>
            `## ${m.role === "user" ? "用户" : "AI助手"}\n\n${
              m.mainContent || m.content
            }`
        )
        .join("\n\n---\n\n"),
      starredAt: new Date(),
      title: collectionName,
      chatId: chatId, // 保存会话ID，便于导航
      libraryId: libraryId, // 直接使用原始的 libraryId
      isCollection: true, // 标记为集合
      collectionMessages: messages, // 保存原始消息
    };

    console.log("[收藏集合] 保存消息:", {
      id: collectionMessage.id,
      libraryId: collectionMessage.libraryId,
      originalLibraryId: libraryId,
    });

    await db.put("starredMessages", collectionMessage);
    return collectionMessage;
  },

  // MARK: 获取所有收藏消息
  async getAllStarredMessages(): Promise<StarredMessage[]> {
    const db = await getDB();
    return db.getAllFromIndex("starredMessages", "by-date");
  },

  // MARK: 根据 ID 获取收藏消息
  async getStarredMessage(id: string): Promise<StarredMessage | undefined> {
    const db = await getDB();
    return db.get("starredMessages", id);
  },

  // MARK: 删除收藏消息
  async removeStarredMessage(id: string): Promise<void> {
    const db = await getDB();
    await db.delete("starredMessages", id);
  },

  // MARK: 更新收藏消息标题
  async updateStarredMessageTitle(id: string, title: string): Promise<void> {
    const db = await getDB();
    const message = await db.get("starredMessages", id);

    if (message) {
      message.title = title;
      await db.put("starredMessages", message);
    }
  },

  // MARK: 搜索收藏消息
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
