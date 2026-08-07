import path from "node:path";
import prisma from "@/lib/prisma";
import { getActiveFlydriveDisk, getFlydriveDisk, verifyStorageEnv, getAllDiskFiles } from "@/lib/storage/flydrive";

export interface StorageOptionDTO {
  id: number;
  key: string;
  name: string;
  driver: string;
  description: string | null;
  is_active: boolean;
  env_keys: string[];
  cdn_url: string | null;
  created_at: Date;
  updated_at: Date;
  env_status: Record<string, boolean>;
  is_env_complete: boolean;
}

export interface StorageMetricsDTO {
  totalFilesCount: number;
  totalSizeBytes: number;
  formattedTotalSize: string;
}

export interface SaveMediaResult {
  filePath: string;
  relativePath: string;
  fileName: string;
  size: number;
}

function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Constructs the public URL for a file based on active storage provider configuration.
 */
export function getPublicUrlForStorageKey(
  storageKey: string,
  fileKey: string,
  cdnUrl?: string | null
): string {
  const cleanKey = fileKey.replace(/^\/+/, "");

  if (cdnUrl && cdnUrl.trim().length > 0) {
    const baseCdn = cdnUrl.trim().replace(/\/+$/, "");
    return `${baseCdn}/${cleanKey}`;
  }

  switch (storageKey) {
    case "aws_s3": {
      const bucket = process.env.AWS_S3_BUCKET || "";
      const region = process.env.AWS_S3_REGION || "us-east-1";
      return `https://${bucket}.s3.${region}.amazonaws.com/${cleanKey}`;
    }

    case "cloudflare_r2": {
      const endpoint = (process.env.CLOUDFLARE_R2_ENDPOINT || "").replace(/\/+$/, "");
      const bucket = process.env.CLOUDFLARE_R2_BUCKET || "";
      return `${endpoint}/${bucket}/${cleanKey}`;
    }

    case "minio": {
      const endpoint = (process.env.MINIO_ENDPOINT || "http://127.0.0.1:9000").replace(/\/+$/, "");
      const bucket = process.env.MINIO_BUCKET || "";
      return `${endpoint}/${bucket}/${cleanKey}`;
    }

    case "google_cloud": {
      const bucket = process.env.GCS_BUCKET || "";
      return `https://storage.googleapis.com/${bucket}/${cleanKey}`;
    }

    case "local":
    default: {
      return `/uploads/${cleanKey}`;
    }
  }
}

import { extractFileKeyFromUrl } from "@/lib/media-types";
export { extractFileKeyFromUrl };

/**
 * Determines the storage disk key from a URL's origin.
 * Returns the detected key or null if undetermined.
 */
function detectStorageKeyFromUrl(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();

  // Local uploads path
  if (trimmed.startsWith("/uploads/") || trimmed.startsWith("uploads/")) {
    return "local";
  }

  // CDN URL — check all known CDN prefixes
  const cdnUrl = process.env.STORAGE_CDN_URL;
  if (cdnUrl && trimmed.startsWith(cdnUrl.trim().replace(/\/+$/, ""))) {
    return null;
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const parsed = new URL(trimmed);
      const host = parsed.hostname.toLowerCase();
      const pathname = parsed.pathname;

      // Google Cloud Storage
      const gcsBucket = process.env.GCS_BUCKET?.toLowerCase();
      if (
        (gcsBucket && (host === "storage.googleapis.com" || host.includes("googleapis.com") || host.includes(gcsBucket) || pathname.includes(`/${gcsBucket}/`))) ||
        host.includes("storage.googleapis.com")
      ) {
        return "google_cloud";
      }

      // AWS S3
      const s3Bucket = process.env.AWS_S3_BUCKET?.toLowerCase();
      if (
        (s3Bucket && (host.includes("amazonaws.com") || host.includes(s3Bucket) || pathname.includes(`/${s3Bucket}/`))) ||
        host.includes("amazonaws.com")
      ) {
        return "aws_s3";
      }

      // Cloudflare R2
      const r2Endpoint = process.env.CLOUDFLARE_R2_ENDPOINT;
      const r2Bucket = process.env.CLOUDFLARE_R2_BUCKET?.toLowerCase();
      if (
        (r2Endpoint && host === new URL(r2Endpoint).hostname.toLowerCase()) ||
        (r2Bucket && (host.includes(r2Bucket) || pathname.includes(`/${r2Bucket}/`))) ||
        host.includes("r2.cloudflarestorage.com")
      ) {
        return "cloudflare_r2";
      }

      // MinIO
      const minioEndpoint = process.env.MINIO_ENDPOINT;
      const minioBucket = process.env.MINIO_BUCKET?.toLowerCase();
      if (
        (minioEndpoint && host === new URL(minioEndpoint).hostname.toLowerCase()) ||
        (minioBucket && (host.includes(minioBucket) || pathname.includes(`/${minioBucket}/`)))
      ) {
        return "minio";
      }
    } catch {
      // ignore parse errors
    }
  }

  return null;
}

/**
 * Saves binary or Base64 media through active Flydrive storage.
 * If input is already an existing image URL string (e.g. "/uploads/..." or "https://..."),
 * it returns the URL directly without re-uploading.
 */
export async function saveMediaToStorage(
  fileBinaryOrString: Buffer | Uint8Array | ArrayBuffer | Blob | string | null | undefined,
  fileNameParam?: string,
  destination = "media"
): Promise<SaveMediaResult | null> {
  if (!fileBinaryOrString) return null;

  let buffer: Buffer | null = null;
  let targetFileName = fileNameParam || "";

  if (typeof fileBinaryOrString === "string") {
    const trimmed = fileBinaryOrString.trim();
    if (!trimmed) return null;

    // Check if base64 Data URI
    const base64Regex = /^data:(image\/[a-zA-Z+-]+);base64,(.+)$/;
    const match = trimmed.match(base64Regex);

    if (match) {
      const mimeType = match[1];
      const base64Data = match[2];
      buffer = Buffer.from(base64Data, "base64");

      let ext = "png";
      if (mimeType.includes("jpeg") || mimeType.includes("jpg")) ext = "jpg";
      else if (mimeType.includes("webp")) ext = "webp";
      else if (mimeType.includes("gif")) ext = "gif";
      else if (mimeType.includes("svg")) ext = "svg";
      else if (mimeType.includes("avif")) ext = "avif";

      const randomDigits = Math.floor(1000 + Math.random() * 9000);
      targetFileName = `${Date.now()}_${randomDigits}.${ext}`;
    } else {
      // Already an existing URL string -> return directly without re-uploading
      return {
        filePath: extractFileKeyFromUrl(trimmed),
        relativePath: trimmed,
        fileName: path.basename(trimmed),
        size: 0,
      };
    }
  } else if (Buffer.isBuffer(fileBinaryOrString)) {
    buffer = fileBinaryOrString;
  } else if (fileBinaryOrString instanceof Uint8Array) {
    buffer = Buffer.from(fileBinaryOrString.buffer, fileBinaryOrString.byteOffset, fileBinaryOrString.byteLength);
  } else if (fileBinaryOrString instanceof ArrayBuffer) {
    buffer = Buffer.from(fileBinaryOrString);
  } else if (typeof Blob !== "undefined" && fileBinaryOrString instanceof Blob) {
    const arrayBuffer = await fileBinaryOrString.arrayBuffer();
    buffer = Buffer.from(arrayBuffer);
  }

  if (!buffer) return null;

  // File size check (10MB limit)
  if (buffer.length > 10 * 1024 * 1024) {
    throw new Error("File size exceeds maximum limit of 10MB.");
  }

  if (!targetFileName) {
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    targetFileName = `${Date.now()}_${randomDigits}.webp`;
  }

  const cleanOriginalName = path.basename(targetFileName).replace(/[^a-zA-Z0-9_.-]/g, "_");
  const ext = path.extname(cleanOriginalName).toLowerCase();
  const baseName = path.basename(cleanOriginalName, ext);
  const uniquePrefix = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : Date.now().toString(36);
  const safeFileName = `${baseName}-${uniquePrefix}${ext}`;

  const normalizedSubPath = destination
    ? destination.split(/[/\\]/).filter(Boolean).join("/")
    : "";

  const fileKey = normalizedSubPath
    ? `${normalizedSubPath}/${safeFileName}`
    : safeFileName;

  // Save via active Flydrive Disk
  const { disk, storageOptionKey, cdnUrl } = await getActiveFlydriveDisk();
  await disk.put(fileKey, buffer);

  const publicUrl = getPublicUrlForStorageKey(storageOptionKey, fileKey, cdnUrl);

  return {
    filePath: fileKey,
    relativePath: publicUrl,
    fileName: safeFileName,
    size: buffer.length,
  };
}

/**
 * Deletes a file from the storage disk where it originates.
 * Detects the origin disk from the URL structure (uploads path, GCS host, S3 host, etc.).
 * Falls back to active disk, local disk, and all configured drivers to guarantee deletion.
 */
export async function deleteMediaFromStorage(url: string): Promise<boolean> {
  if (!url) return true;

  const cleanKey = extractFileKeyFromUrl(url);
  if (!cleanKey) return true;

  try {
    const detectedKey = detectStorageKeyFromUrl(url);

    // 1. Try detected key first
    if (detectedKey) {
      try {
        const disk = getFlydriveDisk(detectedKey);
        if (await disk.exists(cleanKey)) {
          await disk.delete(cleanKey);
          return true;
        }
      } catch (err) {
        console.warn(`[Delete Media] Failed to delete from detected disk '${detectedKey}':`, err);
      }
    }

    // 2. Try active disk
    try {
      const { disk: activeDisk } = await getActiveFlydriveDisk();
      if (await activeDisk.exists(cleanKey)) {
        await activeDisk.delete(cleanKey);
        return true;
      }
    } catch {
      // ignore
    }

    // 3. Try all remaining storage drivers as fallback
    const allDrivers = ["google_cloud", "aws_s3", "cloudflare_r2", "minio", "local"];
    for (const driverKey of allDrivers) {
      if (driverKey === detectedKey) continue;
      try {
        const disk = getFlydriveDisk(driverKey);
        if (await disk.exists(cleanKey)) {
          await disk.delete(cleanKey);
          return true;
        }
      } catch {
        // continue
      }
    }

    return true; // file not found anywhere — treat as already deleted
  } catch (err) {
    console.error(`[Delete Media] Error deleting '${url}':`, err);
    return false;
  }
}

/**
 * Deletes multiple files from storage in batches.
 */
export async function bulkDeleteMediaFromStorage(urls: string[], batchSize = 5) {
  if (!urls || urls.length === 0) return;

  for (let i = 0; i < urls.length; i += batchSize) {
    const chunk = urls.slice(i, i + batchSize);
    await Promise.allSettled(chunk.map((url) => deleteMediaFromStorage(url)));
  }
}

/**
 * Retrieves all static storage options from database with process.env completeness status.
 */
export async function getAllStorageOptionsFromDB(): Promise<StorageOptionDTO[]> {
  const options = await prisma.storage_option.findMany({
    orderBy: { id: "asc" },
  });

  const activeDriverEnv = process.env.ACTIVE_STORAGE_DRIVER?.trim().toLowerCase();

  return options.map((opt) => {
    const envKeys = (opt.env_keys as string[]) || [];
    const env_status: Record<string, boolean> = {};
    let is_env_complete = true;

    for (const k of envKeys) {
      const isPresent = Boolean(process.env[k] && process.env[k]!.trim().length > 0);
      env_status[k] = isPresent;
      if (!isPresent && opt.key !== "local") {
        is_env_complete = false;
      }
    }

    if (opt.key === "local") {
      is_env_complete = true;
    }

    const isActive = activeDriverEnv
      ? opt.key === activeDriverEnv
      : opt.is_active;

    return {
      id: opt.id,
      key: opt.key,
      name: opt.name,
      driver: opt.driver,
      description: opt.description,
      is_active: isActive,
      env_keys: envKeys,
      cdn_url: opt.cdn_url,
      created_at: opt.created_at,
      updated_at: opt.updated_at,
      env_status,
      is_env_complete,
    };
  });
}

/**
 * Retrieves a single storage option from DB with ENV annotations.
 */
export async function getSingleStorageOptionFromDB(key: string): Promise<StorageOptionDTO | null> {
  const opt = await prisma.storage_option.findUnique({
    where: { key },
  });

  if (!opt) return null;

  const envKeys = (opt.env_keys as string[]) || [];
  const env_status: Record<string, boolean> = {};
  let is_env_complete = true;

  for (const k of envKeys) {
    const isPresent = Boolean(process.env[k] && process.env[k]!.trim().length > 0);
    env_status[k] = isPresent;
    if (!isPresent) {
      is_env_complete = false;
    }
  }

  return {
    id: opt.id,
    key: opt.key,
    name: opt.name,
    driver: opt.driver,
    description: opt.description,
    is_active: opt.is_active,
    env_keys: envKeys,
    cdn_url: opt.cdn_url,
    created_at: opt.created_at,
    updated_at: opt.updated_at,
    env_status,
    is_env_complete,
  };
}

/**
 * Activates a storage option in DB after verifying environment variables and test connection.
 * Note: ACTIVE_STORAGE_DRIVER env var takes priority over this DB setting at runtime.
 */
export async function activateStorageOptionInDB(storageKey: string, userId: number) {
  const check = await verifyStorageEnv(storageKey);
  if (!check.valid) {
    throw new Error(check.error || `Failed to verify environment configuration for '${storageKey}'.`);
  }

  return await prisma.$transaction(async (tx) => {
    await tx.storage_option.updateMany({
      data: { is_active: false },
    });

    const updated = await tx.storage_option.update({
      where: { key: storageKey },
      data: { is_active: true },
    });

    await tx.activity_log.create({
      data: {
        action: "ACTIVATE_STORAGE_OPTION",
        entity_type: "storage_option",
        entity_id: storageKey,
        user_id: userId,
        status: "SUCCESS",
        details: { storage_key: storageKey, name: updated.name },
      },
    });

    return updated;
  });
}

/**
 * Computes stored file metrics (count, total size) for a specific storage option using Flydrive.
 */
export async function getStorageMetrics(storageKey: string): Promise<StorageMetricsDTO> {
  try {
    const disk = getFlydriveDisk(storageKey);
    const files = await getAllDiskFiles(disk);
    let totalSizeBytes = 0;

    for (const f of files) {
      try {
        const meta = await disk.getMetaData(f.key);
        totalSizeBytes += meta.contentLength || 0;
      } catch {
        // ignore individual metadata error
      }
    }

    return {
      totalFilesCount: files.length,
      totalSizeBytes,
      formattedTotalSize: formatBytes(totalSizeBytes),
    };
  } catch {
    return {
      totalFilesCount: 0,
      totalSizeBytes: 0,
      formattedTotalSize: "0 Bytes",
    };
  }
}
