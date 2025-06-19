import { useState, useCallback, useEffect } from "react";
import { useModelConfig } from "@/hooks/useModelConfig";
import { useModelTest } from "@/hooks/useModelTest";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import toastService from "@/services/toastService";

interface ModelSelectorContainerProps {
  isLoading: boolean;
  onModelChange?: (modelId: string) => void;
  isModelReady?: boolean; // 是否模型已就绪
}

export function ModelSelectorContainer({
  isLoading,
  onModelChange,
  isModelReady: externalModelReady,
}: ModelSelectorContainerProps) {
  const [modelError, setModelError] = useState<string | null>(null);
  const [isModelReady, setIsModelReady] = useState(false);

  // 使用模型配置hook
  const { getSelectedModel, models, selectModel } = useModelConfig();

  // 使用模型测试hook
  const { testModel, isTestingModel } = useModelTest();

  // 获取所有模型（包括本地和API模型）
  const allModels = models;

  // 当前选中的模型ID
  const [selectedModelId, setSelectedModelId] = useState<string>("");

  // 使用父组件传入的 isModelReady 状态
  useEffect(() => {
    if (externalModelReady !== undefined && !isTestingModel) {
      setIsModelReady(externalModelReady);
    }
  }, [externalModelReady, isTestingModel]);

  // 测试选中的模型
  const testSelectedModel = useCallback(
    async (model: any) => {
      setIsModelReady(false);
      setModelError(null);

      toastService.info(`正在测试模型 ${model.name}...`);

      const result = await testModel(model);

      if (result.isValid) {
        setIsModelReady(true);
        toastService.success(
          `模型 ${model.name} 测试成功！${
            result.responseTime ? ` (${result.responseTime}ms)` : ""
          }`
        );
      } else {
        setModelError(result.error || `模型 ${model.name} 测试失败`);
        toastService.error(result.error || `模型 ${model.name} 测试失败`);
      }
    },
    [testModel]
  );

  // 初始化当前模型
  useEffect(() => {
    const model = getSelectedModel();
    if (model) {
      setSelectedModelId(model.id);
      // 初始化时不自动设置为ready，需要测试后才能确认
      setIsModelReady(false);
      // 自动测试当前选中的模型（跳过未配置的API模型）
      if (!model.isApiModel || (model.isApiModel && model.apiKey)) {
        testSelectedModel(model);
      } else {
        setModelError("API模型未配置密钥");
      }
    } else {
      // 没有模型时的处理
      console.log("[ModelSelector] 没有可用的模型");
      setModelError("请先添加模型");
      setIsModelReady(false);
    }
  }, [getSelectedModel, testSelectedModel]);

  // 处理模型选择变更
  const handleModelSelect = useCallback(
    async (modelId: string) => {
      // 找到对应的模型配置
      const selectedModel = allModels.find((m) => m.id === modelId);
      if (!selectedModel) {
        setModelError("未找到选中的模型");
        return;
      }

      setSelectedModelId(modelId);
      setModelError(null);

      // 保存选中的模型到localStorage
      selectModel(modelId);

      // 测试模型是否可用
      await testSelectedModel(selectedModel);

      // 调用父组件回调
      if (onModelChange) {
        console.log(
          `[切换模型] 调用回调并传递 modelId: ${selectedModel.modelId}`
        );
        onModelChange(selectedModel.modelId);
      }
    },
    [allModels, selectModel, testSelectedModel, onModelChange]
  );

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
                isModelReady &&
                  !isTestingModel &&
                  "border-green-500/50 ring-1 ring-green-500/20",
                modelError && "border-red-500/50 ring-1 ring-red-500/20"
              )}
            >
              <div className="flex items-center gap-2 truncate">
                <SelectValue placeholder="选择模型" />
                {isTestingModel ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Loader2 className="h-4 w-4 text-blue-500 ml-1 animate-spin shrink-0" />
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        <p>正在测试模型...</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : isModelReady ? (
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
                ) : modelError ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <AlertCircle className="h-4 w-4 text-red-500 ml-1 shrink-0" />
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        <p>模型不可用</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : null}
              </div>
            </SelectTrigger>
            <SelectContent>
              {allModels.length > 0 ? (
                <>
                  {/* 本地模型分组 */}
                  {allModels.filter((m) => !m.isApiModel).length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-gray-500">
                        本地模型
                      </div>
                      {allModels
                        .filter((m) => !m.isApiModel)
                        .map((model) => (
                          <SelectItem
                            key={model.id}
                            value={model.id}
                            className={cn(
                              "truncate pr-6",
                              selectedModelId === model.id && "font-medium"
                            )}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span className="truncate max-w-[180px]">
                                {model.name}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                    </>
                  )}

                  {/* API模型分组 */}
                  {allModels.filter((m) => m.isApiModel).length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 mt-2">
                        API 模型
                      </div>
                      {allModels
                        .filter((m) => m.isApiModel)
                        .map((model) => (
                          <SelectItem
                            key={model.id}
                            value={model.id}
                            className={cn(
                              "truncate pr-6",
                              selectedModelId === model.id && "font-medium"
                            )}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span className="truncate max-w-[180px]">
                                {model.name}
                              </span>
                              <span className="text-xs text-gray-500 ml-2">
                                {model.apiProvider}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                    </>
                  )}
                </>
              ) : (
                <div className="px-2 py-2 text-sm text-gray-500">
                  没有可用的模型
                </div>
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
    </div>
  );
}

// 导出相关方法以供外部使用
export { useModelConfig };
