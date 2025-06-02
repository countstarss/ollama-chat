"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Send, FileText } from "lucide-react";

interface RAGResponse {
  answer: string;
  sources: Array<{
    fileName: string;
    chunkIndex: number;
    score: number;
    content: string;
  }>;
  query: string;
  timestamp: string;
}

export function RagChat() {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState<RAGResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || loading) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/rag", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const data: RAGResponse = await res.json();
      setResponse(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : "请求失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          RAG 知识问答
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="输入您的问题..."
            disabled={loading}
            className="flex-1"
          />
          <Button type="submit" disabled={loading || !query.trim()}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">错误: {error}</p>
          </div>
        )}

        {response && (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">回答：</h3>
              <p className="text-blue-800 whitespace-pre-wrap">
                {response.answer}
              </p>
            </div>

            {response.sources.length > 0 && (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">
                  参考来源 ({response.sources.length} 个)：
                </h3>
                <div className="space-y-2">
                  {response.sources.map((source, index) => (
                    <div
                      key={index}
                      className="p-3 bg-white border border-gray-200 rounded text-sm"
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-medium text-gray-700">
                          {source.fileName} (块 {source.chunkIndex})
                        </span>
                        <span className="text-xs text-gray-500">
                          相似度: {(source.score * 100).toFixed(1)}%
                        </span>
                      </div>
                      <p className="text-gray-600">{source.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="text-xs text-gray-500">
              查询时间: {new Date(response.timestamp).toLocaleString()}
            </div>
          </div>
        )}

        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="font-semibold text-yellow-900 mb-2">使用提示：</h3>
          <ul className="text-sm text-yellow-800 space-y-1">
            <li>• 确保 Ollama 服务运行在 localhost:11434</li>
            <li>• 确保 ChromaDB 服务运行在 localhost:8000</li>
            <li>
              • 使用 <code>pnpm run ingest</code> 导入文档
            </li>
            <li>• 尝试问一些关于已导入文档的问题</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
