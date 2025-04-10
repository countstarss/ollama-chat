'use client';

import React, { useState, useEffect } from 'react';
import { useModelConfig, ModelConfig } from '@/hooks/useModelConfig';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Database, Globe } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { LocalModelForm } from '@/components/model/LocalModelForm';
import { ApiModelForm } from '@/components/model/ApiModelForm';

// 导入新组件
import { ModelTable } from './ModelTable';
import { TabHeader } from './TabHeader';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function Models() {
  const [activeTab, setActiveTab] = useState<string>('local');
  const { models, addModel, updateModel, deleteModel, forceLocalStorageSave } = useModelConfig();
  
  // 本地 & API模型
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

  // MARK:  local model
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

  // MARK: API model
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

  // MARK: Close modal
  const handleCloseModal = () => {
    setShowAddLocalModal(false);
    setShowAddApiModal(false);
    setEditingModel(null);
  };

  // MARK: Edit model
  const handleEditModel = (model: ModelConfig) => {
    setEditingModel(model);
    if (model.isApiModel) {
      setShowAddApiModal(true);
    } else {
      setShowAddLocalModal(true);
    }
  };

  // MARK: Delete model
  const handleDeleteModel = (id: string) => {
    console.log(`[ModelsPage] 删除模型: ${id}`);
    deleteModel(id);
    // 删除后强制保存
    setTimeout(() => forceLocalStorageSave(), 100);
  };

  // MARK: Add local
  const handleAddLocalModel = () => {
    setEditingModel(null);
    setShowAddLocalModal(true);
  };

  // MARK: Add API
  const handleAddApiModel = () => {
    setEditingModel(null);
    setShowAddApiModal(true);
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
      { activeTab === 'local' && <div className='hidden' />}
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
        
        <TabsContent value="local">
          <TabHeader 
            title="本地Ollama模型" 
            buttonText="添加本地模型"
            onAddClick={handleAddLocalModel}
          />
          
          <ModelTable 
            models={localModels}
            isApiModel={false}
            onEdit={handleEditModel}
            onDelete={handleDeleteModel}
          />
        </TabsContent>
        
        <TabsContent value="api">
          <TabHeader 
            title="API模型配置" 
            buttonText="添加API模型"
            onAddClick={handleAddApiModel}
          />
          
          <ModelTable 
            models={apiModels}
            isApiModel={true}
            onEdit={handleEditModel}
            onDelete={handleDeleteModel}
          />
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
