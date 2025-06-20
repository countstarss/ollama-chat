"use client";

import React, { useState, useRef, useEffect } from "react";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  onAbort?: () => void;
  isLoading: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  onAbort,
  isLoading,
}) => {
  const [inputValue, setInputValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // MARK: 处理输入变化
  const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(event.target.value);
  };

  // MARK: 处理表单提交
  const handleSubmit = (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (inputValue.trim() && !isLoading) {
      onSendMessage(inputValue);
      setInputValue("");
    }
  };

  // MARK: 处理键盘事件
  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter press (Shift+Enter for new line)
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  };

  // MARK: 自动调整高度
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"; // Reset height
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputValue]);

  return (
    <form
      onSubmit={handleSubmit}
      className="w-[80%] max-w-4xl mx-auto rounded-3xl p-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:scale-[1.02] transition-all duration-300 shadow-md"
    >
      <div className="flex items-center space-x-2">
        <textarea
          ref={textareaRef}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder=""
          className="text-base flex-grow p-2 border-none outline-none
          dark:border-gray-600 rounded-xl resize-none  
          dark:bg-gray-700 min-h-[40px] max-h-[200px] px-8"
          rows={1}
          disabled={isLoading}
        />
        {isLoading && onAbort ? (
          <button
            type="button"
            onClick={onAbort}
            className="px-4 py-2 bg-red-400 text-white rounded-full hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ring-inset hover:scale-[1.02] transition-all duration-300"
          >
            暂停
          </button>
        ) : (
          <button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-full disabled:opacity-50 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 hover:scale-[1.02] transition-all duration-300 ring-inset"
          >
            {isLoading ? "发送中..." : "发送"}
          </button>
        )}
      </div>
    </form>
  );
};
