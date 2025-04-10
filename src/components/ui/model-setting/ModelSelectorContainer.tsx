import { useState, useCallback, useEffect } from 'react';
import { useModelConfig } from '@/hooks/useModelConfig';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface ModelSelectorContainerProps {
  isLoading: boolean;
  onModelChange?: (modelId: string) => void;
  isModelReady?: boolean; // 是否模型已就绪
}

export function ModelSelectorContainer({ 
  isLoading, 
  onModelChange, 
  isModelReady: externalModelReady 
}: ModelSelectorContainerProps) {
  const [modelError, setModelError] = useState<string | null>(null);
  const [isModelReady, setIsModelReady] = useState(false);
  
  // 使用模型配置hook
  const { 
    getSelectedModel,
    models
  } = useModelConfig();
  
  // 过滤出本地模型（非API模型）
  const localModels = models.filter(model => !model.isApiModel);
  
  // 当前选中的模型ID
  const [selectedModelId, setSelectedModelId] = useState<string>("");
  
  // 使用父组件传入的 isModelReady 状态
  useEffect(() => {
    if (externalModelReady !== undefined) {
      setIsModelReady(externalModelReady);
    }
  }, [externalModelReady]);
  
  // 初始化当前模型
  useEffect(() => {
    const model = getSelectedModel();
    if (model) {
      setSelectedModelId(model.modelId);
      setIsModelReady(true);
    }
  }, [getSelectedModel]);

  // 处理模型选择变更
  const handleModelSelect = useCallback((modelId: string) => {
    setSelectedModelId(modelId);
    setModelError(null);
    
    // 调用父组件回调
    if (onModelChange) {
      console.log(`[切换模型] 调用回调并传递 modelId: ${modelId}`);
      onModelChange(modelId);
    }
  }, [onModelChange]);

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <div className="relative">
          <Select 
            value={selectedModelId} 
            onValueChange={handleModelSelect}
            disabled={isLoading}
          >
            <SelectTrigger 
              className={cn(
                "w-48 h-9",
                isModelReady && "border-green-500/50 ring-1 ring-green-500/20",
                modelError && "border-red-500/50 ring-1 ring-red-500/20"
              )}
            >
              <div className="flex items-center gap-2 truncate">
                <SelectValue placeholder="选择模型" />
                {isModelReady ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <CheckCircle2 className="h-4 w-4 text-green-500 ml-1 shrink-0" />
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        <p>模型已准备就绪</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Loader2 className="h-4 w-4 text-blue-500 ml-1 animate-spin shrink-0" />
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        <p>模型准备中...</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </SelectTrigger>
            <SelectContent>
              {localModels.length > 0 ? (
                localModels.map(model => (
                  <SelectItem 
                    key={model.id} 
                    value={model.modelId}
                    className={cn(
                      "truncate pr-6",
                      selectedModelId === model.modelId && "font-medium"
                    )}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="truncate max-w-[160px]">{model.name}</span>
                    </div>
                  </SelectItem>
                ))
              ) : (
                <div className="px-2 py-2 text-sm text-gray-500">没有可用的本地模型</div>
              )}
            </SelectContent>
          </Select>
          
          {modelError && (
            <div className="absolute -bottom-5 left-0 text-xs text-red-600 dark:text-red-400 flex items-center">
              <span>模型错误</span>
            </div>
          )}
        </div>
      </div>
      
      {/* 模型错误提示 */}
      {modelError && (
        <div className="absolute top-full left-0 mt-6 p-2 bg-red-50 dark:bg-red-900/40 text-red-600 dark:text-red-300 text-xs rounded-md border border-red-200 dark:border-red-800 max-w-xs z-30">
          {modelError}
        </div>
      )}
    </div>
  );
}

// 导出相关方法以供外部使用
export { useModelConfig }; 