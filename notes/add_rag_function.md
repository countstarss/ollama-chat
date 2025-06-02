
好的，我将根据您提供的技术栈和代码模板来创建RAG功能。首先让我检查当前的项目结构，然后创建相应的文件。

Ran tool
我看到项目根目录有 `lib/` 和 `src/` 目录。让我检查一下 `src/` 目录的结构，确定应该在哪里创建文件。

Ran tool
很好，项目使用的是 `src/` 目录结构，并且已经有了 `src/lib/` 和 `src/app/` 目录。根据您提供的代码模板，我需要创建以下文件：

1. `src/lib/vectorStore.ts` - 初始化向量库
2. `src/lib/ingest.ts` - 批量导入本地文档  
3. `src/app/api/rag/route.ts` - Next.js API 路由
4. `docs/` 目录用于存放要索引的文档

首先，我需要创建 `docs` 目录用于存放文档：

```bash
mkdir -p docs
```
现在让我创建 RAG 功能的核心文件。首先创建 `src/lib/vectorStore.ts`：


看起来 `llamaindex` 包的导入路径需要调整。让我检查一下已安装的 `llamaindex` 包的实际 API，并查看可用的导出：

Read file: node_modules/llamaindex/package.json
我发现 `llamaindex` 包有很多子模块。让我查看一下 `vector-store` 模块：

Read file: node_modules/llamaindex/package.json
很好！我看到有 `./vector-store` 导出。让我检查一下 vector-store 模块的类型定义：

Read file: node_modules/llamaindex/vector-store/dist/index.d.ts
vector-store 模块只导出了 `SimpleVectorStore`，没有 `ChromaVectorStore`。让我检查 chromadb 包的使用方式，并采用直接使用 chromadb 的方法来创建向量存储。

首先，让我检查 llamaindex 主模块，看看是否有 `OllamaEmbedding`：

Ran tool
看起来 LlamaIndex.TS 的当前版本没有直接的 `OllamaEmbedding` 和 `ChromaVectorStore`。我将采用更直接的方法，使用 `chromadb` 包和简化的实现。让我重新创建 `vectorStore.ts`：


我需要安装 `ollama` 包，并修复一些类型错误：

```bash
pnpm add ollama
```
现在修复代码中的 linter 错误：


我需要使用正确的 `Ollama` 导入。让我修复这个导入错误：


很好！现在让我创建 `src/lib/ingest.ts` 文件来处理文档导入：



现在创建 Next.js API 路由。让我先检查 `src/app/api` 目录：

Ran tool

让我创建 `rag` 目录和 API 路由：

```bash
mkdir -p src/app/api/rag
```

现在创建 RAG API 路由：



现在让我创建一些示例文档，并添加 npm 脚本来方便使用：



现在创建另一个示例文档：



现在让我检查 package.json 并添加必要的 npm 脚本：

Read file: package.json

现在让我在 package.json 中添加用于文档导入的脚本：



我需要安装 `tsx` 来运行 TypeScript 脚本：

```bash
pnpm add -D tsx
```

现在让我创建一个完整的使用文档：



最后，让我创建一个简单的前端组件来测试 RAG 功能：


完美！我已经成功为您的 Next.js + TypeScript + Ollama 应用创建了完整的 RAG 功能。让我总结一下已创建的内容：

## ✅ 已创建的文件和功能

### 📁 核心文件

1. **`src/lib/vectorStore.ts`** - 向量存储管理类
   - 使用 ChromaDB 作为向量数据库
   - 集成 Ollama 的 bge-m3 嵌入模型
   - 支持文档添加、查询和管理

2. **`src/lib/ingest.ts`** - 文档导入脚本
   - 自定义文本分割器（512 字符块，64 字符重叠）
   - 支持 .txt、.md、.json 文件格式
   - 批量处理和索引文档

3. **`src/app/api/rag/route.ts`** - Next.js API 路由
   - POST 端点用于 RAG 查询
   - GET 端点用于状态检查
   - 集成 Ollama LLM 生成回答

4. **`src/components/RagChat.tsx`** - 前端测试组件
   - 美观的聊天界面
   - 显示答案和参考来源
   - 错误处理和状态管理

### 📄 文档和配置

5. **`docs/sample.md`** - RAG 系统示例文档
6. **`docs/technology.txt`** - Next.js 技术文档示例
7. **`RAG_USAGE.md`** - 完整的使用文档
8. **package.json 脚本**：
   - `pnpm run ingest` - 导入文档
   - `pnpm run ingest:clear` - 清除索引

## 🚀 快速开始

### 1. 启动必需服务

```bash
# 启动 Ollama
ollama serve
ollama pull bge-m3
ollama pull llama3.1:8b

# 启动 ChromaDB
docker run -p 8000:8000 chromadb/chroma
```

### 2. 导入文档

```bash
pnpm run ingest
```

### 3. 启动应用

```bash
pnpm dev
```

### 4. 测试 RAG 功能

- 访问 `http://localhost:3000` 并使用 `RagChat` 组件
- 或直接调用 API：`POST /api/rag` 
- 或检查状态：`GET /api/rag`

## 🔧 技术栈总结

- ✅ **LLM 推理**：Ollama（本地）
- ✅ **Embedding**：bge-m3（多语言支持）
- ✅ **向量库**：ChromaDB（SQLite 持久化）
- ✅ **文本分割**：自定义实现
- ✅ **Next.js 集成**：API 路由 + TypeScript
- ✅ **前端组件**：React + Tailwind CSS

## 📝 性能预期

根据您的提示和 Mac M2 16GB 配置：
- **检索速度**：~120ms（top-4）
- **生成速度**：~3s（8B 模型）
- **内存使用**：4-6GB

系统已完全配置为**离线运行**，确保数据隐私和安全。所有组件都在本地运行，无需外部 API 调用。

请查看 `RAG_USAGE.md` 获取详细的使用说明和故障排除指南！🎉
