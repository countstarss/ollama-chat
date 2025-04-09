import { useState, useCallback } from 'react';
import { ModelSelector } from '@/components/ui/ModelSelector';
import { ModelEditDialog } from '@/components/ui/ModelEditDialog';
import { useModelConfig, ModelConfig } from '@/hooks/useModelConfig';

interface ModelSelectorContainerProps {
  isLoading: boolean;
  onModelChange?: (modelId: string) => void;
}

export function ModelSelectorContainer({ isLoading, onModelChange }: ModelSelectorContainerProps) {
  const [isModelDialogOpen, setIsModelDialogOpen] = useState(false);
  const [editingModelId, setEditingModelId] = useState<string | null>(null);
  const [modelError, setModelError] = useState<string | null>(null);
  
  // 使用模型配置hook
  const { 
    models, 
    selectedModelId, 
    getSelectedModel, 
    addModel, 
    updateModel, 
    deleteModel, 
    selectModel 
  } = useModelConfig();

  // 处理打开添加模型对话框
  const handleAddModel = useCallback(() => {
    setEditingModelId(null);
    setIsModelDialogOpen(true);
  }, []);

  // 处理编辑模型
  const handleEditModel = useCallback((id: string) => {
    setEditingModelId(id);
    setIsModelDialogOpen(true);
  }, []);

  // 处理模型选择变更
  const handleSelectModel = useCallback((modelId: string) => {
    selectModel(modelId);
    setModelError(null);
    if (onModelChange) {
      onModelChange(modelId);
    }
  }, [selectModel, onModelChange]);

  // 处理保存模型
  const handleSaveModel = useCallback((modelData: Omit<ModelConfig, 'id'>) => {
    if (editingModelId) {
      updateModel(editingModelId, modelData);
    } else {
      const newId = addModel(modelData);
      selectModel(newId);
      if (onModelChange) {
        onModelChange(newId);
      }
    }
    setIsModelDialogOpen(false);
    
    // 添加模型后清除任何之前的错误
    setModelError(null);
  }, [editingModelId, addModel, updateModel, selectModel, onModelChange]);

  // 获取编辑模型的初始数据
  const getModelForEditing = useCallback(() => {
    if (!editingModelId) return undefined;
    
    const model = models.find(m => m.id === editingModelId);
    if (!model) return undefined;
    
    return {
      name: model.name,
      modelId: model.modelId,
      description: model.description
    };
  }, [editingModelId, models]);

  // 设置模型错误
  const setError = useCallback((error: string | null) => {
    setModelError(error);
  }, []);

  return (
    <div className="relative">
      <ModelSelector 
        models={models}
        selectedModelId={selectedModelId}
        onSelectModel={handleSelectModel}
        onAddModel={handleAddModel}
        onEditModel={handleEditModel}
        onDeleteModel={deleteModel}
        isLoading={isLoading}
      />
      
      {/* 模型错误提示 */}
      {modelError && (
        <div className="absolute top-full left-0 mt-1 p-2 bg-red-50 dark:bg-red-900/40 text-red-600 dark:text-red-300 text-xs rounded-md border border-red-200 dark:border-red-800 max-w-xs z-30">
          {modelError}
        </div>
      )}
      
      {/* 模型编辑对话框 */}
      <ModelEditDialog 
        isOpen={isModelDialogOpen}
        onClose={() => setIsModelDialogOpen(false)}
        onSave={handleSaveModel}
        initialData={getModelForEditing()}
        isEditing={!!editingModelId}
      />
    </div>
  );
}

// 导出相关方法以供外部使用
export { useModelConfig }; 