'use client';

import { Toaster as SonnerToaster } from "sonner";
import { useTheme } from "next-themes";

export function Toaster() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <SonnerToaster
      theme={isDark ? "dark" : "light"}
      position="top-right"
      richColors
      closeButton
      toastOptions={{
        duration: 5000, // 5 秒显示时间
        className: "sonner-toast",
      }}
    />
  );
} 