"use client";

import React, { DragEvent } from "react";
import { useDocStore } from "@/hooks/useDocStore";
import { Button } from "@/components/ui/button";
import {
  FileText,
  FileJson,
  FileCheck2,
  Loader2,
  AlertTriangle,
  Hourglass,
} from "lucide-react";
import { useUploadPanelStore } from "@/store/useUploadPanelStore";

// 根据扩展返回图标
function getFileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "txt":
      return <FileText className="h-5 w-5 text-blue-500" />;
    case "md":
      return <FileText className="h-5 w-5 text-blue-500" />;
    case "json":
      return <FileJson className="h-5 w-5 text-orange-500" />;
    default:
      return <FileText className="h-5 w-5 text-gray-500" />;
  }
}

// 根据状态返回颜色和图标
function getStatusBadge(status: string) {
  switch (status) {
    case "pending":
      return (
        <span className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300">
          <Hourglass className="h-4 w-4 animate-pulse" /> 待同步
        </span>
      );
    case "uploading":
      return (
        <span className="flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-300">
          <Loader2 className="h-4 w-4 animate-spin" /> 上传中
        </span>
      );
    case "synced":
      return (
        <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-300">
          <FileCheck2 className="h-4 w-4" /> 已同步
        </span>
      );
    case "error":
      return (
        <span className="flex items-center gap-1 text-xs text-red-600 dark:text-red-300">
          <AlertTriangle className="h-4 w-4" /> 失败
        </span>
      );
    default:
      return null;
  }
}

export const UploadArea: React.FC<{ libraryId?: string }> = ({ libraryId }) => {
  const { isOpen } = useUploadPanelStore();
  // MARK: useDocStore
  const { addFiles, docs, syncAll } = useDocStore(libraryId);

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(e.target.files);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="p-4 space-y-6 w-full h-full bg-white dark:bg-gray-800">
      {/* 上传区域 */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="border-2 border-dashed border-gray-400 dark:border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        <p className="mb-2 text-sm">拖拽文件到此处，或点击选择文件</p>
        <input
          type="file"
          multiple
          className="hidden"
          id="file-input"
          onChange={handleInputChange}
        />
        <label
          htmlFor="file-input"
          className="px-4 py-2 bg-blue-600 text-white rounded cursor-pointer text-sm"
        >
          选择文件
        </label>
      </div>

      <div className="flex justify-end">
        <Button size="sm" onClick={syncAll}>
          同步所有待上传文件
        </Button>
      </div>

      {/* 文件列表分区 */}
      <div className="space-y-6">
        {/* 待上传区域 */}
        <div className="overflow-y-auto h-full">
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            待上传 / 失败
            <span className="text-xs text-gray-500">
              ({docs.filter((d) => d.status !== "synced").length})
            </span>
          </h3>
          {docs.filter((d) => d.status !== "synced").length === 0 ? (
            <p className="text-sm text-gray-500">暂无待上传文件</p>
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {docs
                .filter((d) => d.status !== "synced")
                .map((d) => (
                  <li
                    key={d.id}
                    className="flex items-center gap-3 p-3 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600"
                  >
                    {getFileIcon(d.name)}
                    <div className="flex-1 overflow-hidden">
                      <p className="truncate text-sm font-medium">{d.name}</p>
                      {getStatusBadge(d.status)}
                    </div>
                  </li>
                ))}
            </ul>
          )}
        </div>

        {/* 已同步区域 */}
        <div className="overflow-y-auto h-full">
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            已同步
            <span className="text-xs text-gray-500">
              ({docs.filter((d) => d.status === "synced").length})
            </span>
          </h3>
          {docs.filter((d) => d.status === "synced").length === 0 ? (
            <p className="text-sm text-gray-500">暂无已同步文件</p>
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {docs
                .filter((d) => d.status === "synced")
                .map((d) => (
                  <li
                    key={d.id}
                    className="flex items-center gap-3 p-3 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600"
                  >
                    {getFileIcon(d.name)}
                    <div className="flex-1 overflow-hidden">
                      <p className="truncate text-sm font-medium">{d.name}</p>
                      {getStatusBadge(d.status)}
                    </div>
                  </li>
                ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};
