import React from 'react';

export const SkeletonCard: React.FC = () => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3 animate-pulse">
      <div className="flex flex-col gap-2">
        {/* 模拟标题 */}
        <div className="flex items-center justify-between">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-[40%]"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-[20%]"></div>
        </div>
        
        {/* 模拟内容 */}
        <div className="space-y-2 mt-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-[90%]"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-[70%]"></div>
        </div>
        
        {/* 模拟按钮区域 */}
        <div className="flex justify-end gap-2 pt-2">
          <div className="h-5 w-5 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
          <div className="h-5 w-5 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
          <div className="h-5 w-5 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
        </div>
      </div>
    </div>
  );
}; 