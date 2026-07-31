import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

const MIME_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".avif": "image/avif",
  ".pdf": "application/pdf",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: pathSegments } = await params;

  if (!pathSegments || pathSegments.length === 0) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const uploadsDir = path.join(process.cwd(), "uploads");
  const filePath = path.resolve(uploadsDir, ...pathSegments);

  // Security Check: Prevent directory traversal attack outside uploads folder
  if (!filePath.startsWith(path.resolve(uploadsDir))) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const fileBuffer = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": fileBuffer.length.toString(),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    return new NextResponse("Image Not Found", { status: 404 });
  }
}

export async function HEAD(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: pathSegments } = await params;

  if (!pathSegments || pathSegments.length === 0) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const uploadsDir = path.join(process.cwd(), "uploads");
  const filePath = path.resolve(uploadsDir, ...pathSegments);

  // Security Check: Prevent directory traversal attack outside uploads folder
  if (!filePath.startsWith(path.resolve(uploadsDir))) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const fileStat = await fs.stat(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    return new NextResponse(null, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": fileStat.size.toString(),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    return new NextResponse("Image Not Found", { status: 404 });
  }
}
