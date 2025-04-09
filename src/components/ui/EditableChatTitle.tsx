import React, { useState, useEffect } from 'react';
import { Check, X, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface EditableChatTitleProps {
  title: string;
  onRename: (newTitle: string) => void;
  className?: string;
}

export function EditableChatTitle({ 
  title, 
  onRename, 
  className = '' 
}: EditableChatTitleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(title || "未命名聊天");
  
  // 当外部标题变化时更新内部状态
  useEffect(() => {
    // 确保有默认值，避免空标题
    setEditedTitle(title || "未命名聊天");
    // 如果进入编辑状态时标题变化了，退出编辑状态
    if (isEditing) {
      setIsEditing(false);
    }
  }, [title]);
  
  // 处理开始编辑
  const handleStartEditing = () => {
    setIsEditing(true);
    setEditedTitle(title || "未命名聊天");
  };
  
  // 处理保存
  const handleSave = () => {
    const trimmedTitle = editedTitle.trim();
    if (trimmedTitle) {
      onRename(trimmedTitle);
    } else {
      // 如果用户输入空标题，自动重置为"未命名聊天"
      setEditedTitle("未命名聊天");
      onRename("未命名聊天");
    }
    setIsEditing(false);
  };
  
  // 处理取消
  const handleCancel = () => {
    setIsEditing(false);
    setEditedTitle(title || "未命名聊天");
  };
  
  // 处理输入变化
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditedTitle(e.target.value);
  };
  
  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {isEditing ? (
        <div className="flex items-center gap-1">
          <Input
            value={editedTitle}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            autoFocus
            className="h-8 text-lg font-semibold max-w-[180px] sm:max-w-[250px]"
            placeholder="输入聊天名称..."
          />
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleSave} 
            className="h-7 w-7 text-green-500"
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleCancel}
            className="h-7 w-7 text-red-500"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-1 group">
          <h1 className="text-xl font-semibold">{title || "未命名聊天"}</h1>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleStartEditing}
            className="h-7 w-7 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
} 