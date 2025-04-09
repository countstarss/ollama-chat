"use client";

import { useState, useCallback, useEffect } from "react";
import toastService from "@/services/toastService";

interface UseCopyReturnType {
  copied: boolean;
  copy: (text: string) => Promise<void>;
  reset: () => void;
}

/**
 * 复制文本到剪贴板的自定义Hook
 * @param resetInterval 复制成功状态的自动重置时间（毫秒）
 * @returns {UseCopyReturnType} 包含复制状态和方法的对象
 */
export function useCopy(resetInterval = 2000): UseCopyReturnType {
  const [copied, setCopied] = useState(false);

  // 重置复制状态
  const reset = useCallback(() => {
    if (copied) {
      setCopied(false);
    }
  }, [copied]);

  // 复制到剪贴板
  const copy = useCallback(async (text: string) => {
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        toastService.success("已复制到剪贴板");
      } catch (error) {
        console.error("复制失败:", error);
        setCopied(false);
        toastService.error("复制失败");
      }
    } else {
      console.warn("当前环境不支持clipboard API");

      // 回退方案：创建临时文本区域进行复制
      try {
        const textArea = document.createElement("textarea");
        textArea.value = text;

        // 使元素不可见
        textArea.style.position = "fixed";
        textArea.style.top = "0";
        textArea.style.left = "0";
        textArea.style.width = "2em";
        textArea.style.height = "2em";
        textArea.style.opacity = "0";
        textArea.style.pointerEvents = "none";

        document.body.appendChild(textArea);
        textArea.select();

        const successful = document.execCommand("copy");
        if (successful) {
          setCopied(true);
          toastService.success("已复制到剪贴板");
        } else {
          console.error("复制命令失败");
          setCopied(false);
          toastService.error("复制失败");
        }

        document.body.removeChild(textArea);
      } catch (error) {
        console.error("回退复制方法失败:", error);
        setCopied(false);
        toastService.error("复制失败");
      }
    }
  }, []);

  // 自动重置复制状态
  useEffect(() => {
    if (copied && resetInterval) {
      const timeout = setTimeout(reset, resetInterval);
      return () => clearTimeout(timeout);
    }
  }, [copied, reset, resetInterval]);

  return { copied, copy, reset };
}
