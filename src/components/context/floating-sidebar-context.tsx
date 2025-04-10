"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

type FloatingSidebarContextType = {
  isFloatingSidebarVisible: boolean;
  toggleFloatingSidebar: () => void;
  showFloatingSidebar: () => void;
  hideFloatingSidebar: () => void;
};

const FloatingSidebarContext = createContext<FloatingSidebarContextType | undefined>(undefined);

export function FloatingSidebarProvider({ children }: { children: React.ReactNode }) {
  // 默认从localStorage中读取状态，如果没有则默认为true（显示）
  const [isFloatingSidebarVisible, setIsFloatingSidebarVisible] = useState<boolean>(true);
  
  // 组件加载时从localStorage读取状态
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedState = localStorage.getItem('floating-sidebar-visible');
      if (savedState !== null) {
        setIsFloatingSidebarVisible(savedState === 'true');
      }
    }
  }, []);
  
  // 保存状态到localStorage
  const saveToLocalStorage = useCallback((isVisible: boolean) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('floating-sidebar-visible', String(isVisible));
    }
  }, []);

  // 切换侧边栏显示状态
  const toggleFloatingSidebar = useCallback(() => {
    setIsFloatingSidebarVisible(prev => {
      const newState = !prev;
      saveToLocalStorage(newState);
      return newState;
    });
  }, [saveToLocalStorage]);
  
  // 显示侧边栏
  const showFloatingSidebar = useCallback(() => {
    setIsFloatingSidebarVisible(true);
    saveToLocalStorage(true);
  }, [saveToLocalStorage]);
  
  // 隐藏侧边栏
  const hideFloatingSidebar = useCallback(() => {
    setIsFloatingSidebarVisible(false);
    saveToLocalStorage(false);
  }, [saveToLocalStorage]);

  return (
    <FloatingSidebarContext.Provider 
      value={{ 
        isFloatingSidebarVisible, 
        toggleFloatingSidebar,
        showFloatingSidebar,
        hideFloatingSidebar
      }}
    >
      {children}
    </FloatingSidebarContext.Provider>
  );
}

export function useFloatingSidebar() {
  const context = useContext(FloatingSidebarContext);
  if (context === undefined) {
    throw new Error('useFloatingSidebar must be used within a FloatingSidebarProvider');
  }
  return context;
} 