// 定义事件类型
export type AppEvent =
  | { type: "CHAT_RENAMED"; chatId: string; newName: string }
  | { type: "CHAT_CREATED"; chatId: string }
  | { type: "CHAT_DELETED"; chatId: string };

// 事件监听器类型
export type EventListener = (event: AppEvent) => void;

class EventService {
  private listeners: EventListener[] = [];

  /**
   * 发布事件
   * @param event 事件对象
   */
  publish(event: AppEvent): void {
    console.log(`[EventService] 发布事件:`, event);
    this.listeners.forEach((listener) => listener(event));
  }

  /**
   * 订阅事件
   * @param listener 监听器函数
   * @returns 取消订阅的函数
   */
  subscribe(listener: EventListener): () => void {
    this.listeners.push(listener);

    // 返回取消订阅函数
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }
}

// 创建单例
const eventService = new EventService();
export default eventService;
