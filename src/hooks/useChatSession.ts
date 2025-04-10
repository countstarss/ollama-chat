import { useState, useCallback, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { DisplayMessage } from "@/components/chat/ChatMessage";
import {
  saveChat,
  getChat,
  getAllChats,
  deleteChat,
  updateChatName,
  ChatSession,
} from "@/services/chatStorage";
import { useRouter, useSearchParams } from "next/navigation";
import { ModelConfig } from "@/hooks/useModelConfig";
import toastService from "@/services/toastService";
import eventService from "@/services/eventService";

export function useChatSession() {
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [chatName, setChatName] = useState<string>("未命名");
  const [recentChats, setRecentChats] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasNamedCurrentChat, setHasNamedCurrentChat] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();

  // MARK: Init
  // NOTE: 初始化
  useEffect(() => {
    const loadRecentChats = async () => {
      try {
        const chats = await getAllChats();
        setRecentChats(chats);
        setIsLoading(false);
      } catch (error) {
        console.error("加载最近聊天失败:", error);
        setIsLoading(false);
        toastService.error("加载聊天历史失败");
      }
    };

    loadRecentChats();
  }, []);

  // MARK: loadChatId
  // NOTE: 加载URL中的聊天ID
  useEffect(() => {
    const chatIdFromUrl = searchParams.get("chatId");
    if (chatIdFromUrl) {
      setCurrentChatId(chatIdFromUrl);
      loadChat(chatIdFromUrl);
    }
  }, [searchParams]);

  // MARK: NewChat
  // NOTE: 创建新聊天
  const createNewChat = useCallback(() => {
    const newChatId = uuidv4();
    setCurrentChatId(newChatId);
    setChatName("未命名");
    setHasNamedCurrentChat(false);

    // 创建新的空聊天会话并立即保存
    const newChat: ChatSession = {
      id: newChatId,
      name: "未命名",
      lastUpdated: Date.now(),
      messages: [],
    };

    // 保存到数据库
    saveChat(newChat)
      .then(() => {
        // 更新最近聊天列表
        getAllChats().then((chats) => {
          setRecentChats(chats);
        });
      })
      .catch((error) => {
        console.error("创建新聊天失败:", error);
        toastService.error("创建新聊天失败");
      });

    // 导航到新聊天
    router.push(`/?chatId=${newChatId}`);

    return newChatId;
  }, [router]);

  // MARK: loadChat
  // NOTE: 加载指定聊天
  const loadChat = useCallback(
    async (chatId: string): Promise<DisplayMessage[]> => {
      try {
        setIsLoading(true);
        const chat = await getChat(chatId);

        if (chat) {
          setChatName(chat.name);
          setCurrentChatId(chatId);
          setHasNamedCurrentChat(chat.name !== "未命名");
          setIsLoading(false);
          return chat.messages;
        }

        setIsLoading(false);
        return [];
      } catch (error) {
        console.error(`加载聊天失败 ${chatId}:`, error);
        setIsLoading(false);
        toastService.error(`加载聊天记录失败`);
        return [];
      }
    },
    []
  );

  // MARK: saveChat
  const saveCurrentChat = useCallback(
    async (messages: DisplayMessage[], selectedModel?: ModelConfig) => {
      if (!currentChatId) return;

      try {
        let name = chatName;
        let shouldUpdateName = false;

        if (!hasNamedCurrentChat && messages.length > 0) {
          const firstUserMessage = messages.find((m) => m.role === "user");
          if (firstUserMessage?.content) {
            const content = firstUserMessage.content.trim();
            name =
              content.length > 10 ? `${content.substring(0, 10)}...` : content;
            setChatName(name);
            setHasNamedCurrentChat(true);
            shouldUpdateName = true;
          }
        }

        await saveChat({
          id: currentChatId,
          name,
          lastUpdated: Date.now(),
          messages,
          modelId: selectedModel?.modelId,
        });

        if (shouldUpdateName) {
          const chats = await getAllChats();
          setRecentChats(chats);
        }
      } catch (error) {
        console.error("保存聊天失败:", error);
        toastService.error("保存聊天失败，可能会丢失当前对话");
      }
    },
    [currentChatId, chatName, hasNamedCurrentChat]
  );

  // MARK: switchToChat
  // NOTE: 切换到指定聊天
  const switchToChat = useCallback(
    (chatId: string) => {
      router.push(`/?chatId=${chatId}`);
    },
    [router]
  );

  // MARK: renameChat
  // NOTE: 重命名聊天
  const renameChat = useCallback(
    async (chatId: string, newName: string): Promise<void> => {
      console.log(
        `[useChatSession] 开始重命名聊天: ${chatId}, 新名称: ${newName}`
      );
      try {
        await updateChatName(chatId, newName);
        console.log(`[useChatSession] 更新聊天名称成功: ${chatId}`);

        if (chatId === currentChatId) {
          console.log(`[useChatSession] 更新当前聊天标题: ${newName}`);
          setChatName(newName);
          setHasNamedCurrentChat(true);
        }

        // 重新加载所有聊天以更新侧边栏
        console.log("[useChatSession] 重新加载聊天列表");
        const chats = await getAllChats();
        setRecentChats(chats);
        console.log("[useChatSession] 已更新最近聊天列表");

        // 发布聊天重命名事件
        eventService.publish({
          type: "CHAT_RENAMED",
          chatId,
          newName,
        });

        toastService.success("对话已重命名");
      } catch (error) {
        console.error(`[useChatSession] 重命名聊天失败 ${chatId}:`, error);
        toastService.error("重命名对话失败");
        throw error; // 重新抛出错误以便调用者捕获
      }
    },
    [currentChatId]
  );

  // MARK: removeChat
  // NOTE: 删除聊天
  const removeChat = useCallback(
    async (chatId: string) => {
      try {
        await deleteChat(chatId);

        if (chatId === currentChatId) {
          createNewChat();
        }

        const chats = await getAllChats();
        setRecentChats(chats);
        toastService.success("对话已删除");
      } catch (error) {
        console.error(`删除聊天失败 ${chatId}:`, error);
        toastService.error("删除对话失败");
      }
    },
    [currentChatId, createNewChat]
  );

  // MARK: refreshRecentChats
  // NOTE: 手动刷新最近聊天列表
  const refreshRecentChats = useCallback(async () => {
    console.log("[useChatSession] 手动刷新最近聊天列表");
    try {
      const chats = await getAllChats();
      setRecentChats(chats);
      console.log(
        `[useChatSession] 已刷新最近聊天列表，共 ${chats.length} 个聊天`
      );
      return true;
    } catch (error) {
      console.error("[useChatSession] 刷新最近聊天列表失败:", error);
      return false;
    }
  }, []);

  return {
    currentChatId,
    chatName,
    recentChats,
    isLoading,
    createNewChat,
    loadChat,
    saveCurrentChat,
    switchToChat,
    renameChat,
    removeChat,
    refreshRecentChats,
  };
}
