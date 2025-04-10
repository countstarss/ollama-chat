import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface TabHeaderProps {
  title: string;
  buttonText: string;
  onAddClick: () => void;
}

export function TabHeader({ title, buttonText, onAddClick }: TabHeaderProps) {
  return (
    <div className="mb-4 flex justify-between items-center">
      <h2 className="text-xl font-semibold">{title}</h2>
      <Button 
        variant="default" 
        className="flex items-center gap-2"
        onClick={onAddClick}
      >
        <Plus className="h-4 w-4" />
        <span>{buttonText}</span>
      </Button>
    </div>
  );
} 