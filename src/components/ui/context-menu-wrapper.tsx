import React from 'react';
import { ContextMenu, ContextMenuTrigger } from '../ui/context-menu';

interface ContextMenuWrapperProps {
  // You can define any props needed here
  children: React.ReactNode;
}

const ContextMenuWrapper = ({ 
    children,
}: ContextMenuWrapperProps) => {
  
  return (
    <ContextMenu>
      <ContextMenuTrigger>
        {children}
      </ContextMenuTrigger>
    </ContextMenu>
  );
};

export default ContextMenuWrapper;