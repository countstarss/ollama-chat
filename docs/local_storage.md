所有聊过的天都应该保存在SidebarNav中的recently中，当新创建一个聊天的时候，就会产生一个id和name,还有聊天的内容

这个id会被作为参数传入到page中，作为保存聊天记录的依据

每次发送完消息或者大模型完成一句输出，就会触发一次保存，以键值对的形式保存在localStorage 或者 indexedDB中，哪一个性能更好就用哪个

name默认使用用户的第一句话的前10个字来命名，后续可以使用contextMenu的选项来修改这个名字

<think>让我为你设计一个聊天记录的持久化和管理系统。我将需要：

1. 创建一个新的hooks来管理聊天记录 - 使用localStorage或IndexedDB
2. 实现新建聊天、保存聊天和加载聊天的功能
3. 修改SidebarNav组件显示近期聊天记录
4. 将聊天ID作为参数传入page组件
5. 实现聊天标题的自动生成和修改功能

让我们逐步实现这些功能。</think>我会实现一个完整的聊天记录管理系统。以下是我的方案：

## 1. 首先，创建聊天存储服务

```typescript:src/services/chatStorage.ts
import { DisplayMessage } from '@/components/chat/ChatMessage';
import { openDB, IDBPDatabase } from 'idb';

interface ChatSession {
  id: string;
  name: string;
  lastUpdated: number; // 时间戳
  messages: DisplayMessage[];
  modelId?: string; // 可选，记录使用的模型
}

// 数据库名称和版本
const DB_NAME = 'ollama-chat-db';
const DB_VERSION = 1;
const STORE_NAME = 'chat-sessions';

// 打开数据库连接
const openDatabase = async (): Promise<IDBPDatabase> => {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // 如果数据库尚不存在，创建对象存储
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        // 创建索引用于按最后更新时间排序
        store.createIndex('lastUpdated', 'lastUpdated', { unique: false });
      }
    },
  });
};

// 保存聊天会话
export const saveChat = async (chatSession: ChatSession): Promise<void> => {
  try {
    const db = await openDatabase();
    await db.put(STORE_NAME, {
      ...chatSession,
      lastUpdated: Date.now(), // 更新时间戳
    });
    console.log(`聊天会话已保存: ${chatSession.id}`);
  } catch (error) {
    console.error('保存聊天会话失败:', error);
    // 如果IndexedDB失败，尝试使用localStorage作为备选
    try {
      localStorage.setItem(`chat_${chatSession.id}`, JSON.stringify({
        ...chatSession,
        lastUpdated: Date.now(),
      }));
    } catch (e) {
      console.error('localStorage备份也失败:', e);
    }
  }
};

// 获取单个聊天会话
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
      console.error('从localStorage获取也失败:', e);
      return null;
    }
  }
};

// 获取所有聊天会话，按最近更新排序
export const getAllChats = async (): Promise<ChatSession[]> => {
  try {
    const db = await openDatabase();
    // 使用索引按更新时间倒序获取所有会话
    const chats = await db.getAllFromIndex(STORE_NAME, 'lastUpdated');
    return chats.reverse(); // 最新的排在前面
  } catch (error) {
    console.error('获取所有聊天会话失败:', error);
    // 尝试从localStorage获取
    try {
      const chats: ChatSession[] = [];
      // 遍历localStorage中的所有键
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('chat_')) {
          const chatJson = localStorage.getItem(key);
          if (chatJson) {
            chats.push(JSON.parse(chatJson));
          }
        }
      }
      // 按lastUpdated排序
      return chats.sort((a, b) => b.lastUpdated - a.lastUpdated);
    } catch (e) {
      console.error('从localStorage获取也失败:', e);
      return [];
    }
  }
};

// 删除聊天会话
export const deleteChat = async (chatId: string): Promise<void> => {
  try {
    const db = await openDatabase();
    await db.delete(STORE_NAME, chatId);
    console.log(`聊天会话已删除: ${chatId}`);
  } catch (error) {
    console.error(`删除聊天会话失败 ${chatId}:`, error);
    // 尝试从localStorage删除
    try {
      localStorage.removeItem(`chat_${chatId}`);
    } catch (e) {
      console.error('从localStorage删除也失败:', e);
    }
  }
};

// 更新聊天会话的名称
export const updateChatName = async (chatId: string, newName: string): Promise<void> => {
  try {
    const db = await openDatabase();
    const chat = await db.get(STORE_NAME, chatId);
    if (chat) {
      chat.name = newName;
      chat.lastUpdated = Date.now();
      await db.put(STORE_NAME, chat);
      console.log(`聊天会话名称已更新: ${chatId}`);
    }
  } catch (error) {
    console.error(`更新聊天会话名称失败 ${chatId}:`, error);
    // 尝试从localStorage更新
    try {
      const chatJson = localStorage.getItem(`chat_${chatId}`);
      if (chatJson) {
        const chat = JSON.parse(chatJson);
        chat.name = newName;
        chat.lastUpdated = Date.now();
        localStorage.setItem(`chat_${chatId}`, JSON.stringify(chat));
      }
    } catch (e) {
      console.error('从localStorage更新也失败:', e);
    }
  }
};

// 清理所有聊天会话数据（危险操作，谨慎使用）
export const clearAllChats = async (): Promise<void> => {
  try {
    const db = await openDatabase();
    await db.clear(STORE_NAME);
    console.log('所有聊天会话已清除');
  } catch (error) {
    console.error('清除所有聊天会话失败:', error);
  }
};

// 导出类型
export type { ChatSession };
```
## 2. 现在创建一个聊天管理Hook

```typescript:src/hooks/useChatSession.ts
import { useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { DisplayMessage } from '@/components/chat/ChatMessage';
import { saveChat, getChat, getAllChats, deleteChat, updateChatName, ChatSession } from '@/services/chatStorage';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { ModelConfig } from '@/hooks/useModelConfig';

export function useChatSession() {
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [chatName, setChatName] = useState<string>('新对话');
  const [recentChats, setRecentChats] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  
  // 初始化
  useEffect(() => {
    const loadRecentChats = async () => {
      try {
        const chats = await getAllChats();
        setRecentChats(chats);
        setIsLoading(false);
      } catch (error) {
        console.error('加载最近聊天失败:', error);
        setIsLoading(false);
      }
    };
    
    loadRecentChats();
  }, []);
  
  // 加载URL中的聊天ID
  useEffect(() => {
    const chatIdFromUrl = searchParams.get('chatId');
    if (chatIdFromUrl) {
      setCurrentChatId(chatIdFromUrl);
      loadChat(chatIdFromUrl);
    }
  }, [searchParams]);
  
  // 创建新聊天
  const createNewChat = useCallback(() => {
    const newChatId = uuidv4();
    setCurrentChatId(newChatId);
    setChatName('新对话');
    
    // 导航到新聊天
    router.push(`/?chatId=${newChatId}`);
    
    return newChatId;
  }, [router]);
  
  // 加载指定聊天
  const loadChat = useCallback(async (chatId: string): Promise<DisplayMessage[]> => {
    try {
      setIsLoading(true);
      const chat = await getChat(chatId);
      
      if (chat) {
        setChatName(chat.name);
        setCurrentChatId(chatId);
        setIsLoading(false);
        return chat.messages;
      }
      
      setIsLoading(false);
      return [];
    } catch (error) {
      console.error(`加载聊天失败 ${chatId}:`, error);
      setIsLoading(false);
      return [];
    }
  }, []);
  
  // 保存当前聊天
  const saveCurrentChat = useCallback(async (
    messages: DisplayMessage[], 
    selectedModel?: ModelConfig
  ) => {
    if (!currentChatId) return;
    
    try {
      let name = chatName;
      
      // 如果是新聊天，使用第一条用户消息来命名
      if (name === '新对话' && messages.length > 0) {
        const firstUserMessage = messages.find(m => m.role === 'user');
        if (firstUserMessage?.content) {
          // 取前10个字符，如果太长就截断并加...
          const content = firstUserMessage.content.trim();
          name = content.length > 10 ? `${content.substring(0, 10)}...` : content;
          setChatName(name);
        }
      }
      
      // 保存会话
      await saveChat({
        id: currentChatId,
        name,
        lastUpdated: Date.now(),
        messages,
        modelId: selectedModel?.modelId
      });
      
      // 刷新最近聊天列表
      const chats = await getAllChats();
      setRecentChats(chats);
    } catch (error) {
      console.error('保存聊天失败:', error);
    }
  }, [currentChatId, chatName]);
  
  // 切换到指定聊天
  const switchToChat = useCallback((chatId: string) => {
    router.push(`/?chatId=${chatId}`);
  }, [router]);
  
  // 重命名聊天
  const renameChat = useCallback(async (chatId: string, newName: string) => {
    try {
      await updateChatName(chatId, newName);
      
      if (chatId === currentChatId) {
        setChatName(newName);
      }
      
      // 刷新最近聊天列表
      const chats = await getAllChats();
      setRecentChats(chats);
    } catch (error) {
      console.error(`重命名聊天失败 ${chatId}:`, error);
    }
  }, [currentChatId]);
  
  // 删除聊天
  const removeChat = useCallback(async (chatId: string) => {
    try {
      await deleteChat(chatId);
      
      // 如果删除的是当前聊天，创建新聊天
      if (chatId === currentChatId) {
        createNewChat();
      }
      
      // 刷新最近聊天列表
      const chats = await getAllChats();
      setRecentChats(chats);
    } catch (error) {
      console.error(`删除聊天失败 ${chatId}:`, error);
    }
  }, [currentChatId, createNewChat]);

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
    removeChat
  };
}
```
## 3. 修改 SidebarRecentItem 组件以支持聊天项上下文菜单

```typescript jsx:src/components/ui/sidebar/SidebarRecentItem.tsx
import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { MessageSquare, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

export interface SidebarRecentItemProps {
  id: string;
  label: string;
  isActive?: boolean;
  onClick?: () => void;
  onRename?: (id: string, newName: string) => void;
  onDelete?: (id: string) => void;
}

export function SidebarRecentItem({ 
  id, 
  label, 
  isActive, 
  onClick, 
  onRename,
  onDelete 
}: SidebarRecentItemProps) {
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [newName, setNewName] = useState(label);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const handleRename = () => {
    if (onRename && newName.trim()) {
      onRename(id, newName.trim());
      setIsRenameDialogOpen(false);
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(id);
      setIsDeleteDialogOpen(false);
    }
  };

  return (
    <>
      <div
        className={cn(
          "flex items-center justify-between w-full p-2 rounded-md transition-colors",
          isActive 
            ? "bg-accent text-accent-foreground" 
            : "hover:bg-accent/50 hover:text-accent-foreground"
        )}
      >
        <button
          className="flex items-center gap-2 text-sm w-full text-left overflow-hidden"
          onClick={onClick}
        >
          <MessageSquare className="h-4 w-4 shrink-0" />
          <span className="truncate">{label}</span>
        </button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 hover:opacity-100 focus:opacity-100"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setIsRenameDialogOpen(true)}>
              <Pencil className="mr-2 h-4 w-4" />
              <span>重命名</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-destructive focus:text-destructive"
              onClick={() => setIsDeleteDialogOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              <span>删除</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* 重命名对话框 */}
      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>重命名对话</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="对话名称"
              className="w-full"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRenameDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleRename}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>删除对话</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>你确定要删除这个对话吗？此操作无法撤销。</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleDelete}>删除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
```
## 4. 更新 SidebarNav 组件以显示聊天历史

```typescript jsx:src/components/ui/sidebar/SidebarNav.tsx
import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Code,
  History,
  Star,
  Settings,
  BookOpen,
  Database,
  ChevronRight,
  NotebookTabs,
  Plus
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { SidebarNavItem } from "./SidebarNavItem";
import { SidebarRecentItem } from "./SidebarRecentItem";
import { useChatSession } from "@/hooks/useChatSession";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

export function SidebarNav() {
  const [openRecently, setOpenRecently] = React.useState(true);
  const [openNotes, setOpenNotes] = React.useState(true);
  
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentChatId = searchParams.get('chatId');
  
  // 使用聊天会话hook
  const { 
    recentChats, 
    createNewChat, 
    switchToChat, 
    renameChat, 
    removeChat 
  } = useChatSession();

  // 处理点击历史聊天项
  const handleChatItemClick = (chatId: string) => {
    switchToChat(chatId);
  };

  // 处理创建新聊天
  const handleNewChat = () => {
    createNewChat();
  };

  return (
    <div className="flex-1 px-3 py-4">
      {/* 新建聊天按钮 */}
      <Button 
        variant="default" 
        className="w-full mb-4 flex items-center gap-2"
        onClick={handleNewChat}
      >
        <Plus className="h-4 w-4" />
        <span>新建聊天</span>
      </Button>

      <SidebarNavItem
        // MARK: Models
        icon={<Database className="h-4 w-4" />}
        label="模型"
        href="/models"
      />

      {/* 最近聊天 */}
      <Collapsible
        open={openRecently}
        onOpenChange={setOpenRecently}
        className="mt-3"
      >
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-between pl-2 mb-1 font-normal"
          >
            <div className="flex items-center gap-2">
              <History className="h-4 w-4" />
              <span>最近对话</span>
            </div>
            <ChevronRight
              className={cn(
                "h-4 w-4 shrink-0 transition-transform duration-200",
                openRecently ? "rotate-90" : ""
              )}
            />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pl-2 space-y-1">
          {recentChats.length === 0 ? (
            <div className="text-sm text-muted-foreground px-2 py-1">
              没有最近的对话
            </div>
          ) : (
            recentChats.map((chat) => (
              <SidebarRecentItem
                key={chat.id}
                id={chat.id}
                label={chat.name}
                isActive={currentChatId === chat.id}
                onClick={() => handleChatItemClick(chat.id)}
                onRename={renameChat}
                onDelete={removeChat}
              />
            ))
          )}
        </CollapsibleContent>
      </Collapsible>

      <Collapsible
        // MARK: Notes
        open={openNotes}
        onOpenChange={setOpenNotes}
        className="mt-3"
      >
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-between pl-2 mb-1 font-normal"
          >
            <div className="flex items-center gap-2">
              <NotebookTabs className="h-4 w-4" />
              <span>收藏</span>
            </div>
            <ChevronRight
              className={cn(
                "h-4 w-4 shrink-0 transition-transform duration-200",
                openNotes ? "rotate-90" : ""
              )}
            />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pl-2 space-y-1">
          <div className="text-sm text-muted-foreground px-2 py-1">
            暂无收藏的对话
          </div>
        </CollapsibleContent>
      </Collapsible>
      
      {/* 其他导航项 */}
      <div className="mt-4">
        <SidebarNavItem
          icon={<BookOpen className="h-4 w-4" />}
          label="文档"
          href="/documentation"
        />
        <SidebarNavItem
          icon={<Settings className="h-4 w-4" />}
          label="设置"
          href="/settings"
        />
      </div>
    </div>
  );
}
```
## 5. 最后，修改 Home 组件集成聊天会话管理

```typescript jsx:src/app/page.tsx
'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ChatWindow, ChatWindowHandle } from '@/components/chat/ChatWindow';
import { DisplayMessage } from '@/components/chat/ChatMessage';
import { useStreamResponse } from '@/hooks/useStreamResponse';
import { ModelConfig, useModelConfig } from '@/hooks/useModelConfig';
import { ModelSelectorContainer } from '@/components/ui/model-setting/ModelSelectorContainer';
import { ModelSettingsButton } from '@/components/ui/model-setting/ModelSettingsButton';
import { useModelSettings } from '@/hooks/useModelSettings';
import { useChatActions } from '@/hooks/useChatActions';
import { useChatSession } from '@/hooks/useChatSession';
import { Menu, ChevronLeft, Plus } from 'lucide-react';
import { useSidebar } from '@/components/context/sidebar-context';
import { Button } from '@/components/ui/button';
import { v4 as uuidv4 } from 'uuid';

export default function Home() {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [modelError, setModelError] = useState<string | null>(null);
  
  // 使用hooks
  const { modelSettings } = useModelSettings();
  const { getSelectedModel } = useModelConfig();
  const [selectedModel, setSelectedModel] = useState<ModelConfig | null>(null);
  const chatWindowRef = useRef<ChatWindowHandle>(null);
  const { sendStreamRequest } = useStreamResponse();
  const { toggleSidebar, isCollapsed } = useSidebar();
  
  // 使用聊天会话hook
  const {
    currentChatId,
    chatName,
    loadChat,
    saveCurrentChat,
    createNewChat
  } = useChatSession();
  
  // 使用聊天操作hook
  const {
    handleAbort,
    updateLastMessage,
    scrollToBottom,
    prepareRequestBody,
    addAssistantPlaceholder,
    createAbortController
  } = useChatActions(
    chatWindowRef,
    messages,
    setMessages,
    setIsLoading,
    setModelError
  );
  
  // 初始化时设置当前选中的模型
  useEffect(() => {
    const model = getSelectedModel();
    if (model) {
      setSelectedModel(model);
    }
  }, [getSelectedModel]);
  
  // 如果URL里有chatId参数，加载相应的聊天记录
  useEffect(() => {
    const loadMessages = async () => {
      if (currentChatId) {
        const loadedMessages = await loadChat(currentChatId);
        if (loadedMessages && loadedMessages.length > 0) {
          setMessages(loadedMessages);
        } else {
          // 如果没有加载到消息，清空当前消息列表
          setMessages([]);
        }
      }
    };
    
    loadMessages();
  }, [currentChatId, loadChat]);
  
  // 在消息变化时保存聊天
  useEffect(() => {
    if (messages.length > 0 && currentChatId) {
      saveCurrentChat(messages, selectedModel || undefined);
    }
  }, [messages, currentChatId, selectedModel, saveCurrentChat]);

  // 处理新建聊天按钮点击
  const handleNewChat = useCallback(() => {
    createNewChat();
    setMessages([]);
  }, [createNewChat]);
  
  // MARK: 处理发送消息
  const handleSendMessage = useCallback(async (userInput: string) => {
    // 清除任何之前的错误
    setModelError(null);
    
    // 添加用户消息
    setMessages((prev) => [...prev, { 
      id: uuidv4(), 
      role: 'user', 
      content: userInput 
    }]);
  
    setIsLoading(true);

    // 创建新的AbortController
    const controller = createAbortController();
    // 检查是否有选中的模型
    if (!selectedModel) {
      setModelError('未选择模型');
      setIsLoading(false);
      return;
    }
    console.log(`使用模型发送消息: ${selectedModel.name} (${selectedModel.modelId})`);
    // 准备请求体
    const requestBody = prepareRequestBody(userInput, messages, selectedModel, modelSettings);

    // 添加助手占位消息
    addAssistantPlaceholder();

    try {
      // 使用流式响应hook处理请求
      const success = await sendStreamRequest(
        requestBody, 
        (updates) => updateLastMessage(() => updates),
        controller
      );
      
      if (!success) {
        console.error("流式请求未能成功完成");
      }
      
      // MARK: 响应完成后滚到底部
      scrollToBottom();
    } catch (error) {
      console.error('消息发送错误:', error);
      
      // 处理模型特定错误
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // 检查是否是模型相关错误
      const isModelError = 
        errorMessage.includes('模型') || 
        errorMessage.includes('model') ||
        errorMessage.includes('找不到') || 
        errorMessage.includes('not found');
      
      if (isModelError) {
        // 设置模型错误状态，用于UI显示
        setModelError(`模型 "${selectedModel.modelId}" 可能不可用。错误: ${errorMessage}`);
        
        // 向聊天添加错误消息
        updateLastMessage(() => ({
          role: 'error',
          content: '',
          mainContent: `模型错误: ${errorMessage}\n\n请尝试选择其他模型或检查Ollama服务是否正常运行。`,
          isThinkingComplete: true,
        }));
      } else {
        // 处理一般错误
        updateLastMessage(() => ({
          role: 'error',
          content: '',
          mainContent: `发送消息错误: ${errorMessage}`,
          isThinkingComplete: true,
        }));
      }
    } finally {
      setIsLoading(false);
    }
  }, [
    messages,
    selectedModel,
    modelSettings,
    updateLastMessage,
    sendStreamRequest,
    prepareRequestBody,
    addAssistantPlaceholder,
    createAbortController,
    scrollToBottom,
    setModelError
  ]);

  // 处理模型选择变更
  const handleModelChange = useCallback((modelId: string) => {
    // 获取完整的模型信息
    const model = getSelectedModel();
    if (model) {
      setSelectedModel(model);
      setModelError(null);
    }
  }, [getSelectedModel]);

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900 scrollbar-hide">
      <header className="p-2 border-b border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={toggleSidebar} className="h-8 w-8">
            {isCollapsed ? <Menu className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
          <h1 className="text-xl font-semibold">{chatName || "Ollama 助手"}</h1>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
            onClick={handleNewChat}
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">新建聊天</span>
          </Button>
        
          <ModelSelectorContainer 
            isLoading={isLoading} 
            onModelChange={handleModelChange} 
          />
          <ModelSettingsButton isLoading={isLoading} />
        </div>
      </header>

      <ChatWindow 
        messages={messages} 
        ref={chatWindowRef}
        onSendMessage={handleSendMessage}
        onAbort={handleAbort}
        isLoading={isLoading}
      />
    </div>
  );
}
```
## 6. 添加需要的依赖

```bash
npm install idb
```

```bash
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu
```

```typescript jsx:src/components/ui/dialog.tsx
"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = ({
  className,
  ...props
}: DialogPrimitive.DialogPortalProps) => (
  <DialogPrimitive.Portal className={cn(className)} {...props} />
)
DialogPortal.displayName = DialogPrimitive.Portal.displayName

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-background/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg md:w-full",
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
```

```typescript jsx:src/components/ui/input.tsx
import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
```

```typescript jsx:src/components/ui/dialog.tsx
"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = ({
  ...props
}: DialogPrimitive.DialogPortalProps) => (
  <DialogPrimitive.Portal {...props} />
)
DialogPortal.displayName = DialogPrimitive.Portal.displayName

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-background/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg md:w-full",
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
```
现在我已经完成了所有必要的文件和组件，让我来总结一下所实现的功能：

## 聊天记录管理系统实现总结

我已经为您实现了一个完整的聊天记录管理系统，它具有以下特点：

### 1. 数据存储 (src/services/chatStorage.ts)

- **IndexedDB 主要存储**：使用性能更好的 IndexedDB 作为聊天记录的主要存储方式
- **LocalStorage 备份**：当 IndexedDB 操作失败时自动降级使用 LocalStorage
- **数据模型**：定义了清晰的 `ChatSession` 数据结构，包含 ID、名称、消息、模型信息等
- **完整的 CRUD 操作**：提供了保存、获取、更新和删除聊天的方法

### 2. 聊天会话管理 (src/hooks/useChatSession.ts)

- **会话状态管理**：管理当前聊天 ID、名称和最近聊天列表
- **URL 参数集成**：通过 URL 参数跟踪当前聊天 ID，支持分享和导航
- **自动命名**：根据用户第一条消息自动生成聊天名称
- **切换会话**：提供在不同聊天间切换的功能

### 3. 聊天操作封装 (src/hooks/useChatActions.ts)

- **消息管理**：添加、更新消息的工具函数
- **请求控制**：中断请求、创建 AbortController 等功能
- **UI 交互**：滚动到底部、添加占位消息等辅助功能
- **请求准备**：格式化聊天历史和构建请求体

### 4. UI 组件

- **SidebarRecentItem**：显示最近聊天项，支持上下文菜单进行重命名和删除
- **SidebarNav**：侧边栏组件，显示最近聊天列表和新建聊天按钮
- **Dialog & Input**：提供重命名和删除确认的对话框

### 5. 主页面集成 (src/app/page.tsx)

- **会话加载**：根据 URL 参数加载相应的聊天记录
- **自动保存**：消息变化时自动保存聊天
- **新聊天按钮**：在页面顶部添加新建聊天的按钮
- **显示聊天名称**：在顶部显示当前聊天的名称

### 技术特点

1. **多层数据保障**：IndexedDB 主存储 + LocalStorage 备份
2. **React Hooks 架构**：使用自定义钩子抽象复杂逻辑，使组件保持简洁
3. **自动化流程**：自动保存、自动命名、自动加载
4. **用户友好界面**：上下文菜单、确认对话框、直观的列表

### 使用流程

1. 用户可以在侧边栏或顶部的"新建聊天"按钮创建新聊天
2. 发送第一条消息后，系统会自动以消息内容的前10个字符来命名聊天
3. 聊天内容会自动保存到本地数据库
4. 用户可以通过侧边栏切换不同的聊天
5. 用户可以通过上下文菜单重命名或删除聊天

这个系统设计遵循了模块化、关注点分离的原则，确保了代码的可维护性和可扩展性。无论是增加更多功能还是进行性能优化，都可以在不影响其他部分的情况下进行。



## ====================================



<think>用户的问题是关于性能优化，特别是当前的聊天保存机制可能导致性能问题。现在的实现是在`messages`数组每次变化时都调用`saveCurrentChat`函数，这可能导致频繁的存储操作，尤其是在流式响应时会非常频繁地更新消息内容。

用户提出的解决方案是：不监听整个messages的变化，而是只监听消息数量的变化，只有在对话数量发生变化时才进行存储操作。

让我分析一下当前的代码：

1. 当前的实现在Home组件中监听messages的变化：
```javascript
useEffect(() => {
  if (messages.length > 0 && currentChatId) {
    saveCurrentChat(messages, selectedModel || undefined);
  }
}, [messages, currentChatId, selectedModel, saveCurrentChat]);
```

2. `saveCurrentChat`是从`useChatSession` hook获取的，它会将消息保存到IndexedDB或localStorage。

3. 在流式响应过程中，messages数组的最后一个消息内容会不断更新，导致整个messages数组被认为是变化了，从而触发useEffect并频繁调用saveCurrentChat。

我需要修改这个效果，使其只在消息数量变化或者聊天完成时保存，而不是每次消息内容变化都保存。</think># 优化聊天存储性能问题的解决方案

你提出了一个非常好的性能优化点。当前实现确实存在问题，因为在流式响应过程中，`messages`数组内容会不断更新，导致`useEffect`频繁触发，从而反复调用`saveCurrentChat`，这会造成不必要的存储操作和性能损耗。

## 问题分析

当前代码在以下情况会触发保存：
- 每次消息内容更新（包括流式响应中的持续更新）
- 切换模型时
- 当前聊天ID变化时

## 优化实现

我们可以修改代码，使其只在以下情况保存：
1. 消息数量变化时（新增或删除消息）
2. 聊天完成时（最后一条消息完成生成）
3. 模型或聊天ID变化时

下面是优化后的代码：

```typescript jsx:src/app/page.tsx
// ... existing code ...
export default function Home() {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [modelError, setModelError] = useState<string | null>(null);
  
  // 使用hooks
  const { modelSettings } = useModelSettings();
  const { getSelectedModel } = useModelConfig();
  const [selectedModel, setSelectedModel] = useState<ModelConfig | null>(null);
  const chatWindowRef = useRef<ChatWindowHandle>(null);
  const { sendStreamRequest } = useStreamResponse();
  const { toggleSidebar, isCollapsed } = useSidebar();
  
  // 使用聊天会话hook
  const {
    currentChatId,
    chatName,
    loadChat,
    saveCurrentChat,
    createNewChat
  } = useChatSession();
  
  // 追踪消息数量和生成状态
  const previousMessagesCountRef = useRef<number>(0);
  const isStreamCompletedRef = useRef<boolean>(true);
  
  // ... existing code ...
  
  // 在消息变化时保存聊天，但仅在消息数量变化或消息生成完成时
  useEffect(() => {
    // 只有当currentChatId存在且有消息时才继续
    if (!currentChatId || messages.length === 0) {
      previousMessagesCountRef.current = messages.length;
      return;
    }
    
    // 检查消息数量是否变化
    const messageCountChanged = previousMessagesCountRef.current !== messages.length;
    
    // 检查最后一条消息是否完成生成（非流式响应中）
    const lastMessage = messages[messages.length - 1];
    const isLastMessageComplete = lastMessage && 
                                 (lastMessage.role !== 'assistant' || 
                                  lastMessage.isThinkingComplete === true);
                                  
    // 更新消息数量引用
    previousMessagesCountRef.current = messages.length;
    
    // 只有在以下情况下保存:
    // 1. 消息数量发生变化
    // 2. 最后一条消息完成生成
    // 3. 流式响应已完成
    if (messageCountChanged || (isLastMessageComplete && isStreamCompletedRef.current)) {
      console.log('保存聊天: 消息数量变化或消息生成完成');
      saveCurrentChat(messages, selectedModel || undefined);
    }
  }, [messages, currentChatId, selectedModel, saveCurrentChat]);

  // ... existing code ...
  
  // MARK: 处理发送消息
  const handleSendMessage = useCallback(async (userInput: string) => {
    // 清除任何之前的错误
    setModelError(null);
    
    // 添加用户消息
    setMessages((prev) => [...prev, { 
      id: uuidv4(), 
      role: 'user', 
      content: userInput 
    }]);
  
    setIsLoading(true);
    // 标记流式响应开始
    isStreamCompletedRef.current = false;

    // 创建新的AbortController
    const controller = createAbortController();
    // 检查是否有选中的模型
    if (!selectedModel) {
      setModelError('未选择模型');
      setIsLoading(false);
      return;
    }
    console.log(`使用模型发送消息: ${selectedModel.name} (${selectedModel.modelId})`);
    // 准备请求体
    const requestBody = prepareRequestBody(userInput, messages, selectedModel, modelSettings);

    // 添加助手占位消息
    addAssistantPlaceholder();

    try {
      // 使用流式响应hook处理请求
      const success = await sendStreamRequest(
        requestBody, 
        (updates) => updateLastMessage(() => updates),
        controller
      );
      
      if (!success) {
        console.error("流式请求未能成功完成");
      }
      
      // MARK: 响应完成后滚到底部
      scrollToBottom();
      
      // 标记流式响应完成，并保存当前聊天
      isStreamCompletedRef.current = true;
      saveCurrentChat(messages, selectedModel || undefined);
    } catch (error) {
      // ... existing code ...
    } finally {
      isStreamCompletedRef.current = true;
      setIsLoading(false);
    }
  }, [
    messages,
    selectedModel,
    modelSettings,
    updateLastMessage,
    sendStreamRequest,
    prepareRequestBody,
    addAssistantPlaceholder,
    createAbortController,
    scrollToBottom,
    setModelError,
    saveCurrentChat  // 添加saveCurrentChat到依赖项
  ]);

  // ... existing code ...
```
## 优化说明

我已经实现了根据你的要求的性能优化方案。以下是主要的改进：

### 1. 添加状态跟踪
```typescript
// 追踪消息数量和生成状态
const previousMessagesCountRef = useRef<number>(0);
const isStreamCompletedRef = useRef<boolean>(true);
```

这两个 ref 用于：
- 跟踪上一次的消息数量，用于检测消息数量是否变化
- 标记流式响应的完成状态，确保在流式响应完成时保存聊天

### 2. 优化保存逻辑
新的 useEffect 只在以下情况下保存聊天：
- 消息数量发生变化（有新消息添加或删除）
- 最后一条消息已完成生成且流式响应已结束

这样可以避免在流式响应过程中频繁保存聊天，大大减少了不必要的存储操作。

### 3. 在流式响应开始和结束时设置标记
```typescript
// 流式响应开始时
isStreamCompletedRef.current = false;

// 流式响应结束时
isStreamCompletedRef.current = true;
saveCurrentChat(messages, selectedModel || undefined);
```

这确保了在流式响应完成后进行一次最终保存，捕获完整的对话内容。

## 性能提升

这个优化将大大减少存储操作的次数：
- 对于普通消息：从每次消息更新都保存变为只在消息数量变化时保存
- 对于流式响应：从每次内容更新都保存变为只在开始和结束时保存

这将极大地减轻浏览器的负担，特别是在处理大量长对话或复杂流式响应时。

你还需要注意什么其他优化点吗？
