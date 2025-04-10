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
import { StarredMessage } from '@/services/starStorage';
import { Star, Trash } from 'lucide-react';
import { CopyButton } from '@/components/button/CopyButton';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'; 
import { coldarkDark } from 'react-syntax-highlighter/dist/esm/styles/prism'; 

interface StarredMessageDialogProps {
  message: StarredMessage | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete: (id: string) => Promise<void>;
  formatFullTime: (timestamp: number) => string;
}

export function StarredMessageDialog({
  message,
  isOpen,
  onClose,
  onDelete,
  formatFullTime
}: StarredMessageDialogProps) {
  if (!message) return null;
  
  // Markdown 组件配置，包括代码高亮
  const markdownComponents = {
    code({ inline, className, children, ...props }: any) {
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
            style={coldarkDark} // 使用导入的主题
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-2 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            <span>收藏内容</span>
          </DialogTitle>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
            <span className="text-gray-500 dark:text-gray-400">
              收藏于 {formatFullTime(message.createdAt)}
            </span>
            <div className="flex gap-2">
              <CopyButton 
                text={message.content} 
                variant="subtle" 
                size="sm"
                successText="已复制全部内容"
              />
              <button
                onClick={() => onDelete(message.id)}
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
            <ReactMarkdown 
              components={markdownComponents} 
              remarkPlugins={[remarkGfm]}
            >
              {message.content || ''}
            </ReactMarkdown>
          </div>
        </div>
        <DialogFooter className="pt-2 border-t">
          <Button onClick={onClose} variant="outline">关闭</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 