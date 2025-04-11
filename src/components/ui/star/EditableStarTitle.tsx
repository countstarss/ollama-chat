import React, { useState, useRef, useEffect } from 'react';
import { Check, Pencil, X } from 'lucide-react';
import { useStarStore } from '@/store/useStarStore';
import toastService from '@/services/toastService';

interface EditableStarTitleProps {
  messageId: string;
  title: string;
}

export const EditableStarTitle: React.FC<EditableStarTitleProps> = ({ messageId, title }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);
  const { updateStarTitle } = useStarStore();

  // 当进入编辑模式时，聚焦输入框
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  // 处理保存事件
  const handleSave = async () => {
    if (inputValue.trim() === '') {
      toastService.error('标题不能为空');
      return;
    }
    
    // 只有当标题发生变化时才保存
    if (inputValue !== title) {
      const success = await updateStarTitle(messageId, inputValue);
      if (success) {
        toastService.success('标题已更新');
      }
    }
    
    setIsEditing(false);
  };

  // 处理取消事件
  const handleCancel = () => {
    setInputValue(title);
    setIsEditing(false);
  };

  // 处理按键事件
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  // 非编辑模式显示标题和编辑按钮
  if (!isEditing) {
    return (
      <div className="flex items-center group">
        <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 mr-2 line-clamp-1">
          {title}
        </h3>
        <button
          onClick={() => setIsEditing(true)}
          className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
          aria-label="编辑标题"
        >
          <Pencil size={14} className="text-gray-500 dark:text-gray-400" />
        </button>
      </div>
    );
  }

  // 编辑模式显示输入框和保存/取消按钮
  return (
    <div className="flex items-center">
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        className="flex-1 p-1 rounded-md border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 text-sm"
        placeholder="输入收藏标题..."
      />
      <div className="flex ml-2">
        <button
          onClick={handleSave}
          className="p-1 rounded-full bg-green-100 dark:bg-green-900 hover:bg-green-200 dark:hover:bg-green-800 mr-1"
          aria-label="保存"
        >
          <Check size={14} className="text-green-600 dark:text-green-400" />
        </button>
        <button
          onClick={handleCancel}
          className="p-1 rounded-full bg-red-100 dark:bg-red-900 hover:bg-red-200 dark:hover:bg-red-800"
          aria-label="取消"
        >
          <X size={14} className="text-red-600 dark:text-red-400" />
        </button>
      </div>
    </div>
  );
}; 