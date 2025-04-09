import { useState } from 'react';
import { Settings } from 'lucide-react';
import { ModelSettings } from '@/components/ui/model-setting/ModelSettings';
import { useModelSettings } from '@/hooks/useModelSettings';

interface ModelSettingsButtonProps {
  isLoading?: boolean;
}

export function ModelSettingsButton({ isLoading }: ModelSettingsButtonProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { modelSettings, saveSettings } = useModelSettings();

  return (
    <>
      {/* 设置按钮 */}
      <button
        onClick={() => setIsSettingsOpen(true)}
        className="p-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-md transition-colors"
        disabled={isLoading}
        title="模型参数设置"
      >
        <Settings className="w-5 h-5 text-gray-600 dark:text-gray-300" />
      </button>
      
      {/* 模型设置对话框 */}
      <ModelSettings
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={modelSettings}
        onSave={saveSettings}
      />
    </>
  );
} 