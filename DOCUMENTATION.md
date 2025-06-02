# 本地文档上传与增量向量化指南

## 功能概览
1. **前端拖拽 / 选择文件** → 文件首先保存到浏览器的 IndexedDB。
2. 点击"同步"或保持联网状态，前端会自动将 *未上传* 的文件 POST 到 `/api/upload`。
3. 服务器保存文件到 `./docs/` 后，调用 `ingestFiles()` 对新增文件做增量向量化。
4. 完成后即可立即通过 RAG 问答检索新知识。

## 前端使用
1. 进入 `localhost:3000/docs`。
2. 将 `.txt`/`.md`/`.json` 文件拖拽到上传区域，或点击"选择文件"。
3. 页面显示文件列表及状态：（`pending` → `uploading` → `synced` 或 `error`）。
4. 如需手动上传，点击"同步所有待上传文件"。

## 支持的文件格式
- `.txt`
- `.md`
- `.json`

> 其他格式会被自动忽略。

## 后端接口说明
### POST /api/upload
- **请求**：multipart/form-data, 字段名不限。
- **响应**：`{ status: "success", files: 3 }`
- **流程**：
  1. 保存文件到 `./docs/<文件名>`（自动创建目录）。
  2. 调用 `ingestFiles([path1, path2...])` 完成增量向量化。

## 本地开发依赖
```bash
pnpm add idb
```

## 常见问题
| 现象 | 解决方案 |
|---|---|
| 文件上传失败（error 状态） | 检查后端日志，确保 `docs` 目录可写，Ollama & ChromaDB 正常运行 |
| 夜间断网导致 pending 累积 | 恢复联网后点击"同步所有待上传文件" |

## 目录结构变更
```
src/hooks/useDocStore.ts      # IndexedDB 封装
src/components/doc/UploadArea.tsx
src/app/docs/page.tsx         # 文件上传页面
src/app/api/upload/route.ts   # 上传接口
```

至此，小白用户只需：
1. 打开浏览器 → /docs → 拖文件 → 等待"synced"
2. 打开 /rag 页面直接提问。 