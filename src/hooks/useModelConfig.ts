import { useState, useEffect, useCallback } from 'react';

// 模型配置接口
export interface ModelConfig {
  id: string;        // 唯一标识符
  name: string;      // 显示名称
  modelId: string;   // 实际的模型ID，用于API调用
  description?: string; // 可选的描述
}

// 本地存储键名
const LOCAL_STORAGE_KEY = 'ollama-chat-models';

// MARK: 默认模型列表
const DEFAULT_MODELS: ModelConfig[] = [
  {
    id: 'default-deepseek',
    name: 'DeepSeek 7B',
    modelId: 'deepseek-r1:7b',
    description: '默认的DeepSeek 7B模型'
  }
];

export function useModelConfig() {
  // 存储模型列表
  const [models, setModels] = useState<ModelConfig[]>(DEFAULT_MODELS);
  // 当前选中的模型
  const [selectedModelId, setSelectedModelId] = useState<string>('default-deepseek');
  
  // 初始化时从本地存储加载数据
  useEffect(() => {
    const loadModels = () => {
      try {
        const savedModels = localStorage.getItem(LOCAL_STORAGE_KEY);
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
        console.error('加载模型配置失败:', error);
      }
    };
    
    loadModels();
  }, []);
  
  // NOTE: 当数据变更保存到本地存储
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({
        models,
        selectedId: selectedModelId
      }));
    } catch (error) {
      console.error('保存模型配置失败:', error);
    }
  }, [models, selectedModelId]);
  
  // 添加新模型
  const addModel = useCallback((model: Omit<ModelConfig, 'id'>) => {
    const newModel: ModelConfig = {
      ...model,
      id: `model-${Date.now()}`
    };
    
    setModels(prevModels => [...prevModels, newModel]);
    return newModel.id;
  }, []);
  
  // MARK: 更新模型
  const updateModel = useCallback((id: string, updates: Partial<Omit<ModelConfig, 'id'>>) => {
    setModels(prevModels => 
      prevModels.map(model => 
        model.id === id ? { ...model, ...updates } : model
      )
    );
  }, []);
  
  // MARK: 删除模型
  const deleteModel = useCallback((id: string) => {
    // 如果删除的是当前选中的模型，则切换到默认模型
    if (id === selectedModelId) {
      setSelectedModelId('default-deepseek');
    }
    
    setModels(prevModels => prevModels.filter(model => model.id !== id));
  }, [selectedModelId]);
  
  // MARK: 选择模型
  const selectModel = useCallback((id: string) => {
    const modelExists = models.some(model => model.id === id);
    if (modelExists) {
      setSelectedModelId(id);
      return true;
    }
    return false;
  }, [models]);
  
  // MARK: 获取当前选中的模型
  const getSelectedModel = useCallback(() => {
    return models.find(model => model.id === selectedModelId) || models[0];
  }, [models, selectedModelId]);
  
  return {
    models,
    selectedModelId,
    getSelectedModel,
    addModel,
    updateModel,
    deleteModel,
    selectModel
  };
} 