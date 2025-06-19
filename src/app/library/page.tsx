"use client";
import React from "react";
import { useSearchParams } from "next/navigation";
import Chat from "@/components/chat/Chat";
import { UploadArea } from "@/components/doc/UploadArea";
import { useUploadPanelStore } from "@/store/useUploadPanelStore";
import { ChevronLeftIcon, ChevronRightIcon, Pin } from "lucide-react";
import { cn } from "@/lib/utils";

export default function LibraryPage() {
  const searchParams = useSearchParams();
  const libraryId = searchParams.get("libraryId");
  const messageId = searchParams.get("messageId");

  const { isOpen, pinned, open, close, togglePin } = useUploadPanelStore();

  if (!libraryId) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-gray-500">未提供 libraryId</p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      {/* Sidebar Wrapper */}
      <div
        className={`absolute left-0 top-0 h-full w-1/2 border-r bg-white dark:bg-gray-800 shadow-xl z-20 transform transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        // onMouseEnter={() => !pinned && open()}
        // onMouseLeave={() => !pinned && close()}
      >
        <div className="flex items-center justify-between px-2 py-1 border-b h-13">
          <span className="text-sm font-semibold">文档</span>
          <button onClick={togglePin} className="p-1 hover:bg-gray-200 rounded">
            <Pin
              className={`h-4 w-4 ${
                pinned ? "text-blue-600" : "text-gray-500"
              }`}
            />
          </button>
        </div>
        <UploadArea libraryId={libraryId} />
        <div className="absolute top-1/2 -translate-y-1/2 -right-8 w-8 flex items-center justify-center">
          <button
            onClick={isOpen ? close : open}
            className="p-1 hover:text-gray-500 rounded"
          >
            {isOpen ? (
              <>
                <ChevronLeftIcon className="h-8 w-8" />
              </>
            ) : (
              <>
                <ChevronRightIcon className="h-8 w-8" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Chat area with left padding */}
      <div
        className={cn(
          "h-full",
          pinned && "block w-1/2 translate-x-full",
          // !pinned && "w-full",
          isOpen && ""
        )}
        style={{ marginLeft: "0px" }}
      >
        <Chat mode="rag" libraryId={libraryId} messageId={messageId} />
      </div>
    </div>
  );
}
