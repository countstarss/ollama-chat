import { useState, useEffect, useCallback } from "react";
import {
  ModelSettingsData,
  DEFAULT_SETTINGS,
} from "@/components/ui/model-setting/ModelSettings";

export function useModelSettings() {
  const [modelSettings, setModelSettings] =
    useState<ModelSettingsData>(DEFAULT_SETTINGS);

  // 从本地存储加载模型设置
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem("ollama-chat-settings");
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        setModelSettings(parsedSettings);
      }
    } catch (error) {
      console.error("加载模型设置失败:", error);
    }
  }, []);

  // MARK: 保存设置到本地存储
  const saveSettings = useCallback((newSettings: ModelSettingsData) => {
    setModelSettings(newSettings);

    // 保存到本地存储
    try {
      localStorage.setItem("ollama-chat-settings", JSON.stringify(newSettings));
    } catch (error) {
      console.error("保存模型设置失败:", error);
    }
  }, []);

  return {
    modelSettings,
    saveSettings,
  };
}
