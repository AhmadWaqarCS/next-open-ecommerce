import fs from "node:fs";
import path from "node:path";
import { Disk } from "flydrive";
import { FSDriver } from "flydrive/drivers/fs";
import { S3Driver } from "flydrive/drivers/s3";
import { GCSDriver } from "flydrive/drivers/gcs";
import prisma from "@/lib/prisma";

export interface StorageEnvCheckResult {
  valid: boolean;
  error?: string;
  envStatus: Record<string, { key: string; present: boolean }>;
}

/**
 * Instantiates a Flydrive Disk for a given storage option key based on process.env configuration.
 */
export function getFlydriveDisk(storageKey: string): Disk {
  switch (storageKey) {
    case "local": {
      const location = process.env.LOCAL_UPLOADS_DIR
        ? path.resolve(process.env.LOCAL_UPLOADS_DIR)
        : path.join(process.cwd(), "uploads");

      // Ensure local target directory exists
      if (!fs.existsSync(location)) {
        fs.mkdirSync(location, { recursive: true });
      }

      const fsDriver = new FSDriver({
        location,
        visibility: "public",
      });
      return new Disk(fsDriver);
    }

    case "aws_s3": {
      const key = process.env.AWS_S3_KEY;
      const secret = process.env.AWS_S3_SECRET;
      const bucket = process.env.AWS_S3_BUCKET;
      const region = process.env.AWS_S3_REGION || "us-east-1";

      if (!key || !secret || !bucket) {
        throw new Error("AWS S3 environment variables (AWS_S3_KEY, AWS_S3_SECRET, AWS_S3_BUCKET) are missing.");
      }

      const s3Driver = new S3Driver({
        credentials: {
          accessKeyId: key,
          secretAccessKey: secret,
        },
        region,
        bucket,
        visibility: "public",
      });
      return new Disk(s3Driver);
    }

    case "cloudflare_r2": {
      const key = process.env.CLOUDFLARE_R2_KEY;
      const secret = process.env.CLOUDFLARE_R2_SECRET;
      const bucket = process.env.CLOUDFLARE_R2_BUCKET;
      const endpoint = process.env.CLOUDFLARE_R2_ENDPOINT;

      if (!key || !secret || !bucket || !endpoint) {
        throw new Error(
          "Cloudflare R2 environment variables (CLOUDFLARE_R2_KEY, CLOUDFLARE_R2_SECRET, CLOUDFLARE_R2_BUCKET, CLOUDFLARE_R2_ENDPOINT) are missing."
        );
      }

      const r2Driver = new S3Driver({
        credentials: {
          accessKeyId: key,
          secretAccessKey: secret,
        },
        region: "auto",
        bucket,
        endpoint,
        visibility: "public",
      });
      return new Disk(r2Driver);
    }

    case "minio": {
      const key = process.env.MINIO_KEY;
      const secret = process.env.MINIO_SECRET;
      const bucket = process.env.MINIO_BUCKET;
      const endpoint = process.env.MINIO_ENDPOINT;

      if (!key || !secret || !bucket || !endpoint) {
        throw new Error(
          "MinIO environment variables (MINIO_KEY, MINIO_SECRET, MINIO_BUCKET, MINIO_ENDPOINT) are missing."
        );
      }

      const minioDriver = new S3Driver({
        credentials: {
          accessKeyId: key,
          secretAccessKey: secret,
        },
        region: "us-east-1",
        bucket,
        endpoint,
        forcePathStyle: true,
        visibility: "public",
      });
      return new Disk(minioDriver);
    }

    case "google_cloud": {
      const keyFile = process.env.GCS_KEY_FILE;
      const bucket = process.env.GCS_BUCKET;

      if (!keyFile || !bucket) {
        throw new Error("Google Cloud environment variables (GCS_KEY_FILE, GCS_BUCKET) are missing.");
      }

      const resolvedKeyPath = path.resolve(keyFile);
      if (!fs.existsSync(resolvedKeyPath)) {
        throw new Error(`Google Cloud Service Account key file not found at path: '${resolvedKeyPath}'`);
      }

      const gcsDriver = new GCSDriver({
        keyFilename: resolvedKeyPath,
        bucket,
        visibility: "public",
      });
      return new Disk(gcsDriver);
    }

    default:
      throw new Error(`Unsupported storage option key '${storageKey}'.`);
  }
}

/**
 * Fetches the active storage option based on process.env.ACTIVE_STORAGE_DRIVER or DB configuration,
 * and returns its Flydrive Disk instance. Defaults to 'local' if not specified.
 */
export async function getActiveFlydriveDisk(): Promise<{ disk: Disk; storageOptionKey: string; cdnUrl: string | null }> {
  // 1. Prioritize process.env.ACTIVE_STORAGE_DRIVER
  if (process.env.ACTIVE_STORAGE_DRIVER && process.env.ACTIVE_STORAGE_DRIVER.trim().length > 0) {
    const activeKey = process.env.ACTIVE_STORAGE_DRIVER.trim().toLowerCase();
    try {
      const disk = getFlydriveDisk(activeKey);
      const cdnUrl = process.env.STORAGE_CDN_URL || null;
      return { disk, storageOptionKey: activeKey, cdnUrl };
    } catch (err) {
      console.warn(`[Flydrive] Environment ACTIVE_STORAGE_DRIVER '${activeKey}' failed to load, falling back.`);
    }
  }

  // 2. Fallback to DB is_active setting
  try {
    const activeOption = await prisma.storage_option.findFirst({
      where: { is_active: true },
    });

    const key = activeOption?.key || "local";
    const disk = getFlydriveDisk(key);
    return { disk, storageOptionKey: key, cdnUrl: activeOption?.cdn_url || null };
  } catch (error) {
    // Fallback to local FS disk if DB lookup fails
    return { disk: getFlydriveDisk("local"), storageOptionKey: "local", cdnUrl: null };
  }
}

/**
 * Validates that required process.env variables are present for a given storage option key
 * and performs a quick test ping (put + delete).
 */
export async function verifyStorageEnv(storageKey: string): Promise<StorageEnvCheckResult> {
  const envStatus: Record<string, { key: string; present: boolean }> = {};

  const option = await prisma.storage_option.findUnique({
    where: { key: storageKey },
  });

  if (!option) {
    return { valid: false, error: "Storage option not found.", envStatus };
  }

  const requiredKeys = (option.env_keys as string[]) || [];

  let allKeysPresent = true;
  for (const envKey of requiredKeys) {
    const isPresent = Boolean(process.env[envKey] && process.env[envKey]!.trim().length > 0);
    envStatus[envKey] = { key: envKey, present: isPresent };
    if (!isPresent) {
      allKeysPresent = false;
    }
  }

  if (!allKeysPresent) {
    const missingKeys = requiredKeys.filter((k) => !envStatus[k].present);
    return {
      valid: false,
      error: `Missing environment variables: ${missingKeys.join(", ")}`,
      envStatus,
    };
  }

  // Attempt live connection test using Flydrive ping file
  try {
    const disk = getFlydriveDisk(storageKey);
    const testFileName = `.healthcheck-${Date.now()}.tmp`;
    const testContent = Buffer.from("Flydrive Healthcheck");

    await disk.put(testFileName, testContent);
    const exists = await disk.exists(testFileName);
    if (exists) {
      await disk.delete(testFileName);
    }

    return { valid: true, envStatus };
  } catch (err: any) {
    return {
      valid: false,
      error: `Storage connection test failed: ${err?.message || "Unknown error"}`,
      envStatus,
    };
  }
}

/**
 * Helper to recursively list all file entries from a Flydrive disk.
 */
export async function getAllDiskFiles(
  disk: Disk,
  prefix = ""
): Promise<{ key: string; name: string }[]> {
  const files: { key: string; name: string }[] = [];
  try {
    const list = await disk.listAll(prefix);
    for (const item of list.objects) {
      if (item.isFile) {
        files.push({ key: item.key, name: item.name });
      } else if (item.isDirectory) {
        const dirPrefix = (item as any).prefix || item.name;
        const subFiles = await getAllDiskFiles(disk, dirPrefix);
        files.push(...subFiles);
      }
    }
  } catch {
    // empty list if dir doesn't exist
  }
  return files;
}

