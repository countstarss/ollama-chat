import { NextRequest, NextResponse } from "next/server";
import { DisplayMessage } from "@/components/chat/ChatMessage";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    // 解析请求体
    const { messages, prompt } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "未提供有效的消息数组" },
        { status: 400 }
      );
    }

    // 准备消息内容
    const sortedMessages = [...messages].sort((a, b) => {
      // 确保消息按照原始顺序排列
      const aIndex = parseInt(a.id.split("-")[1] || "0");
      const bIndex = parseInt(b.id.split("-")[1] || "0");
      return aIndex - bIndex;
    });

    // 构建对话消息
    const dialogContent = sortedMessages
      .map(
        (msg: DisplayMessage) =>
          `${msg.role === "user" ? "用户: " : "助手: "}\n${msg.content}`
      )
      .join("\n\n---\n\n");

    // 准备调用大模型API的请求
    const API_URL =
      process.env.LLM_API_URL || "http://localhost:11434/api/chat";
    const requestData = {
      model: process.env.LLM_MODEL || "llama3",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant that creates concise but comprehensive summaries of conversations.",
        },
        {
          role: "user",
          content: `${
            prompt ||
            "请对以下对话进行汇总，提取关键信息，保持语言连贯，并保持原意:"
          }\n\n${dialogContent}`,
        },
      ],
      stream: false,
    };

    // 调用大模型API
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("大模型API错误:", errorText);
      return NextResponse.json(
        {
          error: `调用大模型API失败: ${response.status} ${response.statusText}`,
          summary: dialogContent, // 发生错误时返回原始内容
        },
        { status: 200 }
      ); // 仍返回200但包含错误信息，客户端可以处理
    }

    // 解析API响应
    const apiResponse = await response.json();
    const summary = apiResponse.message?.content || dialogContent;

    // 返回摘要
    return NextResponse.json({ summary }, { status: 200 });
  } catch (error) {
    console.error("处理摘要请求时出错:", error);
    return NextResponse.json(
      {
        error: `处理摘要请求时出错: ${
          error instanceof Error ? error.message : String(error)
        }`,
      },
      { status: 500 }
    );
  }
}
