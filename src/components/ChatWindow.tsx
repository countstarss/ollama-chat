'use client';

import React, { useEffect, useRef } from 'react';
import { ChatMessage as ChatMessageType } from '@/lib/types';
import { ChatMessage } from './ChatMessage';

interface ChatWindowProps {
  messages: ChatMessageType[];
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ messages }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex-grow p-4 overflow-y-auto space-y-4">
      {messages.map((msg) => (
        <ChatMessage key={msg.id} message={msg} />
      ))}
      {/* Empty div to target for scrolling */}
      <div ref={messagesEndRef} />
    </div>
  );
};