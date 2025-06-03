"use client";

import React, { useState } from "react";
import { useSelectionStore } from "@/store/useSelectionStore";
import { Button } from "@/components/ui/button";
import {
  Layers,
  Star,
  X,
  ToggleLeft,
  ToggleRight,
  Combine,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toastService from "@/services/toastService";
import { useStarStore } from "@/store/useStarStore";
import { StarCollectionInput } from "@/components/ui/star/StarCollectionInput";

export function SelectionToolbar() {
  const {
    isSelectionMode,
    selectedMessages,
    toggleSelectionMode,
    clearSelection,
    autoSelectEnabled,
    setAutoSelectEnabled,
  } = useSelectionStore();

  // 使用useStarStore
  const { batchStarMessages } = useStarStore();

  const [isGroupStarring, setIsGroupStarring] = useState(false);
  const [showCollectionInput, setShowCollectionInput] = useState(false);

  // 如果不在选择模式，不渲染任何内容
  if (!isSelectionMode) return null;

  // 计算选择数量
  const selectionCount = selectedMessages.length;

  // 合并选中消息内容
  const combineSelectedContent = () => {
    // 按原始顺序排序消息
    const sortedMessages = [...selectedMessages].sort((a, b) => {
      // 假设ID格式包含顺序信息，例如 "msg-1", "msg-2"
      const aIndex = parseInt(a.id.split("-")[1] || "0");
      const bIndex = parseInt(b.id.split("-")[1] || "0");
      return aIndex - bIndex;
    });

    // 合并消息，优先使用mainContent
    return sortedMessages
      .map(
        (msg) =>
          `${msg.role === "user" ? "用户: " : "AI助手: "}\n${
            msg.mainContent || msg.content
          }`
      )
      .join("\n\n---\n\n");
  };

  // 处理批量收藏
  const handleGroupStar = async () => {
    if (selectedMessages.length === 0 || isGroupStarring) return;

    // 显示收藏集合名称输入
    setShowCollectionInput(true);
  };

  // 处理收藏集合名称确认
  const handleCollectionNameConfirm = async (collectionName: string) => {
    if (selectedMessages.length === 0 || isGroupStarring) return;

    setIsGroupStarring(true);
    try {
      // 检查是否为RAG消息
      const isRagMessages = selectedMessages.some((msg) => msg.libraryId);

      // 如果是RAG消息，确保所有消息都来自同一个知识库
      if (isRagMessages) {
        const libraryId = selectedMessages[0].libraryId;
        const allFromSameLibrary = selectedMessages.every(
          (msg) => msg.libraryId === libraryId
        );

        if (!allFromSameLibrary) {
          toastService.error("不能同时收藏来自不同知识库的消息");
          return;
        }
      }

      const success = await batchStarMessages(selectedMessages, collectionName);
      if (success) {
        toastService.success("批量收藏成功");
        clearSelection(); // 清除选择
        toggleSelectionMode(); // 退出选择模式
      }
    } finally {
      setIsGroupStarring(false);
      setShowCollectionInput(false);
    }
  };

  // MARK: 取消收藏集合
  const handleCancelCollection = () => {
    setShowCollectionInput(false);
  };

  // MARK: 退出选择模式
  const handleExit = () => {
    toggleSelectionMode();
  };

  // MARK: 清除当前选择
  const handleClearSelection = () => {
    clearSelection();
  };

  // MARK: 切换自动选择功能
  const handleToggleAutoSelect = () => {
    setAutoSelectEnabled(!autoSelectEnabled);
  };

  return (
    <>
      <motion.div
        className="w-fit max-w-4xl mx-auto"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
      >
        <div className="bg-white dark:bg-gray-800 rounded-full shadow-lg px-4 py-4 flex items-center gap-2 overflow-x-auto">
          {/* 显示选择计数 */}
          <div className="flex items-center bg-blue-100 dark:bg-blue-900 px-3 py-2 rounded-full">
            <Layers className="w-4 h-4 mr-1 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium text-blue-600 dark:text-blue-400 whitespace-nowrap">
              已选择 {selectionCount} 条消息
            </span>
          </div>

          {/* 自动选择开关 */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggleAutoSelect}
            className="gap-1.5 text-sm whitespace-nowrap"
            title={autoSelectEnabled ? "关闭自动选择" : "开启自动选择"}
          >
            {autoSelectEnabled ? (
              <>
                <ToggleRight className="w-4 h-4" />
                <span>自动选择</span>
              </>
            ) : (
              <>
                <ToggleLeft className="w-4 h-4" />
                <span>自动选择</span>
              </>
            )}
          </Button>

          {/* 批量操作按钮 */}
          <div className="h-6 border-l border-gray-300 dark:border-gray-600" />

          {/* 组合内容并复制 */}
          <Button
            onClick={() => {
              if (selectionCount > 0) {
                navigator.clipboard
                  .writeText(combineSelectedContent())
                  .then(() => {
                    toastService.success("已复制对话内容");
                  })
                  .catch(() => {
                    toastService.error("复制失败");
                  });
              }
            }}
            variant="default"
            size="sm"
            disabled={selectionCount === 0}
            className="gap-1.5 text-sm whitespace-nowrap"
          >
            <Combine className="w-4 h-4" />
            合并复制
          </Button>

          {/* MARK: 批量添加到收藏
           */}
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-sm whitespace-nowrap"
            onClick={handleGroupStar}
            disabled={selectionCount === 0 || isGroupStarring}
          >
            {isGroupStarring ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                <span>收藏中...</span>
              </>
            ) : (
              <>
                <Star className="w-4 h-4" />
                <span>批量收藏</span>
              </>
            )}
          </Button>

          {/* 管理按钮 */}
          <div className="h-6 border-l border-gray-300 dark:border-gray-600" />

          {/* 清空选择 */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearSelection}
            disabled={selectionCount === 0}
            className="gap-1.5 text-sm whitespace-nowrap"
          >
            <Layers className="w-4 h-4" />
            <span>清空选择</span>
          </Button>

          {/* 退出选择模式 */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExit}
            className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-500 gap-1.5 text-sm whitespace-nowrap"
          >
            <X className="w-4 h-4" />
            <span>退出</span>
          </Button>
        </div>
      </motion.div>

      {/* 收藏集合输入框 */}
      <AnimatePresence>
        {showCollectionInput && (
          <StarCollectionInput
            onSave={handleCollectionNameConfirm}
            onCancel={handleCancelCollection}
          />
        )}
      </AnimatePresence>
    </>
  );
}
