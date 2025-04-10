'use client';

import React, { useState, useEffect } from 'react';
import { useModelConfig, ModelConfig } from '@/hooks/useModelConfig';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Database, Globe, Plus, Pencil, Trash2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Modal } from '@/components/ui/modal';
import { LocalModelForm } from '@/components/model/LocalModelForm';
import { ApiModelForm } from '@/components/model/ApiModelForm';

export default function ModelsPage() {
  const [activeTab, setActiveTab] = useState<string>('local');
  const { models, addModel, updateModel, deleteModel, forceLocalStorageSave } = useModelConfig();
  
  // MARK: 本地 & API模型
  const localModels = models.filter(model => !model.isApiModel);
  const apiModels = models.filter(model => model.isApiModel);
  
  // 状态控制模态框的显示
  const [showAddLocalModal, setShowAddLocalModal] = useState(false);
  const [showAddApiModal, setShowAddApiModal] = useState(false);
  const [editingModel, setEditingModel] = useState<ModelConfig | null>(null);

  // 确保在页面离开前保存状态
  useEffect(() => {
    // 组件挂载时记录日志
    console.log("[ModelsPage] 组件已挂载");
    
    // 组件卸载前执行forceLocalStorageSave
    return () => {
      console.log("[ModelsPage] 组件即将卸载，强制保存模型配置");
      forceLocalStorageSave();
    };
  }, [forceLocalStorageSave]);

  // MARK: 添加或更新 Local
  const handleSubmitLocalModel = (model: Partial<ModelConfig>) => {
    if (editingModel) {
      console.log(`[ModelsPage] 更新本地模型: ${editingModel.id}`);
      updateModel(editingModel.id, model);
      setEditingModel(null);
    } else {
      console.log(`[ModelsPage] 添加新本地模型: ${model.name}`);
      addModel(model as Omit<ModelConfig, "id">);
    }
    
    // 操作完成后强制保存一次
    setTimeout(() => forceLocalStorageSave(), 100);
    setShowAddLocalModal(false);
  };

  // MARK: 添加或更新 API
  const handleSubmitApiModel = (model: Partial<ModelConfig>) => {
    if (editingModel) {
      console.log(`[ModelsPage] 更新API模型: ${editingModel.id}`);
      updateModel(editingModel.id, model);
      setEditingModel(null);
    } else {
      console.log(`[ModelsPage] 添加新API模型: ${model.name}`);
      addModel(model as Omit<ModelConfig, "id">);
    }
    
    // 操作完成后强制保存一次
    setTimeout(() => forceLocalStorageSave(), 100);
    setShowAddApiModal(false);
  };

  // MARK: 关闭模态框
  const handleCloseModal = () => {
    setShowAddLocalModal(false);
    setShowAddApiModal(false);
    setEditingModel(null);
  };

  // 处理删除模型
  const handleDeleteModel = (id: string) => {
    console.log(`[ModelsPage] 删除模型: ${id}`);
    deleteModel(id);
    // 删除后强制保存
    setTimeout(() => forceLocalStorageSave(), 100);
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center mb-6">
        <Link href="/" className="mr-4">
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            <span>返回聊天</span>
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">模型管理</h1>
      </div>
      
      <Tabs defaultValue="local" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="local" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            <span>本地模型</span>
          </TabsTrigger>
          <TabsTrigger value="api" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            <span>API模型</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent 
          // MARK: Local models
          value="local"
        >
          <div className="mb-4 flex justify-between items-center">
            <h2 className="text-xl font-semibold">本地Ollama模型</h2>
            <Button 
              variant="default" 
              className="flex items-center gap-2"
              onClick={() => {
                setEditingModel(null);
                setShowAddLocalModal(true);
              }}
            >
              <Plus className="h-4 w-4" />
              <span>添加本地模型</span>
            </Button>
          </div>
          
          {localModels.length === 0 ? (
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-6 text-center">
              <p className="text-gray-500 dark:text-gray-400">暂无本地模型配置，点击上方按钮添加</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">模型名称</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">模型ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">描述</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {localModels.map((model) => (
                    <tr key={model.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{model.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{model.modelId}</td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 truncate max-w-[300px]">{model.description || '无描述'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-blue-600 dark:text-blue-400 mr-2"
                          onClick={() => {
                            setEditingModel(model);
                            setShowAddLocalModal(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-red-600 dark:text-red-400"
                          onClick={() => handleDeleteModel(model.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
        
        <TabsContent 
          // MARK: API models
          value="api"
        >
          <div className="mb-4 flex justify-between items-center">
            <h2 className="text-xl font-semibold">API模型配置</h2>
            <Button 
              variant="default" 
              className="flex items-center gap-2"
              onClick={() => {
                setEditingModel(null);
                setShowAddApiModal(true);
              }}
            >
              <Plus className="h-4 w-4" />
              <span>添加API模型</span>
            </Button>
          </div>
          
          {apiModels.length === 0 ? (
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-6 text-center">
              <p className="text-gray-500 dark:text-gray-400">暂无API模型配置，点击上方按钮添加</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">模型名称</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">提供商</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">模型类型</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {apiModels.map((model) => (
                    <tr key={model.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{model.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{model.apiProvider || '未知'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{model.modelId}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-blue-600 dark:text-blue-400 mr-2"
                          onClick={() => {
                            setEditingModel(model);
                            setShowAddApiModal(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-red-600 dark:text-red-400"
                          onClick={() => handleDeleteModel(model.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* 本地模型表单模态框 */}
      <Modal 
        isOpen={showAddLocalModal} 
        onClose={handleCloseModal}
        title={editingModel ? "编辑本地模型" : "添加本地模型"}
      >
        <LocalModelForm 
          onSubmit={handleSubmitLocalModel}
          onCancel={handleCloseModal}
          initialValues={editingModel || undefined}
        />
      </Modal>
      
      {/* API模型表单模态框 */}
      <Modal 
        isOpen={showAddApiModal} 
        onClose={handleCloseModal}
        title={editingModel ? "编辑API模型" : "添加API模型"}
      >
        <ApiModelForm 
          onSubmit={handleSubmitApiModel}
          onCancel={handleCloseModal}
          initialValues={editingModel || undefined}
        />
      </Modal>
    </div>
  );
}
