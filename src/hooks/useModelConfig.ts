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
  isValidated?: boolean; // 模型是否已通过验证
  lastValidatedAt?: number; // 上次验证时间戳
}

// 本地存储键名
const LOCAL_STORAGE_KEY = "ollama-chat-models";

export function useModelConfig() {
  // 存储模型列表 - 初始化为空数组而不是undefined
  const [models, setModels] = useState<ModelConfig[]>([]);
  // 当前选中的模型 - 初始化为空字符串，等待从localStorage加载
  const [selectedModelId, setSelectedModelId] = useState<string>("");

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
        console.log(`[加载模型配置] 本地存储中的模型配置:`, savedModels);
        
        if (savedModels) {
          const parsedData = JSON.parse(savedModels);
          
          // 如果有保存的模型列表，使用它
          if (Array.isArray(parsedData.models) && parsedData.models.length > 0) {
            console.log(`[加载模型配置] 加载了 ${parsedData.models.length} 个模型`);
            setModels(parsedData.models);
            
            // 如果有选中的ID，使用它
            if (parsedData.selectedId) {
              setSelectedModelId(parsedData.selectedId);
            } else if (parsedData.models.length > 0) {
              // 如果没有选中的ID，选择第一个模型
              setSelectedModelId(parsedData.models[0].id);
            }
          } else {
            console.log("[加载模型配置] 没有保存的模型，保持空列表");
            // 不设置默认模型，保持空列表
          }
        } else {
          console.log("[加载模型配置] localStorage中没有数据");
          // 不设置默认模型，保持空列表
        }
      } catch (error) {
        console.error("加载模型配置失败:", error);
        toastService.error("加载模型配置失败");
        // 出错时也不设置默认模型
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

      console.log("[ModelConfig] 添加新模型:", newModel);
      const updatedModels = [...models, newModel];
      setModels(updatedModels);

      // 立即保存到localStorage
      console.log(
        "[ModelConfig] 保存到localStorage，模型数量:",
        updatedModels.length
      );
      saveToLocalStorage(updatedModels, selectedModelId);

      // 验证保存结果
      setTimeout(() => {
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
        console.log("[ModelConfig] 验证localStorage内容:", saved);
      }, 100);

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
    if (models.length === 0) {
      return null; // 如果没有模型，返回null
    }
    return models.find((model) => model.id === selectedModelId) || null;
  }, [models, selectedModelId]);

  // 手动触发保存到localStorage
  const forceLocalStorageSave = useCallback(() => {
    saveToLocalStorage(models, selectedModelId);
  }, [models, selectedModelId, saveToLocalStorage]);

  // 更新模型验证状态
  const updateModelValidation = useCallback(
    (modelId: string, isValid: boolean) => {
      const updatedModels = models.map((model) => {
        if (model.id === modelId) {
          // 更新当前模型的验证状态
          return {
            ...model,
            isValidated: isValid,
            lastValidatedAt: isValid ? Date.now() : undefined,
          };
        } else {
          // 将其他模型的验证状态重置为false
          return {
            ...model,
            isValidated: false,
            lastValidatedAt: undefined,
          };
        }
      });

      setModels(updatedModels);
      saveToLocalStorage(updatedModels, selectedModelId);
      
      console.log(`[ModelConfig] 更新模型验证状态: ${modelId} -> ${isValid}`);
    },
    [models, selectedModelId, saveToLocalStorage]
  );

  // 检查模型是否需要重新验证（例如：超过24小时）
  const shouldRevalidateModel = useCallback((model: ModelConfig): boolean => {
    if (!model.isValidated) return true;
    if (!model.lastValidatedAt) return true;
    
    // 如果是API模型且没有密钥，需要重新验证
    if (model.isApiModel && !model.apiKey) return true;
    
    // 检查是否超过24小时
    const oneDay = 24 * 60 * 60 * 1000;
    const now = Date.now();
    return (now - model.lastValidatedAt) > oneDay;
  }, []);

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
    updateModelValidation, // 导出更新验证状态方法
    shouldRevalidateModel, // 导出检查是否需要重新验证的方法
  };
}
