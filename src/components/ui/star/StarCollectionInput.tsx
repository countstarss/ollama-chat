"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Check } from "lucide-react";
import { motion } from "framer-motion";

interface StarCollectionInputProps {
  onSave: (name: string) => void;
  onCancel: () => void;
  autoFocus?: boolean;
  timeoutDuration?: number;
}

export const StarCollectionInput: React.FC<StarCollectionInputProps> = ({
  onSave,
  onCancel,
  autoFocus = true,
  timeoutDuration = 5000, // 5秒后自动保存
}) => {
  const [collectionName, setCollectionName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // MARK: 清除超时定时器
  const clearTimeoutRef = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // MARK: 保存收藏集合
  const handleSave = useCallback(() => {
    clearTimeoutRef();
    onSave(
      collectionName || `收藏集合 (${new Date().toLocaleString("zh-CN")})`
    );
  }, [clearTimeoutRef, collectionName, onSave]);

  // MARK: 取消保存
  const handleCancel = useCallback(() => {
    clearTimeoutRef();
    onCancel();
  }, [clearTimeoutRef, onCancel]);

  // MARK: 设置自动保存定时器
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }

    // 设置超时自动保存
    timeoutRef.current = setTimeout(() => {
      handleSave();
    }, timeoutDuration);

    return () => {
      clearTimeoutRef();
    };
  }, [timeoutDuration, autoFocus, clearTimeoutRef, handleSave]);

  return (
    <motion.div
      className="fixed bottom-0 left-0 right-0 p-4 z-50"
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 mx-auto max-w-md border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-medium mb-2 text-gray-800 dark:text-gray-200">
          收藏集合名称
        </h3>

        <div className="mb-4">
          <input
            ref={inputRef}
            type="text"
            value={collectionName}
            onChange={(e) => setCollectionName(e.target.value)}
            placeholder="输入收藏集合名称..."
            className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-md border border-gray-300 dark:border-gray-600 text-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent outline-none"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSave();
              } else if (e.key === "Escape") {
                handleCancel();
              }
            }}
          />
        </div>

        <div className="flex justify-between gap-2 items-center">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            将 {timeoutDuration / 1000} 秒内自动保存
          </p>

          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-md text-gray-700 dark:text-gray-300"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-md flex items-center gap-1"
            >
              <Check className="w-4 h-4" />
              保存
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
