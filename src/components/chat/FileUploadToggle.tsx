"use client";

import React from "react";
import { Layers, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSelectionStore } from "@/store/useSelectionStore";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useUploadPanelStore } from "@/store/useUploadPanelStore";

export function FileUploadToggle() {
  const { isOpen, open, close } = useUploadPanelStore();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={isOpen ? "default" : "ghost"}
            size="icon"
            onClick={isOpen ? close : open}
            className={`h-8 w-8 ${
              isOpen
                ? "bg-blue-500 text-white hover:bg-blue-600"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            <Upload className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{isOpen ? "退出" : "上传文档"}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
