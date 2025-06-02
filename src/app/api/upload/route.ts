import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { ingestFiles } from "@/lib/ingest";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files: File[] = [];

    for (const value of formData.values()) {
      if (value instanceof File) {
        files.push(value);
      }
    }

    if (files.length === 0) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const libraryId = formData.get("libraryId") as string | null;
    const savedPaths: string[] = [];

    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const saveDir = libraryId
        ? path.join(process.cwd(), "docs", libraryId)
        : path.join(process.cwd(), "docs");
      const savePath = path.join(saveDir, file.name);

      // 确保目录存在
      await fs.mkdir(path.dirname(savePath), { recursive: true });
      await fs.writeFile(savePath, buffer);
      savedPaths.push(savePath);
    }

    // 增量向量化
    await ingestFiles(savedPaths, libraryId || undefined);

    return NextResponse.json({
      status: "success",
      files: files.length,
      libraryId,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
