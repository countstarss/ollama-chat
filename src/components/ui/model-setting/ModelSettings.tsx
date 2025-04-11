'use client';

import React, { useState, useEffect } from 'react';
import { X, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ModelSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ModelSettingsData;
  onSave: (settings: ModelSettingsData) => void;
}

export interface ModelSettingsData {
  temperature: number;
  topP: number;
  topK: number;
  maxTokens: number;
  presencePenalty: number;
  frequencyPenalty: number;
}

export const DEFAULT_SETTINGS: ModelSettingsData = {
  temperature: 0.7,
  topP: 0.9,
  topK: 40,
  maxTokens: 2048,
  presencePenalty: 0,
  frequencyPenalty: 0
};

export const ModelSettings: React.FC<ModelSettingsProps> = ({
  isOpen,
  onClose,
  settings,
  onSave
}) => {
  const [formData, setFormData] = useState<ModelSettingsData>(settings);
  
  // 当对话框打开或设置变更时重置表单
  useEffect(() => {
    if (isOpen) {
      setFormData(settings);
    }
  }, [isOpen, settings]);
  
  // 处理表单提交
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };
  
  // 处理数值字段变更
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let numValue = parseFloat(value);
    
    // 验证各字段的范围
    if (name === 'temperature') {
      numValue = Math.min(Math.max(numValue, 0), 2);
    } else if (name === 'topP' || name === 'presencePenalty' || name === 'frequencyPenalty') {
      numValue = Math.min(Math.max(numValue, 0), 1);
    } else if (name === 'topK') {
      numValue = Math.min(Math.max(Math.round(numValue), 1), 100);
    } else if (name === 'maxTokens') {
      numValue = Math.min(Math.max(Math.round(numValue), 16), 8192);
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: numValue
    }));
  };
  
  // 恢复默认设置
  const resetToDefault = () => {
    setFormData(DEFAULT_SETTINGS);
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            模型参数设置
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4">
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="temperature" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  温度 (Temperature)
                </label>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {formData.temperature.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                id="temperature"
                name="temperature"
                min="0"
                max="2"
                step="0.01"
                value={formData.temperature}
                onChange={handleChange}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                控制输出的随机性：较低值使输出更加确定性和连贯，较高值增加创造性和多样性。
              </p>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="topP" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Top P (核心采样)
                </label>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {formData.topP.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                id="topP"
                name="topP"
                min="0"
                max="1"
                step="0.01"
                value={formData.topP}
                onChange={handleChange}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                只考虑最可能的token，累积概率达到P值时停止。较低的值使输出更集中和确定性。
              </p>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="topK" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Top K
                </label>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {formData.topK}
                </span>
              </div>
              <input
                type="range"
                id="topK"
                name="topK"
                min="1"
                max="100"
                step="1"
                value={formData.topK}
                onChange={handleChange}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                仅从K个最可能的token中采样。较低的值提高输出一致性，较高的值增加多样性。
              </p>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="maxTokens" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  最大Token数
                </label>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {formData.maxTokens}
                </span>
              </div>
              <input
                type="range"
                id="maxTokens"
                name="maxTokens"
                min="16"
                max="8192"
                step="16"
                value={formData.maxTokens}
                onChange={handleChange}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                限制模型生成的最大token数量，防止过长回复。较大值允许更长的回复。
              </p>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="presencePenalty" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  存在惩罚 (Presence Penalty)
                </label>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {formData.presencePenalty.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                id="presencePenalty"
                name="presencePenalty"
                min="0"
                max="1"
                step="0.01"
                value={formData.presencePenalty}
                onChange={handleChange}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                对已出现过的token进行惩罚，增加模型讨论新主题的可能性。
              </p>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="frequencyPenalty" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  频率惩罚 (Frequency Penalty)
                </label>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {formData.frequencyPenalty.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                id="frequencyPenalty"
                name="frequencyPenalty"
                min="0"
                max="1"
                step="0.01"
                value={formData.frequencyPenalty}
                onChange={handleChange}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                根据频率对token进行惩罚，减少重复的句子和短语。
              </p>
            </div>
          </div>
          
          <div className="mt-6 flex justify-between">
            <button
              type="button"
              onClick={resetToDefault}
              className="flex items-center gap-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <RotateCcw className="w-4 h-4" />
              <span>恢复默认</span>
            </button>
            
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                取消
              </button>
              <button
                type="submit"
                className={cn(
                  "px-4 py-2 rounded-md shadow-sm text-sm font-medium text-white",
                  "bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                )}
              >
                保存
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}; 