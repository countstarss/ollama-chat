import React from "react";
import { UploadArea } from "@/components/doc/UploadArea";

export default function DocsPage() {
  return (
    <div className="flex flex-col h-full w-full">
      <h1 className="text-lg font-semibold p-4">我的文档</h1>
      <UploadArea />
    </div>
  );
}
