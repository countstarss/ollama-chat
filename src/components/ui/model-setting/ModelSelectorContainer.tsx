import { useState, useCallback, useEffect } from 'react';
import { useModelConfig, ModelConfig } from '@/hooks/useModelConfig';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ModelSelectorContainerProps {
  isLoading: boolean;
  onModelChange?: (modelId: string) => void;
}

export function ModelSelectorContainer({ isLoading, onModelChange }: ModelSelectorContainerProps) {
  const [modelError, setModelError] = useState<string | null>(null);
  const [modelInput, setModelInput] = useState<string>("");
  const [currentModel, setCurrentModel] = useState<string>("deepseek-r1:7b"); // 默认模型
  
  // 使用模型配置hook
  const { 
    getSelectedModel
  } = useModelConfig();
  
  // 初始化当前模型
  useEffect(() => {
    const model = getSelectedModel();
    if (model) {
      setCurrentModel(model.modelId);
      setModelInput(model.modelId);
    }
  }, [getSelectedModel]);

  // 处理模型名称提交
  const handleSubmitModel = useCallback(() => {
    if (!modelInput.trim()) {
      setModelError("请输入有效的模型名称");
      return;
    }
    
    console.log(`[切换模型] 直接使用用户输入的模型名称: ${modelInput}`);
    setCurrentModel(modelInput);
    setModelError(null);
    
    // 直接将模型名称传递给父组件的回调
    if (onModelChange) {
      console.log(`[切换模型] 调用回调并传递 modelId: ${modelInput}`);
      onModelChange(modelInput);
    }
  }, [modelInput, onModelChange]);

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <div className="relative">
          <div className="flex items-center">
            <Input
              value={modelInput}
              onChange={(e) => setModelInput(e.target.value)}
              placeholder="输入模型名称..."
              className="w-40 md:w-60 h-9 text-sm pr-8"
              disabled={isLoading}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSubmitModel();
                }
              }}
            />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="w-4 h-4 text-gray-400 absolute right-2" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>直接输入 Ollama 模型名称，例如:</p>
                  <ul className="text-xs mt-1 list-disc pl-4">
                    <li>mistral</li>
                    <li>llama3</li>
                    <li>deepseek-r1:7b</li>
                  </ul>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

        </div>
        <Button 
          size="sm"
          onClick={handleSubmitModel}
          disabled={isLoading || !modelInput.trim()}
          className="h-9"
          title="使用此模型"
        >
          <Search className="h-4 w-4" />
        </Button>
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