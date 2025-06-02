import Chat from "@/components/chat/Chat";
import React from "react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "RAG 聊天",
  description: "RAG 聊天",
};

const page = () => {
  return (
    <div className="flex flex-col h-full w-full">
      <Chat mode="rag" />
    </div>
  );
};

export default page;
