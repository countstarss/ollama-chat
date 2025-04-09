import { NextRequest } from 'next/server';
import { ApiRequestBody } from '@/lib/types';
import { OllamaStream } from '@/lib/ollamaClient'; // 导入流式处理函数

export const runtime = 'edge'; // 推荐 Edge Runtime 处理流式响应

// MARK: - POST 请求
export async function POST(request: NextRequest) {
  try {
    const body: ApiRequestBody = await request.json();
    const { task, payload, model } = body;

    console.log(`API收到任务: ${task}${model ? `, 模型: ${model}` : ''}`);

    // MARK: - 验证请求
    if (!task) {
      return new Response(JSON.stringify({ error: "缺少任务类型" }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!payload) {
      return new Response(JSON.stringify({ error: "缺少请求数据" }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 假设所有任务都返回流
    if (task === 'general_chat' || task === 'analyze_json_add_tags') {
        try {
            const stream = await OllamaStream(payload, model, task);

            // 返回 Streaming Response
            // 使用 text/plain 或 text/event-stream 都可以，前端相应处理
            return new Response(stream, {
                headers: { 'Content-Type': 'text/plain; charset=utf-8' },
            });

        } catch (error) {
            console.error(`获取任务 ${task} 的流时出错:`, error);
            const message = error instanceof Error ? error.message : "从Ollama获取流失败";
            
            // 判断错误类型并返回适当的状态码
            let statusCode = 500;
            
            if (message.includes("找不到模型") || message.includes("模型") && message.includes("不可用")) {
                statusCode = 404; // 模型不存在
            } else if (message.includes("参数错误")) {
                statusCode = 400; // 参数错误
            } else if (message.includes("超时")) {
                statusCode = 504; // 网关超时
            }
            
            return new Response(JSON.stringify({ 
                error: "流处理错误", 
                detail: message,
                model: model // 返回请求的模型，以便前端处理
            }), { 
                status: statusCode,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    } else {
         return new Response(JSON.stringify({ error: `不支持的任务类型: ${task}` }), { 
           status: 400,
           headers: { 'Content-Type': 'application/json' }
         });
    }

  } catch (error) {
    console.error("API路由错误:", error);
    const errorMessage = error instanceof Error ? error.message : "发生内部服务器错误";
    return new Response(JSON.stringify({ 
      error: "请求处理失败", 
      detail: errorMessage
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}