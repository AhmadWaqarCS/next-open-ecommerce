import fs from "node:fs/promises";
import path from "node:path";

export interface SaveFileInput {
  fileBinary: Buffer | Uint8Array | ArrayBuffer | Blob;
  fileName: string;
  destination?: string;
}

export interface SaveFileResult {
  filePath: string;
  relativePath: string;
  fileName: string;
  size: number;
}

/**
 * Saves a binary file to the `uploads/` folder (or a specified destination subdirectory within `uploads/`).
 *
 * @param fileBinary The binary content of the file (Buffer, Uint8Array, ArrayBuffer, or Blob)
 * @param fileName The target file name (e.g. "category-banner.png")
 * @param destination Subdirectory destination path relative to uploads folder (e.g. "categories", "products")
 * @returns Object containing absolute filePath, relative path (/uploads/...), fileName, and file size in bytes
 */
export async function saveFileToUploads(
  fileBinary: Buffer | Uint8Array | ArrayBuffer | Blob,
  fileName: string,
  destination?: string
): Promise<SaveFileResult>;
export async function saveFileToUploads(
  input: SaveFileInput
): Promise<SaveFileResult>;
export async function saveFileToUploads(
  inputOrBinary: Buffer | Uint8Array | ArrayBuffer | Blob | SaveFileInput,
  fileNameParam?: string,
  destinationParam?: string
): Promise<SaveFileResult> {
  let fileBinary: Buffer | Uint8Array | ArrayBuffer | Blob;
  let fileName: string;
  let destination: string;

  if (
    typeof inputOrBinary === "object" &&
    inputOrBinary !== null &&
    "fileBinary" in inputOrBinary &&
    "fileName" in inputOrBinary
  ) {
    fileBinary = inputOrBinary.fileBinary;
    fileName = inputOrBinary.fileName;
    destination = inputOrBinary.destination || "";
  } else {
    fileBinary = inputOrBinary as Buffer | Uint8Array | ArrayBuffer | Blob;
    fileName = fileNameParam!;
    destination = destinationParam || "";
  }

  if (!fileBinary) {
    throw new Error("File binary content is required.");
  }
  if (!fileName) {
    throw new Error("File name is required.");
  }

  let buffer: Buffer;
  if (Buffer.isBuffer(fileBinary)) {
    buffer = fileBinary;
  } else if (fileBinary instanceof Uint8Array) {
    buffer = Buffer.from(fileBinary.buffer, fileBinary.byteOffset, fileBinary.byteLength);
  } else if (fileBinary instanceof ArrayBuffer) {
    buffer = Buffer.from(fileBinary);
  } else if (typeof Blob !== "undefined" && fileBinary instanceof Blob) {
    const arrayBuffer = await fileBinary.arrayBuffer();
    buffer = Buffer.from(arrayBuffer);
  } else {
    throw new Error("Unsupported file binary format.");
  }

  // File size validation (10MB maximum limit)
  const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    throw new Error("File size exceeds maximum limit of 10MB.");
  }

  const uploadsDir = path.join(process.cwd(), "uploads");

  // Prevent path traversal attacks outside uploads directory
  const targetDir = path.resolve(uploadsDir, destination);
  if (!targetDir.startsWith(path.resolve(uploadsDir))) {
    throw new Error("Security Error: Destination path must remain inside the uploads directory.");
  }

  await fs.mkdir(targetDir, { recursive: true });

  const cleanOriginalName = path.basename(fileName).replace(/[^a-zA-Z0-9_.-]/g, "_");
  const ext = path.extname(cleanOriginalName).toLowerCase();

  const ALLOWED_EXTENSIONS = [
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".gif",
    ".svg",
    ".pdf",
    ".avif",
  ];
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new Error(`Security Error: File extension '${ext}' is not permitted.`);
  }

  const baseName = path.basename(cleanOriginalName, ext);
  const uniquePrefix = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : Date.now().toString(36);
  const safeFileName = `${baseName}-${uniquePrefix}${ext}`;

  const targetPath = path.join(targetDir, safeFileName);

  // Write binary file to disk
  await fs.writeFile(targetPath, buffer);

  // Construct clean relative public URL path
  const normalizedSubPath = destination
    ? destination.split(/[/\\]/).filter(Boolean).join("/")
    : "";
  const relativePath = normalizedSubPath
    ? `/uploads/${normalizedSubPath}/${safeFileName}`
    : `/uploads/${safeFileName}`;

  return {
    filePath: targetPath,
    relativePath,
    fileName: safeFileName,
    size: buffer.length,
  };
}
