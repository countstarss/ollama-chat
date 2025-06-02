import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ModelConfig } from "@/hooks/useModelConfig";

interface LocalModelFormProps {
  onSubmit: (model: Partial<ModelConfig>) => void;
  onCancel: () => void;
  initialValues?: ModelConfig;
}

export function LocalModelForm({
  onSubmit,
  onCancel,
  initialValues,
}: LocalModelFormProps) {
  const [name, setName] = useState(initialValues?.name || "");
  const [modelId, setModelId] = useState(initialValues?.modelId || "");
  const [description, setDescription] = useState(
    initialValues?.description || ""
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 验证表单
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = "请输入模型名称";
    }

    if (!modelId.trim()) {
      newErrors.modelId = "请输入模型ID";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 处理提交
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
      onSubmit({
        name,
        modelId,
        description,
        isApiModel: false,
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">模型名称</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例如: DeepSeek 7B"
          className={errors.name ? "border-red-500" : ""}
        />
        {errors.name && <p className="text-red-500 text-xs">{errors.name}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="modelId">模型ID</Label>
        <Input
          id="modelId"
          value={modelId}
          onChange={(e) => setModelId(e.target.value)}
          placeholder="例如: deepseek-r1:7b, llama3"
          className={errors.modelId ? "border-red-500" : ""}
        />
        {errors.modelId && (
          <p className="text-red-500 text-xs">{errors.modelId}</p>
        )}
        <p className="text-xs text-gray-500 dark:text-gray-400">
          这是调用Ollama API时使用的模型标识符
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">描述（可选）</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="简要描述模型的特点、使用场景等"
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          取消
        </Button>
        <Button type="submit">{initialValues ? "更新模型" : "添加模型"}</Button>
      </div>
    </form>
  );
}
