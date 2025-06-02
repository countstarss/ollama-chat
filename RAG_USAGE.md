# RAG 功能使用文档

## 概述

本文档介绍了基于 Next.js + TypeScript + Ollama 的 RAG（检索增强生成）系统的使用方法。该系统可以将本地文档转换为向量索引，并通过智能检索为用户提供基于文档内容的准确回答。

## 🚀 快速开始

### 1. 环境准备

确保您的系统已安装并运行以下服务：

#### Ollama 服务
```bash
# 安装 Ollama (如果尚未安装)
curl -fsSL https://ollama.ai/install.sh | sh

# 启动 Ollama 服务
ollama serve

# 下载必需的模型
ollama pull bge-m3           # 嵌入模型
ollama pull llama3.1:8b      # 生成模型（可根据您的硬件选择其他版本）
```


#### ChromaDB 服务
NOTE: 在本地Docker部署了
```bash
# 使用 Docker 启动 ChromaDB
docker run -p 8000:8000 chromadb/chroma

# 或者使用 pip 安装并启动
pip install chromadb
chroma run --path ./chroma_db --port 8000
```

### 2. 文档准备

将您要索引的文档放到 `docs/` 目录下：

```bash
docs/
├── sample.md          # 示例文档（已创建）
├── technology.txt     # 技术文档（已创建）
├── your_document.md   # 您的文档
└── ...
```

支持的文件格式：
- `.txt` - 纯文本文件
- `.md` - Markdown 文件
- `.json` - JSON 文件

### 3. 文档索引

运行以下命令将文档导入向量数据库：

```bash
# 导入文档
pnpm run ingest

# 清除现有索引（如需重新开始）
pnpm run ingest:clear
```

### 4. 启动应用

```bash
# 开发模式
pnpm dev

# 或生产模式
pnpm build
pnpm start
```

## 📖 API 使用

### RAG 查询 API

**端点：** `POST /api/rag`

**请求体：**
```json
{
  "query": "您的问题"
}
```

**响应：**
```json
{
  "answer": "基于文档的回答",
  "sources": [
    {
      "fileName": "sample.md",
      "chunkIndex": 0,
      "score": 0.85,
      "content": "相关文档片段..."
    }
  ],
  "query": "您的问题",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

**使用示例：**
```bash
curl -X POST http://localhost:3000/api/rag \
  -H "Content-Type: application/json" \
  -d '{"query": "什么是 RAG？"}'
```

### 状态检查 API

**端点：** `GET /api/rag`

**响应：**
```json
{
  "status": "ready",
  "message": "向量存储已准备就绪",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## 🔧 配置说明

### 向量存储配置

在 `src/lib/vectorStore.ts` 中可以调整以下配置：

```typescript
// ChromaDB 连接配置
const chromaClient = new ChromaClient({
  path: 'http://localhost:8000', // ChromaDB 服务地址
});

// Ollama 连接配置
const ollama = new Ollama({
  host: 'http://localhost:11434' // Ollama 服务地址
});
```

### 文本分割配置

在 `src/lib/ingest.ts` 中可以调整文本分割参数：

```typescript
const splitter = new SimpleTextSplitter(
  512,  // 块大小（字符数）
  64    // 块重叠（字符数）
);
```

### LLM 模型配置

在 `src/app/api/rag/route.ts` 中可以更改使用的模型：

```typescript
const response = await ollama.generate({
  model: 'llama3.1:8b',  // 可以更改为您系统中的其他模型
  prompt,
  stream: false,
});
```

## 📝 使用技巧

### 1. 文档组织

- 将相关文档按主题分类
- 使用清晰的文件名
- 保持文档结构清晰，使用标题和段落

### 2. 查询技巧

- 使用具体、明确的问题
- 避免过于宽泛的查询
- 可以包含文档中的关键词

### 3. 性能优化

- 定期清理不需要的文档
- 根据硬件配置选择合适的模型
- 考虑调整块大小以平衡检索精度和性能

## 🛠️ 故障排除

### 常见问题

1. **"向量存储不可用"错误**
   - 检查 ChromaDB 服务是否运行在 localhost:8000
   - 确认网络连接正常

2. **"嵌入向量生成失败"错误**
   - 检查 Ollama 服务是否运行在 localhost:11434
   - 确认 bge-m3 模型已下载：`ollama list`

3. **"找不到相关信息"回复**
   - 确认文档已成功导入：检查控制台输出
   - 尝试使用文档中包含的关键词查询
   - 考虑重新运行文档导入

4. **导入脚本失败**
   - 检查 docs/ 目录是否存在
   - 确认文档格式符合要求
   - 查看错误日志了解具体问题

### 调试模式

启用详细日志输出：

```bash
# 在 .env.local 中添加
DEBUG=true
```

## 🔄 更新文档

当您添加新文档或修改现有文档时：

1. 将新文档放入 `docs/` 目录
2. 运行 `pnpm run ingest` 重新索引
3. 测试查询确认更新生效

## 📊 性能指标

基于 Mac M2 16GB 的测试结果：

- **文档索引速度**：约 100-200 文档/分钟
- **查询检索时间**：约 120ms（top-4 检索）
- **回答生成时间**：约 3s（8B Q4 模型）
- **内存使用**：约 4-6GB（包含模型）

## 🚀 扩展功能

### 可选增强功能

1. **查询缓存**：实现查询结果缓存以提高响应速度
2. **重排序**：使用 bge-reranker-v2-m3 提高检索质量
3. **多路检索**：结合 BM25 和向量检索
4. **用户权限**：为不同用户提供不同的文档访问权限
5. **流式响应**：实现实时流式答案生成

### 部署建议

- **开发环境**：本地运行所有服务
- **生产环境**：考虑使用 Docker Compose 部署
- **云部署**：可以使用 Qdrant Cloud 替代本地 ChromaDB

## 📞 支持

如果您遇到问题或需要帮助：

1. 检查本文档的故障排除部分
2. 查看控制台错误日志
3. 确认所有服务正常运行
4. 验证文档格式和内容

---

**注意**：本系统设计为离线运行，所有数据和模型都在本地处理，确保数据隐私和安全。 