import { ChromaClient } from "chromadb";
import { Ollama } from "ollama";

// 初始化 ChromaDB 客户端
const chromaClient = new ChromaClient({
  path: "http://localhost:8000", // ChromaDB 默认端口
});

// 初始化 Ollama 客户端
const ollama = new Ollama({
  host: "http://localhost:11434", // Ollama 默认端口
});

// MARK: RAGVector
export class RAGVectorStore {
  private collection: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  private collectionName = "rag_collection";

  async initialize() {
    try {
      // 尝试获取已存在的集合
      this.collection = await chromaClient.getCollection({
        name: this.collectionName,
      });
      console.log(`✅ 连接到现有集合: ${this.collectionName}`);
    } catch {
      // 如果集合不存在，创建新的集合
      console.log(`📝 创建新集合: ${this.collectionName}`);
      this.collection = await chromaClient.createCollection({
        name: this.collectionName,
        metadata: {
          description: "RAG 应用的文档向量存储",
          model: "bge-m3",
        },
      });
    }
    return this;
  }

  // MARK: 生成嵌入向量
  // 使用 Ollama API 生成嵌入向量
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await ollama.embeddings({
        model: "bge-m3",
        prompt: text,
      });
      return response.embedding;
    } catch (error) {
      console.error("生成嵌入向量失败:", error);
      throw new Error(`嵌入向量生成失败: ${error}`);
    }
  }

  // MARK: 添加文档到向量存储
  async addDocuments(
    documents: Array<{
      id: string;
      text: string;
      metadata?: Record<string, unknown>;
    }>
  ) {
    if (!this.collection) {
      throw new Error("向量存储未初始化，请先调用 initialize()");
    }

    const ids: string[] = [];
    const embeddings: number[][] = [];
    const metadatas: Record<string, unknown>[] = [];
    const documents_text: string[] = [];

    for (const doc of documents) {
      const embedding = await this.generateEmbedding(doc.text);
      ids.push(doc.id);
      embeddings.push(embedding);
      metadatas.push(doc.metadata || {});
      documents_text.push(doc.text);
    }

    await this.collection.add({
      ids,
      embeddings,
      metadatas,
      documents: documents_text,
    });

    console.log(`✅ 已添加 ${documents.length} 个文档到向量存储`);
  }

  // MARK: 查询相似文档
  async query(
    queryText: string,
    topK: number = 4,
    where?: Record<string, unknown>
  ) {
    if (!this.collection) {
      throw new Error("向量存储未初始化，请先调用 initialize()");
    }

    const queryEmbedding = await this.generateEmbedding(queryText);

    const results = await this.collection.query({
      queryEmbeddings: [queryEmbedding],
      nResults: topK,
      where,
    });

    // MARK: 格式化结果
    const formattedResults = [];
    for (let i = 0; i < results.documents[0].length; i++) {
      formattedResults.push({
        id: results.ids[0][i],
        pageContent: results.documents[0][i],
        metadata: results.metadatas[0][i],
        score: results.distances[0][i],
      });
    }

    return formattedResults;
  }

  // MARK: 删除所有文档
  async clear() {
    if (!this.collection) {
      throw new Error("向量存储未初始化，请先调用 initialize()");
    }

    await chromaClient.deleteCollection({ name: this.collectionName });
    await this.initialize(); // 重新创建空集合
    console.log("✅ 已清空向量存储");
  }
}

// MARK: 导出单例实例
export const vectorStore = new RAGVectorStore();
