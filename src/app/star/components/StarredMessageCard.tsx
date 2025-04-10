import React from 'react';
import { StarredMessage } from '@/services/starStorage';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { CopyButton } from '@/components/button/CopyButton';
import { Star, Trash } from 'lucide-react';

interface StarredMessageCardProps {
  message: StarredMessage;
  onClick: () => void;
  onDelete: () => void;
  formatTime: (timestamp: number) => string;
}

export function StarredMessageCard({
  message,
  onClick,
  onDelete,
  formatTime
}: StarredMessageCardProps) {
  return (
    <Card key={message.id} className="overflow-hidden">
      <CardHeader className="bg-gray-50 dark:bg-gray-800 px-4 py-3 flex flex-row justify-between items-center">
        <div className="flex items-center">
          <Star className="h-4 w-4 text-yellow-500 mr-2" />
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {formatTime(message.createdAt)}
          </span>
        </div>
        <div className="flex gap-2">
          <CopyButton 
            text={message.content} 
            variant="outline" 
            size="sm"
            className="text-gray-400"
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="h-6 w-6 p-1 rounded-md flex items-center justify-center text-red-500 hover:text-red-600 transition-colors duration-200"
            title="删除收藏"
          >
            <Trash className="h-full w-full" />
          </button>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="whitespace-pre-wrap">
          {message.content.length > 300
            ? `${message.content.substring(0, 300)}...`
            : message.content}
        </div>
      </CardContent>
      {message.content.length > 300 && (
        <CardFooter className="flex justify-end p-4 pt-0">
          <button 
            className="text-blue-500 hover:text-blue-600 text-sm font-medium"
            onClick={() => onClick()}
          >
            查看更多
          </button>
        </CardFooter>
      )}
    </Card>
  );
} 