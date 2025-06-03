import { NextRequest, NextResponse } from "next/server";
import { vectorStore } from "@/lib/vectorStore";
import { OllamaStream } from "@/lib/ollamaClient";
import { v4 as uuidv4 } from "uuid";
import { ChatMessage } from "@/lib/types";

// 统一模型名称
const MODEL_NAME = "deepseek-r1:7b";

export async function POST(req: NextRequest) {
  try {
    const { query, libraryId } = await req.json();

    if (!query) {
      return NextResponse.json({ error: "查询内容不能为空" }, { status: 400 });
    }

    console.log(`📝 收到查询: ${query}`);

    // ① 初始化向量存储（如果尚未初始化）
    await vectorStore.initialize();

    // ② 检索相关文档
    console.log("🔍 检索相关文档...");
    const where = libraryId ? { libraryId } : undefined;
    const contexts = await vectorStore.query(query, 4, where);

    if (contexts.length === 0) {
      return NextResponse.json({
        answer:
          "抱歉，我在知识库中没有找到相关信息来回答您的问题。请确保已经导入了相关文档，或者尝试重新表述您的问题。",
        sources: [],
        query,
      });
    }

    console.log(`📚 找到 ${contexts.length} 个相关文档片段`);

    // ③ 拼接 Prompt
    const contextBlock = contexts
      .map((c, i) => `【文档${i + 1}】${c.pageContent}`)
      .join("\n\n");

    const prompt = `请基于以下提供的资料来回答用户的问题。如果资料中没有相关信息，请明确说明。

参考资料：
${contextBlock}

用户问题：${query}

请根据上述资料给出准确、详细的回答：`;

    // ④ 生成流式回答
    console.log("🤖 生成RAG流式回答...");
    const chatMessages: ChatMessage[] = [
      { id: uuidv4(), role: "user", content: prompt },
    ];
    const rawStream = await OllamaStream(
      chatMessages,
      MODEL_NAME,
      "general_chat"
    );

    // ⑤ 构造新的 ReadableStream：首条 data 带 sources，其余透传
    const encoder = new TextEncoder();
    const sourcePayload = {
      sources: contexts.map((c) => ({
        fileName: c.metadata?.fileName || "unknown",
        chunkIndex: c.metadata?.chunkIndex || 0,
        score: c.score,
        content: c.pageContent.substring(0, 200) + "...",
      })),
    };

    const combinedStream = new ReadableStream({
      async start(controller) {
        // 先推送sources
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(sourcePayload)}\n\n`)
        );
        const reader = rawStream.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          controller.enqueue(value);
        }
        controller.close();
      },
    });

    return new Response(combinedStream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    console.error("❌ RAG API 错误:", error);

    return NextResponse.json(
      {
        error: "服务器处理请求时发生错误",
        details: error instanceof Error ? error.message : "未知错误",
      },
      { status: 500 }
    );
  }
}

// 获取向量存储状态的 GET 端点
export async function GET() {
  try {
    await vectorStore.initialize();

    // 这里可以添加获取存储统计信息的逻辑
    // 由于 ChromaDB 的限制，我们只能返回基本状态
    return NextResponse.json({
      status: "ready",
      message: "向量存储已准备就绪",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ 获取向量存储状态失败:", error);

    return NextResponse.json(
      {
        status: "error",
        error: "向量存储不可用",
        details: error instanceof Error ? error.message : "未知错误",
      },
      { status: 500 }
    );
  }
}
