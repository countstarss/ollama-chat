import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { ModelConfig } from '@/hooks/useModelConfig';

interface ApiModelFormProps {
  onSubmit: (model: Partial<ModelConfig>) => void;
  onCancel: () => void;
  initialValues?: ModelConfig;
}

const API_PROVIDERS = [
  { id: 'openai', name: 'OpenAI' },
  { id: 'anthropic', name: 'Anthropic' },
  { id: 'custom', name: '自定义' },
];

export function ApiModelForm({ onSubmit, onCancel, initialValues }: ApiModelFormProps) {
  const [name, setName] = useState(initialValues?.name || '');
  const [apiProvider, setApiProvider] = useState(initialValues?.apiProvider || 'openai');
  const [apiKey, setApiKey] = useState(initialValues?.apiKey || '');
  const [modelId, setModelId] = useState(initialValues?.modelId || '');
  const [apiEndpoint, setApiEndpoint] = useState(initialValues?.apiEndpoint || '');
  const [description, setDescription] = useState(initialValues?.description || '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 是否是自定义API
  const isCustomProvider = apiProvider === 'custom';

  // 根据提供商获取默认端点
  const getDefaultEndpoint = (provider: string) => {
    switch (provider) {
      case 'openai':
        return 'https://api.openai.com/v1/chat/completions';
      case 'anthropic':
        return 'https://api.anthropic.com/v1/messages';
      default:
        return '';
    }
  };

  // 当提供商改变时，更新默认端点
  const handleProviderChange = (provider: string) => {
    setApiProvider(provider);
    if (provider !== 'custom') {
      setApiEndpoint(getDefaultEndpoint(provider));
    }
  };

  // 验证表单
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!name.trim()) {
      newErrors.name = '请输入模型名称';
    }
    
    if (!apiKey.trim()) {
      newErrors.apiKey = '请输入API密钥';
    }
    
    if (!modelId.trim()) {
      newErrors.modelId = '请输入模型ID';
    }
    
    if (isCustomProvider && !apiEndpoint.trim()) {
      newErrors.apiEndpoint = '请输入API端点';
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
        isApiModel: true,
        apiProvider,
        apiKey,
        apiEndpoint: apiEndpoint || getDefaultEndpoint(apiProvider),
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
          placeholder="例如: GPT-4 Turbo"
          className={errors.name ? 'border-red-500' : ''}
        />
        {errors.name && <p className="text-red-500 text-xs">{errors.name}</p>}
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="apiProvider">API提供商</Label>
        <select
          id="apiProvider"
          value={apiProvider}
          onChange={(e) => handleProviderChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
        >
          {API_PROVIDERS.map(provider => (
            <option key={provider.id} value={provider.id}>
              {provider.name}
            </option>
          ))}
        </select>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="apiKey">API密钥</Label>
        <Input 
          id="apiKey"
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="输入API密钥"
          className={errors.apiKey ? 'border-red-500' : ''}
        />
        {errors.apiKey && <p className="text-red-500 text-xs">{errors.apiKey}</p>}
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="modelId">模型ID</Label>
        <Input 
          id="modelId"
          value={modelId}
          onChange={(e) => setModelId(e.target.value)}
          placeholder={apiProvider === 'openai' ? 'gpt-4-turbo-preview' : 'claude-3-opus-20240229'}
          className={errors.modelId ? 'border-red-500' : ''}
        />
        {errors.modelId && <p className="text-red-500 text-xs">{errors.modelId}</p>}
        <p className="text-xs text-gray-500 dark:text-gray-400">
          这是API调用时使用的模型标识符
        </p>
      </div>
      
      {isCustomProvider && (
        <div className="space-y-2">
          <Label htmlFor="apiEndpoint">API端点</Label>
          <Input 
            id="apiEndpoint"
            value={apiEndpoint}
            onChange={(e) => setApiEndpoint(e.target.value)}
            placeholder="https://api.example.com/v1/chat"
            className={errors.apiEndpoint ? 'border-red-500' : ''}
          />
          {errors.apiEndpoint && <p className="text-red-500 text-xs">{errors.apiEndpoint}</p>}
        </div>
      )}
      
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
        <Button type="submit">
          {initialValues ? '更新模型' : '添加模型'}
        </Button>
      </div>
    </form>
  );
} 