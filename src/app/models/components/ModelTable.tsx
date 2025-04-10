import React from 'react';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';
import { ModelConfig } from '@/hooks/useModelConfig';

interface ModelTableProps {
  models: ModelConfig[];
  isApiModel: boolean;
  onEdit: (model: ModelConfig) => void;
  onDelete: (id: string) => void;
}

export function ModelTable({ models, isApiModel, onEdit, onDelete }: ModelTableProps) {
  if (models.length === 0) {
    return (
      <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-6 text-center">
        <p className="text-gray-500 dark:text-gray-400">
          暂无{isApiModel ? 'API' : '本地'}模型配置，点击上方按钮添加
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              模型名称
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              {isApiModel ? '提供商' : '模型ID'}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              {isApiModel ? '模型类型' : '描述'}
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              操作
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {models.map((model) => (
            <tr key={model.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                {model.name}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                {isApiModel ? (model.apiProvider || '未知') : model.modelId}
              </td>
              <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 truncate max-w-[300px]">
                {isApiModel ? model.modelId : (model.description || '无描述')}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-blue-600 dark:text-blue-400 mr-2"
                  onClick={() => onEdit(model)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 dark:text-red-400"
                  onClick={() => onDelete(model.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 