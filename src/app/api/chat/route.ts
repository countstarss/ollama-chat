import { NextRequest } from 'next/server';
import { ApiRequestBody } from '@/lib/types';
import { OllamaStream } from '@/lib/ollamaClient'; // 导入流式处理函数

export const runtime = 'edge'; // 推荐 Edge Runtime 处理流式响应

export async function POST(request: NextRequest) {
  try {
    const body: ApiRequestBody = await request.json();
    const { task, payload, model } = body;

    console.log(`API Received task: ${task}`);

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
            console.error(`Error getting stream for task ${task}:`, error);
            const message = error instanceof Error ? error.message : "Failed to get stream from Ollama";
            return new Response(JSON.stringify({ error: "Streaming Error", detail: message }), { status: 500 });
        }
    } else {
         return new Response(JSON.stringify({ error: `Unsupported task type: ${task}` }), { status: 400 });
    }

  } catch (error) {
    console.error("API Route Error:", error);
    const errorMessage = error instanceof Error ? error.message : "An internal server error occurred.";
    return new Response(JSON.stringify({ error: "Failed to process request.", detail: errorMessage }), { status: 500 });
  }
}