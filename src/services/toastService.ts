import { toast } from "sonner";

// 自定义的通知选项类型
interface ToastOptions {
  duration?: number;
  id?: string;
  icon?: React.ReactNode;
  description?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  cancel?: {
    label: string;
    onClick?: () => void;
  };
  onDismiss?: (id: number | string) => void;
  onAutoClose?: (id: number | string) => void;
  position?:
    | "top-left"
    | "top-right"
    | "bottom-left"
    | "bottom-right"
    | "top-center"
    | "bottom-center";
  className?: string;
  style?: React.CSSProperties;
  dismissible?: boolean;
  important?: boolean;
}

// 默认配置
const defaultOptions: ToastOptions = {
  duration: 4000,
};

// 成功通知
export const showSuccess = (message: string, options?: any) => {
  return toast.success(message, options);
};

// 错误通知
export const showError = (message: string, options?: any) => {
  return toast.error(message, options);
};

// 信息通知
export const showInfo = (message: string, options?: any) => {
  return toast.info(message, options);
};

// 警告通知
export const showWarning = (message: string, options?: any) => {
  return toast.warning(message, options);
};

// 加载中通知
export const showLoading = (message: string, options?: any) => {
  return toast.loading(message, options);
};

// 撤销操作通知
export const showUndoAction = (
  message: string,
  onUndo: () => void,
  options?: any
) => {
  return toast(message, {
    ...options,
    action: {
      label: "撤销",
      onClick: onUndo,
    },
  });
};

// 自定义通知
export const showCustomToast = (message: string, options?: any) => {
  return toast(message, options);
};

// 提供一个通用的接口
const toastService = {
  success: showSuccess,
  error: showError,
  info: showInfo,
  warning: showWarning,
  loading: showLoading,
  undo: showUndoAction,
  custom: showCustomToast,
  dismiss: toast.dismiss,
};

export default toastService;
