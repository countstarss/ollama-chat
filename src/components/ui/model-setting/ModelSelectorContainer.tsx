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
  const {
    getSelectedModel,
    models,
    selectModel,
    updateModelValidation,
    shouldRevalidateModel,
  } = useModelConfig();

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

  // 用于跟踪是否应该显示toast的标志
  const [shouldShowToast, setShouldShowToast] = useState(true);
  
  // 清理effect
  useEffect(() => {
    return () => {
      // 组件卸载时重置状态
      setShouldShowToast(true);
    };
  }, []);

  // 测试选中的模型
  const testSelectedModel = useCallback(
    async (model: any, showToast: boolean = true) => {
      setIsModelReady(false);
      setModelError(null);

      const result = await testModel(model);

      // 更新模型验证状态
      updateModelValidation(model.id, result.isValid);

      if (result.isValid) {
        setIsModelReady(true);
        // 只在需要时显示成功toast
        if (showToast && shouldShowToast) {
          toastService.success("模型已就绪", { 
            duration: 1500 // 1.5秒后自动消失
          });
        }
      } else {
        setModelError(result.error || `模型 ${model.name} 测试失败`);
        // 错误信息始终显示，但时间更短
        toastService.error("模型测试失败", {
          duration: 2500, // 2.5秒后自动消失
          description: result.error
        });
      }
    },
    [testModel, updateModelValidation, shouldShowToast]
  );

  // 初始化当前模型
  useEffect(() => {
    const model = getSelectedModel();
    if (model) {
      setSelectedModelId(model.id);

      // 检查模型是否已验证且不需要重新验证
      if (model.isValidated && !shouldRevalidateModel(model)) {
        console.log(`[ModelSelector] 模型 ${model.name} 已验证，跳过测试`);
        setIsModelReady(true);
        setModelError(null);
        return;
      }

      // 需要测试的情况
      setIsModelReady(false);

      // 自动测试当前选中的模型（跳过未配置的API模型）
      if (!model.isApiModel || (model.isApiModel && model.apiKey)) {
        console.log(`[ModelSelector] 需要验证模型 ${model.name}`);
        // 初始化时不显示toast
        testSelectedModel(model, false);
      } else {
        setModelError("API模型未配置密钥");
        updateModelValidation(model.id, false);
      }
    } else {
      // 没有模型时的处理
      console.log("[ModelSelector] 没有可用的模型");
      setModelError("请先添加模型");
      setIsModelReady(false);
    }
  }, [
    getSelectedModel,
    testSelectedModel,
    shouldRevalidateModel,
    updateModelValidation,
  ]);

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

      // 检查模型是否需要验证
      if (selectedModel.isValidated && !shouldRevalidateModel(selectedModel)) {
        console.log(`[切换模型] 模型 ${selectedModel.name} 已验证，直接使用`);
        setIsModelReady(true);
      } else {
        console.log(`[切换模型] 模型 ${selectedModel.name} 需要验证`);
        // 显示测试中的toast
        const loadingToastId = toastService.loading(`正在测试模型...`, {
          duration: Infinity
        });
        
        // 测试模型是否可用
        await testSelectedModel(selectedModel, true);
        
        // 关闭loading toast
        toastService.dismiss(loadingToastId);
      }

      // 调用父组件回调
      if (onModelChange) {
        console.log(
          `[切换模型] 调用回调并传递 modelId: ${selectedModel.modelId}`
        );
        onModelChange(selectedModel.modelId);
      }
    },
    [
      allModels,
      selectModel,
      testSelectedModel,
      onModelChange,
      shouldRevalidateModel,
    ]
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
                              <div className="flex items-center gap-2">
                                <span className="truncate max-w-[140px]">
                                  {model.name}
                                </span>
                              </div>
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
                              <div className="flex items-center gap-2">
                                <span className="truncate max-w-[140px]">
                                  {model.name}
                                </span>
                                {model.isValidated && (
                                  <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
                                )}
                              </div>
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
