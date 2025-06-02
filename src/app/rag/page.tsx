import Chat from "@/components/chat/Chat";
import React from "react";

const page = () => {
  return (
    <div className="flex flex-col h-full w-full">
      <Chat mode="rag" />
    </div>
  );
};

export default page;
