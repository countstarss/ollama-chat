import { NextRequest, NextResponse } from "next/server";
import { vectorStore } from "@/lib/vectorStore";
import { Ollama } from "ollama";

// 初始化 Ollama 客户端
const ollama = new Ollama({
  host: "http://localhost:11434",
});

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

    // ④ 调用 Ollama 生成回答
    console.log("🤖 生成回答...");
    const response = await ollama.generate({
      model: "deepseek-r1:7b", // 使用您系统中可用的模型
      prompt,
      stream: false,
    });

    // ⑤ 格式化响应
    const sources = contexts.map((c) => ({
      fileName: c.metadata?.fileName || "unknown",
      chunkIndex: c.metadata?.chunkIndex || 0,
      score: c.score,
      content: c.pageContent.substring(0, 200) + "...",
    }));
    console.log(response.response);

    console.log("✅ 回答生成完成");

    return NextResponse.json({
      answer: response.response,
      sources,
      query,
      libraryId: libraryId || null,
      timestamp: new Date().toISOString(),
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
