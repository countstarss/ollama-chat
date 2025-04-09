import React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  History,
  Settings,
  BookOpen,
  Database,
  ChevronRight,
  NotebookTabs,
  Plus,
  StarIcon
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

export function SidebarNav() {
  const [openRecently, setOpenRecently] = React.useState(true)
  const [openCollect, setOpenCollect] = React.useState(true)
  const [openNotes, setOpenNotes] = React.useState(true)
  
  const searchParams = useSearchParams()
  const currentChatId = searchParams.get('chatId')
  
  // MARK: 聊天会话hook
  const { 
    recentChats, 
    createNewChat, 
    switchToChat, 
    renameChat, 
    removeChat 
  } = useChatSession()

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
    <div className="flex-1 px-3 py-4">
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
        // MARK: RecentChats
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
        // MARK: collect
        open={openCollect}
        onOpenChange={setOpenCollect}
        className="mt-3"
      >
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-between pl-2 mb-1 font-normal"
          >
            <div className="flex items-center gap-2">
              <StarIcon className="h-4 w-4" />
              <span>收藏</span>
            </div>
            <ChevronRight
              className={cn(
                "h-4 w-4 shrink-0 transition-transform duration-200",
                openCollect ? "rotate-90" : ""
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
            暂无收藏的对话
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