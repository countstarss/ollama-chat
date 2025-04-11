import React, { useState, useEffect, useCallback, useRef } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  History,
  Database,
  ChevronRight,
  NotebookTabs,
  Plus,
  RefreshCw,
  Star
} from "lucide-react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { SidebarNavItem } from "./SidebarNavItem"
import { SidebarRecentItem } from "./SidebarRecentItem"
import { useChatSession } from "@/hooks/useChatSession"
import { useSearchParams } from "next/navigation"
import toastService from "@/services/toastService"
import eventService, { AppEvent } from "@/services/eventService"

export function SidebarNav() {
  const [openRecently, setOpenRecently] = useState(true)
  const [openNotes, setOpenNotes] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  const searchParams = useSearchParams()
  const currentChatId = searchParams.get('chatId')
  
  // MARK: 聊天会话hook
  const { 
    recentChats, 
    createNewChat, 
    switchToChat, 
    renameChat, 
    removeChat,
    refreshRecentChats
  } = useChatSession()

  // 修改仅在初始状态或聊天列表长度变化时自动展开，而不是持续强制展开
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const prevChatsLengthRef = useRef(recentChats.length);
  
  // 增加用户手动折叠的记忆并保存到本地存储
  const [userCollapsedRecently, setUserCollapsedRecently] = useState(() => {
    // 从本地存储读取用户的折叠偏好
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebar-recently-collapsed');
      return saved === 'true';
    }
    return false;
  });
  
  // 在组件挂载时读取本地存储的折叠状态
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebar-recently-collapsed');
      if (saved === 'true') {
        setOpenRecently(false);
      }
    }
  }, []);
  
  // 处理最近对话的折叠状态变化
  const handleRecentlyOpenChange = (isOpen: boolean) => {
    setOpenRecently(isOpen);
    // 记录用户的手动操作
    if (!isOpen) {
      setUserCollapsedRecently(true);
      // 保存到本地存储
      if (typeof window !== 'undefined') {
        localStorage.setItem('sidebar-recently-collapsed', 'true');
      }
    } else {
      setUserCollapsedRecently(false);
      // 保存到本地存储
      if (typeof window !== 'undefined') {
        localStorage.setItem('sidebar-recently-collapsed', 'false');
      }
    }
  };
  
  // 仅在初始加载或聊天数量增加时自动展开"最近对话"部分
  useEffect(() => {
    // 初始加载时
    if (!initialLoadComplete && recentChats.length > 0) {
      setOpenRecently(true);
      setInitialLoadComplete(true);
      return;
    }
    
    // 聊天数量增加时，但如果用户手动折叠过则保持折叠
    if (recentChats.length > prevChatsLengthRef.current && !userCollapsedRecently) {
      setOpenRecently(true);
    }
    
    // 更新引用值
    prevChatsLengthRef.current = recentChats.length;
  }, [recentChats.length, initialLoadComplete, userCollapsedRecently]);

  // 手动刷新聊天列表
  const handleRefreshChats = useCallback(async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    console.log('[SidebarNav] 手动刷新最近聊天列表');
    
    try {
      const success = await refreshRecentChats();
      if (success) {
        console.log('[SidebarNav] 刷新成功');
      } else {
        console.warn('[SidebarNav] 刷新失败');
        toastService.error('刷新最近聊天列表失败');
      }
    } catch (error) {
      console.error('[SidebarNav] 刷新出错:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshRecentChats, isRefreshing]);

  // 定期自动刷新聊天列表
  useEffect(() => {
    // 初始加载时刷新一次
    refreshRecentChats();
    
    // 设置定时器，每30秒刷新一次
    const intervalId = setInterval(() => {
      console.log('[SidebarNav] 自动刷新最近聊天列表');
      refreshRecentChats().catch(err => {
        console.error('[SidebarNav] 自动刷新出错:', err);
      });
    }, 60000);
    
    return () => {
      clearInterval(intervalId);
    };
  }, [refreshRecentChats]);

  // 监听聊天重命名事件
  useEffect(() => {
    const unsubscribe = eventService.subscribe((event: AppEvent) => {
      if (event.type === 'CHAT_RENAMED') {
        console.log(`[SidebarNav] 收到聊天重命名事件: ${event.chatId}, 新名称: ${event.newName}`);
        refreshRecentChats();
      } else if (event.type === 'CHAT_CREATED' || event.type === 'CHAT_DELETED') {
        console.log(`[SidebarNav] 收到聊天变更事件: ${event.type}, chatId: ${event.chatId}`);
        refreshRecentChats();
      }
    });
    
    // 清理函数
    return () => {
      unsubscribe();
    };
  }, [refreshRecentChats]);

  // MARK: ChatItemClick
  const handleChatItemClick = (chatId: string) => {
    switchToChat(chatId)
  }

  // MARK: NewChat
  const handleNewChat = () => {
    const newChatId = createNewChat();
    // 确保UI立即反映新聊天状态
    setTimeout(() => {
      // 强制导航到新创建的聊天，确保状态正确更新
      switchToChat(newChatId);
    }, 0);
  }

  return (
    <div className="flex-1 px-3 py-4 h-[50vh] overflow-y-auto scrollbar-hide">
      <Button 
        variant="default" 
        className="w-full flex items-center gap-2 sticky top-0 mb-4"
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
      <SidebarNavItem
          icon={<Star className="h-4 w-4" />}
          label="收藏"
          href="/star"
        />

      {/* 最近聊天 */}
      <Collapsible
        // MARK: RecentChats
        open={openRecently}
        onOpenChange={handleRecentlyOpenChange}
        className="mt-3"
      >
        <div className="flex items-center justify-between mb-1">
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="justify-between pl-2 font-normal flex-1"
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
          
          {/* 添加刷新按钮 */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={handleRefreshChats}
            disabled={isRefreshing}
            title="刷新最近聊天列表"
          >
            <RefreshCw className={cn(
              "h-4 w-4",
              isRefreshing && "animate-spin"
            )} />
          </Button>
        </div>
        
        <CollapsibleContent className="pl-2 space-y-1 max-h-[40vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent pr-1">
          {recentChats.length === 0 ? (
            <div className="text-sm text-muted-foreground px-2 py-1">
              没有最近的对话
            </div>
          ) : (
            recentChats.map((chat) => (
              <SidebarRecentItem
                key={`chat-${chat.id}-${chat.lastUpdated}`}
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
              <span>笔记</span>
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
            暂无笔记
          </div>
        </CollapsibleContent>
      </Collapsible>
      
      {/* 其他导航项 */}
      <div className="mt-4">
        {/* <SidebarNavItem
          icon={<BookOpen className="h-4 w-4" />}
          label="文档"
          href="/documentation"
        /> */}
      </div>
    </div>
  )
} 