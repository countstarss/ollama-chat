"use client";

import React, { useState, useCallback, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { useStarStore } from "@/store/useStarStore";
import { StarredMessage } from "@/services/starStorageService";
import toastService from "@/services/toastService";

// 组件导入
import { SearchFilter } from "./SearchFilter";
import { StarredMessageDialog } from "./StarredMessageDialog";
import { ArrowLeft, Star, MessageSquare, BookOpen } from "lucide-react";
import { StarredMessageCard } from "@/components/ui/star/StarredMessageCard";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { SkeletonCard } from "@/components/ui/skeleton/SkeletonCard";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

// 骨架屏组件，用于加载状态
const SkeletonGrid = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto max-h-[calc(100vh-200px)] pb-24">
      {[...Array(6)].map((_, index) => (
        <SkeletonCard key={index} />
      ))}
    </div>
  );
};

export function StarredMessages() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentMessage, setCurrentMessage] = useState<StarredMessage | null>(
    null
  );
  const [isFiltered, setIsFiltered] = useState(false);
  // 添加一个滞后计数器，用于延迟显示加载状态，避免闪烁
  const [loadingDelay, setLoadingDelay] = useState(0);
  const [activeTab, setActiveTab] = useState<"chat" | "rag">("chat");
  const router = useRouter();

  // 使用Zustand store
  const {
    starredMessages,
    isLoading,
    removeStar,
    searchStarredMessages,
    refreshStarredMessages,
    init,
  } = useStarStore();

  // 计算各类型消息数量
  const chatCount = useMemo(() => {
    return starredMessages.filter((message) => !message.libraryId).length;
  }, [starredMessages]);

  const ragCount = useMemo(() => {
    return starredMessages.filter((message) => !!message.libraryId).length;
  }, [starredMessages]);

  // 根据当前tab过滤消息
  const filteredMessages = useMemo(() => {
    return starredMessages.filter((message) => {
      if (activeTab === "rag") {
        // RAG消息: 有libraryId的消息
        return !!message.libraryId;
      } else {
        // Chat消息: 没有libraryId的消息
        return !message.libraryId;
      }
    });
  }, [starredMessages, activeTab]);

  // 获取搜索结果中符合当前tab的消息
  const { searchResults, searchQuery } = useStarStore();
  const displayMessages = useMemo(() => {
    // 如果有搜索查询，使用搜索结果
    const baseMessages = searchQuery ? searchResults : filteredMessages;
    
    // 再次根据tab过滤
    return baseMessages.filter((message) => {
      if (activeTab === "rag") {
        return !!message.libraryId;
      } else {
        return !message.libraryId;
      }
    });
  }, [searchQuery, searchResults, filteredMessages, activeTab]);

  // 初始化时确保数据已加载
  useEffect(() => {
    // 执行初始化，这将使用缓存数据（如果有）
    init();

    // 如果正在加载，设置一个延迟计时器
    if (isLoading) {
      const timer = setTimeout(() => {
        setLoadingDelay((prev) => prev + 1);
      }, 300); // 300ms延迟，避免短暂加载闪烁

      return () => clearTimeout(timer);
    } else {
      // 重置延迟计数器
      setLoadingDelay(0);
    }
  }, [init, isLoading]);

  // MARK: 处理搜索
  const handleSearch = useCallback(
    async (query: string, dateRange: { from?: Date; to?: Date }) => {
      try {
        // 使用新的搜索方法，暂时只支持文本搜索，日期范围需要在前端过滤
        await searchStarredMessages(query);

        // 设置过滤状态
        setIsFiltered(!!query || !!dateRange.from || !!dateRange.to);
      } catch (error) {
        console.error("搜索收藏失败:", error);
        toastService.error("搜索失败");
      }
    },
    [searchStarredMessages]
  );

  // 添加实时搜索处理函数
  const handleRealtimeSearch = useCallback(
    (query: string) => {
      // 立即执行搜索
      searchStarredMessages(query);
      setIsFiltered(!!query);
    },
    [searchStarredMessages]
  );

  // MARK: 处理删除
  const handleDelete = useCallback(
    async (id: string) => {
      await removeStar(id);
      // 如果当前打开的模态框正在显示将被删除的消息，则关闭模态框
      if (currentMessage && currentMessage.id === id) {
        setIsModalOpen(false);
        setCurrentMessage(null);
      }
    },
    [removeStar, currentMessage]
  );

  // 打开模态框查看完整内容
  const openModal = useCallback((message: StarredMessage) => {
    setCurrentMessage(message);
    setIsModalOpen(true);
  }, []);

  // MARK: 清除筛选
  const clearFilters = useCallback(() => {
    setIsFiltered(false);
    refreshStarredMessages();
  }, [refreshStarredMessages]);

  // MARK: 格式化时间
  const formatFullTime = useCallback((date: Date) => {
    try {
      return format(date, "yyyy年MM月dd日 HH:mm:ss", { locale: zhCN });
    } catch {
      return "未知时间";
    }
  }, []);

  // MARK: 导航到原始聊天
  const handleNavigateToChat = useCallback(
    (message: StarredMessage) => {
      const isCollection =
        message.isCollection || message.role === "collection";
      const firstMessage = isCollection
        ? message.collectionMessages?.[0]
        : null;

      // 优先处理集合消息
      if (isCollection && firstMessage) {
        // 集合消息优先跳转到知识库
        if (firstMessage.libraryId) {
          router.push(
            `/library?libraryId=${firstMessage.libraryId}&messageId=${firstMessage.id}`
          );
          return;
        }
        // 否则跳转到普通聊天
        if (firstMessage.chatId) {
          router.push(
            `/?chatId=${firstMessage.chatId}&messageId=${firstMessage.id}`
          );
          return;
        }
      }

      // 处理知识库消息
      if (message.libraryId) {
        const messageIdParam = message.messageId
          ? `&messageId=${message.messageId}`
          : "";
        router.push(`/library?libraryId=${message.libraryId}${messageIdParam}`);
        return;
      }

      // 处理普通聊天消息
      if (!message.chatId) {
        toastService.error("无法找到原始聊天");
        return;
      }

      router.push(
        `/?chatId=${message.chatId}&messageId=${
          message.messageId || message.id
        }`
      );
    },
    [router]
  );

  // MARK: renderContent
  const renderContent = () => {
    // 如果正在加载并且延迟计数器大于0（超过300ms仍在加载）
    if (isLoading && loadingDelay > 0) {
      return <SkeletonGrid />;
    }

    // 如果没有收藏内容
    if (displayMessages.length === 0) {
      return (
        <div className="text-center py-16 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <Star className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-xl font-medium text-gray-500 dark:text-gray-400">
            暂无{activeTab === "rag" ? "知识库" : "聊天"}收藏内容
          </h3>
          <p className="text-gray-400 dark:text-gray-500 mt-2">
            {isFiltered || searchQuery
              ? "没有符合条件的收藏，请尝试其他搜索条件"
              : activeTab === "rag" 
                ? "在知识库中使用收藏按钮来保存重要内容"
                : "在聊天中使用收藏按钮来保存重要内容"}
          </p>
        </div>
      );
    }

    // MARK: 收藏内容
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto max-h-[calc(100vh-200px)] scrollbar-hide pb-24">
        {displayMessages.map((message) => (
          <StarredMessageCard
            key={message.id}
            message={message}
            onView={() => openModal(message)}
            onNavigate={() => handleNavigateToChat(message)}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回聊天
          </Button>
          <h1 className="text-2xl font-bold flex items-center">
            <Star className="h-5 w-5 mr-2 text-yellow-500" />
            我的收藏
          </h1>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "chat" | "rag")} className="w-full">
        <div className="flex items-center gap-4 mb-6">
          <TabsList className="h-9">
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              聊天收藏
              {chatCount > 0 && (
                <span className="ml-1 text-xs bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded-full">
                  {chatCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="rag" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              知识库收藏
              {ragCount > 0 && (
                <span className="ml-1 text-xs bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded-full">
                  {ragCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
          
          <div className="flex-1">
            <SearchFilter 
              onSearch={handleSearch} 
              onClearFilters={clearFilters}
              onRealtimeSearch={handleRealtimeSearch}
            />
          </div>
        </div>

        <TabsContent value="chat" className="mt-0">
          {renderContent()}
        </TabsContent>
        
        <TabsContent value="rag" className="mt-0">
          {renderContent()}
        </TabsContent>
      </Tabs>

      <StarredMessageDialog
        message={currentMessage}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onDelete={handleDelete}
        formatFullTime={formatFullTime}
      />
    </div>
  );
}
