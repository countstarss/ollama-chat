import { Metadata } from 'next';
import { StarredMessages } from './components/StarredMessages';


export const metadata: Metadata = {
  title: '我的收藏',
  description: '我的收藏',
}

export default function StarPage() {
  // 在此可以添加服务端数据获取逻辑，并将数据传递给客户端组件
  // 例如：可以在此预加载一些数据，或进行权限验证等

  return (
    <StarredMessages />
  );
} 