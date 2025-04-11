import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { StarredMessage } from '@/services/starStorageService';
import { Star, Trash, Layers } from 'lucide-react';
import { CopyButton } from '@/components/button/CopyButton';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'; 
import { coldarkDark } from 'react-syntax-highlighter/dist/esm/styles/prism'; 
import { ComponentPropsWithoutRef } from 'react';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface StarredMessageDialogProps {
  message: StarredMessage | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete: (id: string) => Promise<void>;
  formatFullTime: (date: Date) => string;
}

export function StarredMessageDialog({
  message,
  isOpen,
  onClose,
  onDelete,
  formatFullTime
}: StarredMessageDialogProps) {
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = React.useState(false);
  
  if (!message) return null;
  
  // Markdown 组件配置，包括代码高亮
  const markdownComponents = {
    code({ inline, className, children, ...props }: ComponentPropsWithoutRef<'code'> & { inline?: boolean }) {
      const match = /language-(\w+)/.exec(className || '');
      return !inline && match ? (
        <div className="relative group">
          <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <CopyButton 
              text={String(children).replace(/\n$/, '')} 
              size="sm" 
              variant="subtle" 
              className="bg-gray-700 hover:bg-gray-600 text-white"
            />
          </div>
          <SyntaxHighlighter
            style={coldarkDark}
            language={match[1]}
            PreTag="div"
            {...props}
          >
            {String(children).replace(/\n$/, '')}
          </SyntaxHighlighter>
        </div>
      ) : (
        <code className={className} {...props}>
          {children}
        </code>
      );
    },
  };
  
  // 处理删除请求
  const handleDeleteRequest = () => {
    setIsDeleteAlertOpen(true);
  };
  
  // 执行删除操作
  const handleConfirmDelete = async () => {
    await onDelete(message.id);
    setIsDeleteAlertOpen(false);
  };

  // 判断是否为集合类型
  const isCollection = message.isCollection || message.role === 'collection';

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader className="pb-2 border-b">
            <DialogTitle className="flex items-center gap-2">
              {isCollection ? (
                <>
                  <Layers className="h-5 w-5 text-purple-500" />
                  <span>收藏集合</span>
                </>
              ) : (
                <>
                  <Star className="h-5 w-5 text-yellow-500" />
                  <span>收藏内容</span>
                </>
              )}
            </DialogTitle>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
              <span className="text-gray-500 dark:text-gray-400">
                收藏于 {formatFullTime(message.starredAt)}
                {isCollection && (
                  <span className="ml-2 text-xs bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full">
                    集合
                  </span>
                )}
              </span>
              <div className="flex gap-2">
                <CopyButton 
                  text={message.mainContent || message.content} 
                  variant="subtle" 
                  size="sm"
                  successText="已复制全部内容"
                />
                <button
                  onClick={handleDeleteRequest}
                  className="h-6 w-6 p-1 rounded-md flex items-center justify-center text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-200"
                  title="删除收藏"
                >
                  <Trash className="h-full w-full" />
                </button>
              </div>
            </div>
            <DialogDescription  />
          </DialogHeader>
          <div className="py-4 flex-1 overflow-y-auto">
            <div className="prose prose-sm dark:prose-invert max-w-full">
              <ReactMarkdown components={markdownComponents} remarkPlugins={[remarkGfm]}>
                {message.mainContent || message.content}
              </ReactMarkdown>
            </div>
          </div>
          <DialogFooter className="pt-2 border-t">
            <Button onClick={onClose} variant="outline">关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* 删除确认对话框 */}
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除这条{isCollection ? "收藏集合" : "收藏消息"}吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-red-600 hover:bg-red-700">
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
} 