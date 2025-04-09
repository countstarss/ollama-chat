import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { MessageSquare, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

export interface SidebarRecentItemProps {
  id: string;
  label: string;
  isActive?: boolean;
  onClick?: () => void;
  onRename?: (id: string, newName: string) => void;
  onDelete?: (id: string) => void;
}

export function SidebarRecentItem({ 
  id, 
  label, 
  isActive, 
  onClick, 
  onRename,
  onDelete 
}: SidebarRecentItemProps) {
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [newName, setNewName] = useState(label);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const handleRename = () => {
    if (onRename && newName.trim()) {
      onRename(id, newName.trim());
      setIsRenameDialogOpen(false);
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(id);
      setIsDeleteDialogOpen(false);
    }
  };

  return (
    <>
      <div
        className={cn(
          "flex items-center justify-between w-[calc(100%-1rem)] p-2 rounded-md transition-colors ml-4",
          isActive 
            ? "bg-accent text-accent-foreground" 
            : "hover:bg-accent/50 hover:text-accent-foreground"
        )}
      >
        <button
          className="flex items-center gap-2 text-sm w-full text-left overflow-hidden"
          onClick={onClick}
        >
          <MessageSquare className="h-4 w-4 shrink-0" />
          <span className="truncate">{label}</span>
        </button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 hover:opacity-100 focus:opacity-100"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setIsRenameDialogOpen(true)}>
              <Pencil className="mr-2 h-4 w-4" />
              <span>重命名</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-destructive focus:text-destructive"
              onClick={() => setIsDeleteDialogOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              <span>删除</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* 重命名对话框 */}
      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>重命名对话</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewName(e.target.value)}
              placeholder="对话名称"
              className="w-full"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRenameDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleRename}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>删除对话</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>你确定要删除这个对话吗？此操作无法撤销。</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleDelete}>删除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
} 