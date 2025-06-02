"use client";
import React from "react";
import { useSearchParams } from "next/navigation";
import Chat from "@/components/chat/Chat";
import { UploadArea } from "@/components/doc/UploadArea";

export default function LibraryPage() {
  const searchParams = useSearchParams();
  const libraryId = searchParams.get("libraryId");

  if (!libraryId) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-gray-500">未提供 libraryId</p>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <div className="w-1/2 border-r overflow-y-auto">
        <UploadArea libraryId={libraryId} />
      </div>
      <div className="flex-1">
        <Chat mode="rag" libraryId={libraryId} />
      </div>
    </div>
  );
}
