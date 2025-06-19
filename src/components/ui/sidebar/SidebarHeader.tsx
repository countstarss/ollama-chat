"use client";

import { MessageSquareCodeIcon } from "lucide-react";

export function SidebarHeader() {
  return (
    <div className="flex h-13 items-center border-b px-4 py-3 w-full">
      <div className="flex items-center justify-center gap-2 w-full">
        <MessageSquareCodeIcon className="h-6 w-6" />
        <h2 className="text-xl font-bold">WizChat</h2>
      </div>
    </div>
  );
}
