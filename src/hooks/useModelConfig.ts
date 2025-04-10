import { useState, useEffect, useCallback } from "react";
import toastService from "@/services/toastService";

// 模型配置接口
export interface ModelConfig {
  id: string; // 唯一标识符
  name: string; // 显示名称
  modelId: string; // 实际的模型ID，用于API调用
  description?: string; // 可选的描述
  isApiModel?: boolean; // 是否是API模型
  apiProvider?: string; // API提供商 (如 OpenAI, Anthropic 等)
  apiKey?: string; // API密钥
  apiEndpoint?: string; // API端点URL
  apiVersion?: string; // API版本
}

// 本地存储键名
const LOCAL_STORAGE_KEY = "ollama-chat-models";

// MARK: 默认模型列表
const DEFAULT_MODELS: ModelConfig[] = [
  {
    id: "default-deepseek",
    name: "DeepSeek 7B",
    modelId: "deepseek-r1:7b",
    description: "默认的DeepSeek 7B模型",
    isApiModel: false,
  },
  {
    id: "mistral",
    name: "Mistral-7B",
    modelId: "mistral",
    description: "默认的Mistral-7B模型",
    isApiModel: false,
  },
];

export function useModelConfig() {
  // 存储模型列表
  const [models, setModels] = useState<ModelConfig[]>(DEFAULT_MODELS);
  // 当前选中的模型
  const [selectedModelId, setSelectedModelId] =
    useState<string>("default-deepseek");

  // 立即保存到localStorage的工具函数
  const saveToLocalStorage = useCallback(
    (modelsList: ModelConfig[], selectedId: string) => {
      try {
        console.log(
          `[保存模型配置] 正在保存${modelsList.length}个模型到localStorage...`
        );
        localStorage.setItem(
          LOCAL_STORAGE_KEY,
          JSON.stringify({
            models: modelsList,
            selectedId: selectedId,
          })
        );
        console.log(`[保存模型配置] 保存成功!`);
      } catch (error) {
        console.error("保存模型配置失败:", error);
        toastService.error("保存模型配置失败");
      }
    },
    []
  );

  // 初始化时从本地存储加载数据
  useEffect(() => {
    const loadModels = () => {
      try {
        const savedModels = localStorage.getItem(LOCAL_STORAGE_KEY);
        console.log(`[加载模型配置] 本地存储中的模型配置: ${savedModels}`);
        if (savedModels) {
          const parsedData = JSON.parse(savedModels);
          if (Array.isArray(parsedData.models)) {
            setModels(parsedData.models);
          }
          if (parsedData.selectedId) {
            setSelectedModelId(parsedData.selectedId);
          }
        }
      } catch (error) {
        console.error("加载模型配置失败:", error);
        toastService.error("加载模型配置失败");
      }
    };

    loadModels();
  }, []);

  // NOTE: 当数据变更保存到本地存储
  useEffect(() => {
    // 仅当models有内容时才保存，避免在初始化阶段覆盖
    if (models.length > 0) {
      saveToLocalStorage(models, selectedModelId);
    }
  }, [models, selectedModelId, saveToLocalStorage]);

  // 添加新模型
  const addModel = useCallback(
    (model: Omit<ModelConfig, "id">) => {
      const newModel: ModelConfig = {
        ...model,
        id: `model-${Date.now()}`,
      };

      const updatedModels = [...models, newModel];
      setModels(updatedModels);

      // 立即保存到localStorage
      saveToLocalStorage(updatedModels, selectedModelId);

      toastService.success(`已添加模型 ${model.name}`);
      return newModel.id;
    },
    [models, selectedModelId, saveToLocalStorage]
  );

  // MARK: 更新模型
  const updateModel = useCallback(
    (id: string, updates: Partial<Omit<ModelConfig, "id">>) => {
      const updatedModels = models.map((model) =>
        model.id === id ? { ...model, ...updates } : model
      );

      setModels(updatedModels);

      // 立即保存到localStorage
      saveToLocalStorage(updatedModels, selectedModelId);

      toastService.success("模型已更新");
    },
    [models, selectedModelId, saveToLocalStorage]
  );

  // MARK: 删除模型
  const deleteModel = useCallback(
    (id: string) => {
      // 如果删除的是当前选中的模型，则切换到默认模型
      let newSelectedId = selectedModelId;
      if (id === selectedModelId) {
        newSelectedId = "default-deepseek";
        setSelectedModelId(newSelectedId);
      }

      const modelToDelete = models.find((model) => model.id === id);
      const updatedModels = models.filter((model) => model.id !== id);
      setModels(updatedModels);

      // 立即保存到localStorage
      saveToLocalStorage(updatedModels, newSelectedId);

      if (modelToDelete) {
        toastService.success(`已删除模型 ${modelToDelete.name}`);
      }
    },
    [selectedModelId, models, saveToLocalStorage]
  );

  // MARK: 选择模型
  const selectModel = useCallback(
    (id: string) => {
      const modelExists = models.some((model) => model.id === id);
      if (modelExists) {
        setSelectedModelId(id);
        // 立即保存选中的模型ID到localStorage
        saveToLocalStorage(models, id);
        return true;
      }
      return false;
    },
    [models, saveToLocalStorage]
  );

  // MARK: 获取当前选中的模型
  const getSelectedModel = useCallback(() => {
    return models.find((model) => model.id === selectedModelId) || models[0];
  }, [models, selectedModelId]);

  // 手动触发保存到localStorage
  const forceLocalStorageSave = useCallback(() => {
    saveToLocalStorage(models, selectedModelId);
  }, [models, selectedModelId, saveToLocalStorage]);

  return {
    models,
    selectedModelId,
    setSelectedModelId,
    getSelectedModel,
    addModel,
    updateModel,
    deleteModel,
    selectModel,
    forceLocalStorageSave, // 导出强制保存方法
  };
}
