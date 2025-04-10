import { useSelectionStore } from "@/store/useSelectionStore";
import { AnimatePresence, motion } from "framer-motion";
import { SelectionToolbar } from "./SelectionToolbar";
import { ChatInput } from "./ChatInput";

// 新增 InputArea 组件，负责根据选择模式状态显示不同的输入区域
interface InputAreaProps {
  isLoading: boolean;
  onSendMessage: (message: string) => void;
  onAbort?: () => void;
}

export function InputArea({ isLoading, onSendMessage, onAbort }: InputAreaProps) {
  const { isSelectionMode } = useSelectionStore();
  
  return (
    <AnimatePresence mode="wait">
      {isSelectionMode ? (
        <motion.div
          key="selection-toolbar"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.2 }}
        >
          <SelectionToolbar />
        </motion.div>
      ) : (
        <motion.div
          key="chat-input"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.2 }}
        >
          <ChatInput 
            onSendMessage={onSendMessage}
            onAbort={onAbort}
            isLoading={isLoading}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}