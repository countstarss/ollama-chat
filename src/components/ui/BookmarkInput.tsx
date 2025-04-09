'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Check } from 'lucide-react';

interface BookmarkInputProps {
  onSave: (name: string) => void;
  onCancel: () => void;
  autoFocus?: boolean;
  timeoutDuration?: number;
}

export const BookmarkInput: React.FC<BookmarkInputProps> = ({
  onSave,
  onCancel,
  autoFocus = true,
  timeoutDuration = 3000,
}) => {
  const [bookmarkName, setBookmarkName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 清除超时定时器
  const clearTimeoutRef = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // 保存书签
  const handleSave = useCallback(() => {
    clearTimeoutRef();
    onSave(bookmarkName);
  }, [clearTimeoutRef, bookmarkName, onSave]);

  // 取消保存
  const handleCancel = useCallback(() => {
    clearTimeoutRef();
    onCancel();
  }, [clearTimeoutRef, onCancel]);

  // 设置自动保存定时器
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
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 flex flex-col gap-2 w-64 border border-gray-200 dark:border-gray-700">
      <label className="text-sm text-gray-600 dark:text-gray-300 font-medium">
        书签名称
      </label>
      <input
        ref={inputRef}
        type="text"
        value={bookmarkName}
        onChange={(e) => setBookmarkName(e.target.value)}
        placeholder="输入书签名称..."
        className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-md border border-gray-300 dark:border-gray-600 text-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent outline-none"
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            handleSave();
          } else if (e.key === 'Escape') {
            handleCancel();
          }
        }}
      />
      <div className="flex justify-between">
        <button
          onClick={handleCancel}
          className="px-3 py-1.5 text-xs bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-md text-gray-700 dark:text-gray-300"
        >
          取消
        </button>
        <button
          onClick={handleSave}
          className="px-3 py-1.5 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded-md flex items-center gap-1"
        >
          <Check className="w-3.5 h-3.5" />
          保存
        </button>
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-400 italic">
        {Math.round(timeoutDuration / 1000)}秒内不操作将自动保存
      </div>
    </div>
  );
}; 