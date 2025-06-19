import React, {
  useState,
  useEffect,
  useRef,
  ComponentPropsWithoutRef,
} from "react";
import { ChatMessage as ChatMessageType } from "@/lib/types";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { coldarkDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { CopyButton } from "../button/CopyButton";
import { useFloatingSidebar } from "@/components/context/floating-sidebar-context";
import { StarButton } from "../button/StarButton";
import { useSelectionStore } from "@/store/useSelectionStore";
import { CheckCircle2 } from "lucide-react";
import { LoadingDots } from "../ui/LoadingDots";

// 扩展消息类型以包含思考过程
export interface DisplayMessage extends ChatMessageType {
  thinkContent?: string;
  isThinkingComplete?: boolean;
  mainContent?: string; // 用于流式接收
  summary?: string; // 消息摘要
  isMarked?: boolean; // 是否被标记
  isStarred?: boolean; // 是否被收藏
  createdAt?: number; // 创建时间
  chatId?: string; // 消息所属聊天ID
  // NOTE: RAG 相关字段
  sources?: Array<{
    fileName: string;
    chunkIndex: number;
    score: number;
    content: string;
  }>;
  isRagMessage?: boolean; // 是否为 RAG 生成的消息
  libraryId?: string; // 所属知识库ID (RAG)
}

interface ChatMessageProps {
  message: DisplayMessage;
  isActive?: boolean;
  onInView?: (isInView: boolean, message: DisplayMessage) => void;
  mode?: "chat" | "rag";
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  isActive = false,
  onInView,
  mode = "chat",
}) => {
  const [isThinkingExpanded, setIsThinkingExpanded] = useState(true);
  const [messageStarred, setMessageStarred] = useState(false);
  const messageRef = useRef<HTMLDivElement>(null);
  const [hasBeenInView, setHasBeenInView] = useState(false);

  // 使用FloatingSidebar状态钩子
  const { isFloatingSidebarVisible } = useFloatingSidebar();
  // console.log("message", message);

  // 使用Selection Store
  const {
    isSelectionMode,
    autoSelectEnabled,
    isSelected,
    addToSelection,
    toggleMessageSelection,
  } = useSelectionStore();

  // 初始化收藏状态
  useEffect(() => {
    if (message.isStarred !== undefined) {
      setMessageStarred(message.isStarred);
    }
  }, [message.isStarred]);

  // MARK: 自动折叠思考内容
  useEffect(() => {
    if (message.isThinkingComplete) {
      setIsThinkingExpanded(false);
    }
  }, [message.isThinkingComplete]);

  // MARK: 检测是否在视口中
  // NOTE: 使用Intersection Observer API检测消息是否在视口中
  useEffect(() => {
    if (!onInView || !messageRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          onInView(true, message);

          // 如果处于选择模式且启用了自动选择，并且消息之前未被视图捕获过
          if (isSelectionMode && autoSelectEnabled && !hasBeenInView) {
            setHasBeenInView(true);
            addToSelection(message);
          }
        } else {
          onInView(false, message);
        }
      },
      {
        threshold: 0.5, // 当50%的元素可见时触发
        rootMargin: "0px",
      }
    );

    observer.observe(messageRef.current);

    return () => {
      observer.disconnect();
    };
  }, [
    message,
    onInView,
    isSelectionMode,
    autoSelectEnabled,
    hasBeenInView,
    addToSelection,
  ]);

  // MARK: 高亮动画效果
  useEffect(() => {
    if (isActive && messageRef.current) {
      // 添加高亮效果
      messageRef.current.classList.add("message-highlight");

      // 1.5秒后移除动画效果
      const timer = setTimeout(() => {
        if (messageRef.current) {
          messageRef.current.classList.remove("message-highlight");
        }
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [isActive]);

  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";
  const isError = message.role === "error";
  const messageIsSelected = isSelected(message.id);

  // 处理消息点击
  const handleMessageClick = () => {
    if (isSelectionMode) {
      toggleMessageSelection(message);
    }
  };

  // MARK: 气泡样式
  const bubbleClasses = cn(
    "p-3 rounded-lg", // 调整宽度
    "prose prose-sm dark:prose-invert prose-p:my-1 prose-headings:my-2 prose-pre:my-2 prose-pre:p-2 prose-pre:bg-gray-800 prose-pre:rounded", // Markdown 基础样式
    isUser
      ? "bg-blue-600 text-white"
      : mode === "rag" && message.isRagMessage
      ? "bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 text-gray-900 dark:text-gray-100"
      : "bg-neutral-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100",
    isError
      ? "bg-red-100 dark:bg-red-900 border border-red-500 text-red-700 dark:text-red-200 prose-red"
      : "",
    isActive && !isUser
      ? "ring-2 ring-blue-400 dark:ring-blue-500 bg-gray-200 dark:bg-gray-600"
      : "",
    isActive && isUser ? "ring-2 ring-blue-300" : "",
    // 添加选择模式相关样式
    isSelectionMode &&
      "cursor-pointer hover:brightness-95 dark:hover:brightness-110 transition-all",
    isSelectionMode &&
      messageIsSelected &&
      "ring-2 ring-blue-500 dark:ring-blue-400"
  );

  // 添加外层容器的类
  const containerClasses = cn(
    "flex m-3 mx-6",
    isUser ? "justify-end" : "justify-start",
    "transition-all duration-300",
    isActive && "scroll-mt-16", // 当消息激活时添加滚动边距，避免被顶部元素遮挡
    isFloatingSidebarVisible && "mr-16 transition-all duration-300", // 当侧边栏可见时添加右边距
    isSelectionMode && "relative ml-12 transition-all duration-300" // 选择模式时添加相对定位
  );

  // MARK: 最终显示的内容
  const contentToDisplay = message.mainContent ?? message.content;

  // MARK: Markdown配置
  const markdownComponents = {
    code({
      inline,
      className,
      children,
      ...rest
    }: ComponentPropsWithoutRef<"code"> & { inline?: boolean }) {
      const match = /language-(\w+)/.exec(className || "");
      return !inline && match ? (
        <div className="relative group">
          <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <CopyButton
              text={String(children).replace(/\n$/, "")}
              size="sm"
              variant="subtle"
              className="bg-gray-700 hover:bg-gray-600 text-white"
            />
          </div>
          <SyntaxHighlighter
            style={coldarkDark} // 使用导入的主题
            language={match[1]}
            PreTag="div"
            {...rest}
          >
            {String(children).replace(/\n$/, "")}
          </SyntaxHighlighter>
        </div>
      ) : (
        <code className={className} {...rest}>
          {children}
        </code>
      );
    },
  };

  return (
    <div
      className={cn(containerClasses)}
      ref={messageRef}
      id={`message-${message.id}`}
      onClick={handleMessageClick}
    >
      {/* 选择状态指示器 */}
      {isSelectionMode && messageIsSelected && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 -ml-8 text-blue-500 dark:text-blue-400">
          {isSelected(message.id) && <CheckCircle2 className="h-5 w-5" />}
        </div>
      )}

      <div className="flex flex-col max-w-[75%] group">
        {message.isMarked && message.summary && (
          <div className="text-xs text-blue-500 dark:text-blue-400 mb-1 font-medium">
            {message.summary}
          </div>
        )}

        <div className={bubbleClasses}>
          {/* 思考过程部分 (仅助手消息且存在时显示) */}
          {isAssistant && message.thinkContent && (
            <details
              className="mb-2 border-b border-gray-300 dark:border-gray-600 pb-2"
              open={isThinkingExpanded}
            >
              <summary
                className="text-xs text-gray-500 dark:text-gray-400 cursor-pointer select-none italic"
                onClick={(e) => {
                  // 阻止默认的 details 切换行为，手动控制状态
                  e.preventDefault();
                  e.stopPropagation(); // 防止触发消息选择
                  setIsThinkingExpanded(!isThinkingExpanded);
                }}
              >
                思考过程... {!message.isThinkingComplete && "(进行中)"}{" "}
                {message.isThinkingComplete &&
                  !isThinkingExpanded &&
                  "(点击展开)"}{" "}
                {message.isThinkingComplete &&
                  isThinkingExpanded &&
                  "(点击折叠)"}
              </summary>
              {/* 使用 Markdown 渲染思考过程 */}
              <div className="mt-1 text-xs opacity-80 relative group">
                {/* 思考内容复制按钮 */}
                {message.thinkContent &&
                  message.thinkContent.trim().length > 0 &&
                  isThinkingExpanded && (
                    <div className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <CopyButton
                        text={message.thinkContent}
                        size="sm"
                        variant="subtle"
                        className="text-gray-500"
                      />
                    </div>
                  )}
                <ReactMarkdown
                  components={markdownComponents}
                  remarkPlugins={[remarkGfm]}
                >
                  {message.thinkContent}
                </ReactMarkdown>
              </div>
            </details>
          )}

          {/* 主要内容部分 (使用 Markdown 渲染) */}
          {isAssistant && !contentToDisplay && !message.isThinkingComplete ? (
            <LoadingDots className="text-gray-600 dark:text-gray-400" />
          ) : (
            <ReactMarkdown
              components={markdownComponents}
              remarkPlugins={[remarkGfm]}
            >
              {contentToDisplay}
            </ReactMarkdown>
          )}

          {/* RAG 来源信息 */}
          {message.isRagMessage &&
            message.sources &&
            message.sources.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-300 dark:border-gray-600">
                <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
                  参考来源 ({message.sources.length} 个)：
                </h4>
                <div className="space-y-2">
                  {message.sources.map((source, index) => (
                    <div
                      key={index}
                      className="p-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded text-xs"
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          {source.fileName} (块 {source.chunkIndex})
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          相似度: {(source.score / 10).toFixed(1)}%
                        </span>
                      </div>
                      <p className="text-gray-600 dark:text-gray-400">
                        {source.content}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
        </div>
        {/* 消息底部的复制按钮 - 常驻显示 */}
        {contentToDisplay && contentToDisplay.trim().length > 0 && (
          <div
            className="flex justify-end mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 gap-2"
            onClick={(e) => e.stopPropagation()} // 防止触发消息选择
          >
            <StarButton
              text={contentToDisplay}
              size="sm"
              variant="outline"
              className="text-gray-400"
              successText="已收藏消息"
              isStarred={messageStarred}
              setIsStarred={setMessageStarred}
              message={message} // 传递完整的消息对象
              isRag={mode === "rag"} // 根据mode判断是否为RAG消息
              currentLibraryId={mode === "rag" ? message.libraryId : undefined} // 只在RAG模式下传递libraryId
            />
            <CopyButton
              text={contentToDisplay}
              size="sm"
              variant="outline"
              className="text-gray-400"
              successText="已复制全部内容"
            />
          </div>
        )}
      </div>
    </div>
  );
};
