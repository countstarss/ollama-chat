import fs from "node:fs/promises";
import path from "node:path";
import { vectorStore } from "./vectorStore";

// MARK: 文本分割
class SimpleTextSplitter {
  private chunkSize: number;

  private chunkOverlap: number;
  constructor(chunkSize: number = 512, chunkOverlap: number = 64) {
    this.chunkSize = chunkSize;
    this.chunkOverlap = chunkOverlap;
  }

  splitText(text: string): string[] {
    const chunks: string[] = [];
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);

    let currentChunk = "";

    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      if (currentChunk.length + trimmedSentence.length > this.chunkSize) {
        if (currentChunk.length > 0) {
          chunks.push(currentChunk.trim());
          // 保留重叠部分
          const words = currentChunk.split(" ");
          const overlapWords = words.slice(-Math.floor(this.chunkOverlap / 10));
          currentChunk = overlapWords.join(" ") + " ";
        }
      }
      currentChunk += trimmedSentence + ". ";
    }

    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }

    return chunks.filter((chunk) => chunk.length > 10); // 过滤太短的块
  }
}

// 支持的文件类型
const supportedExtensions = [".txt", ".md", ".json"];

// MARK: 处理单个文件
async function processFile(filePath: string, splitter: SimpleTextSplitter) {
  try {
    const ext = path.extname(filePath).toLowerCase();
    if (!supportedExtensions.includes(ext)) {
      console.warn(`⚠️ 跳过不支持的文件类型: ${filePath}`);
      return [];
    }

    const content = await fs.readFile(filePath, "utf8");
    const fileName = path.basename(filePath);

    // 分割文本
    const chunks = splitter.splitText(content);

    // 创建文档对象
    const documents = chunks.map((chunk, index) => ({
      id: `${fileName}_chunk_${index}`,
      text: chunk,
      metadata: {
        source: filePath,
        fileName,
        chunkIndex: index,
        fileType: ext,
        timestamp: new Date().toISOString(),
      },
    }));

    console.log(`📄 处理文件 ${fileName}: 生成 ${documents.length} 个文档块`);
    return documents;
  } catch (error) {
    console.error(`❌ 处理文件失败 ${filePath}:`, error);
    return [];
  }
}

// MARK: 文档导入函数
export async function ingestDocuments(docsDir: string = "./docs") {
  console.log("🚀 开始文档导入流程...");

  try {
    // 初始化向量存储
    await vectorStore.initialize();

    // 创建文本分割器
    const splitter = new SimpleTextSplitter(512, 64);

    // 读取文档目录
    const files = await fs.readdir(docsDir);
    console.log(`📁 找到 ${files.length} 个文件在 ${docsDir} 目录`);

    let totalDocuments = 0;

    // 处理每个文件
    for (const file of files) {
      const filePath = path.join(docsDir, file);
      const stat = await fs.stat(filePath);

      if (stat.isFile()) {
        const documents = await processFile(filePath, splitter);
        if (documents.length > 0) {
          await vectorStore.addDocuments(documents);
          totalDocuments += documents.length;
        }
      }
    }

    console.log(`✅ 文档导入完成！总共处理了 ${totalDocuments} 个文档块`);
    return totalDocuments;
  } catch (error) {
    console.error("❌ 文档导入失败:", error);
    throw error;
  }
}

// NOTE: 清除所有已索引的文档
export async function clearIndex() {
  console.log("🗑️ 清除索引...");
  try {
    await vectorStore.initialize();
    await vectorStore.clear();
    console.log("✅ 索引已清除");
  } catch (error) {
    console.error("❌ 清除索引失败:", error);
    throw error;
  }
}

// NOTE: 增量导入指定文件
// MARK: 增量导入
export async function ingestFiles(filePaths: string[]) {
  if (filePaths.length === 0) return 0;

  console.log("👏 开始增量导入指定文件...");

  try {
    await vectorStore.initialize();

    const splitter = new SimpleTextSplitter(512, 64);

    let totalDocuments = 0;

    for (const filePath of filePaths) {
      const documents = await processFile(filePath, splitter);
      if (documents.length > 0) {
        await vectorStore.addDocuments(documents);
        totalDocuments += documents.length;
      }
    }

    console.log(`✅ 增量导入完成，共处理 ${totalDocuments} 个文档块`);
    return totalDocuments;
  } catch (error) {
    console.error("❌ 增量导入失败:", error);
    throw error;
  }
}

// NOTE: 如果直接运行此脚本
// 检查是否作为主模块运行
const isMainModule =
  require.main === module || process.argv[1]?.includes("ingest.ts");

if (isMainModule) {
  const command = process.argv[2];

  switch (command) {
    case "clear":
      clearIndex().catch(console.error);
      break;
    case "ingest":
      const docsPath = process.argv[3] || "./docs";
      ingestDocuments(docsPath).catch(console.error);
      break;
    default:
      console.log("使用方法:");
      console.log("  npm run ingest        # 导入 ./docs 目录下的文档");
      console.log("  npm run ingest clear  # 清除现有索引");
      break;
  }
}
