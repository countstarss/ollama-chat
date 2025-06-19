"use client";

import React, { useState, useCallback, useEffect } from "react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { useStarStore } from "@/store/useStarStore";
import { StarredMessage } from "@/services/starStorageService";
import toastService from "@/services/toastService";

// 组件导入
import { SearchFilter } from "./SearchFilter";
import { StarredMessageDialog } from "./StarredMessageDialog";
import { ArrowLeft, Star } from "lucide-react";
import { StarredMessageCard } from "@/components/ui/star/StarredMessageCard";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { SkeletonCard } from "@/components/ui/skeleton/SkeletonCard";

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
      const firstMessage = isCollection ? message.collectionMessages?.[0] : null;

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
        const messageIdParam = message.messageId ? `&messageId=${message.messageId}` : "";
        router.push(`/library?libraryId=${message.libraryId}${messageIdParam}`);
        return;
      }

      // 处理普通聊天消息
      if (!message.chatId) {
        toastService.error("无法找到原始聊天");
        return;
      }

      router.push(
        `/?chatId=${message.chatId}&messageId=${message.messageId || message.id}`
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
    if (starredMessages.length === 0) {
      return (
        <div className="text-center py-16 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <Star className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-xl font-medium text-gray-500 dark:text-gray-400">
            暂无收藏内容
          </h3>
          <p className="text-gray-400 dark:text-gray-500 mt-2">
            {isFiltered
              ? "没有符合条件的收藏，请尝试其他搜索条件"
              : "在聊天中使用收藏按钮来保存重要内容"}
          </p>
        </div>
      );
    }

    // MARK: 收藏内容
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto max-h-[calc(100vh-200px)] scrollbar-hide pb-24">
        {starredMessages.map((message) => (
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
    <div className="container mx-auto py-8 px-4 max-w-5xl">
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

      <SearchFilter onSearch={handleSearch} onClearFilters={clearFilters} />

      {renderContent()}

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
