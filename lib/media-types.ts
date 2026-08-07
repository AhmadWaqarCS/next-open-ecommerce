/**
 * Represents a single file fetched from a storage medium (local, GCS, S3, etc.).
 */
export interface StorageFileItem {
  url: string;          // Full public URL, e.g. "/uploads/products/img.jpg" or "https://..."
  key: string;          // Relative file key in the storage bucket
  storageMedium: string; // e.g. "local", "google_cloud", "aws_s3"
  storageName: string;  // e.g. "Local Disk", "Google Cloud Storage"
  fileName: string;     // e.g. "img.jpg"
  subfolder: string;    // e.g. "products", "categories", "root"
}

/**
 * Represents a single image URL reference found in the database.
 */
export interface DBImageRecord {
  url: string;
  table: "category" | "product" | "product_image" | "product_variant" | "site_config";
  entityId?: number;
  entityName?: string;
  fieldName?: string; // e.g. "image_url", "feature_image_url", "light_logo_url"
}

/**
 * Result of client-side analysis matching storage files against DB records.
 */
export interface AnalysisResult {
  connected: Array<{ item: StorageFileItem; dbRecords: DBImageRecord[] }>;
  orphaned: StorageFileItem[];   // in storage, not in DB
  broken: DBImageRecord[];       // in DB, not in storage
}

export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Extracts raw relative file key from full HTTP/HTTPS public URL or local path.
 * Used for matching storage URLs against DB image paths.
 */
export function extractFileKeyFromUrl(urlOrPath: string): string {
  if (!urlOrPath) return "";
  let str = urlOrPath.trim();

  if (str.startsWith("http://") || str.startsWith("https://")) {
    try {
      const urlObj = new URL(str);
      let pathname = urlObj.pathname.replace(/^\/+/, "");
      const parts = pathname.split("/");
      if (
        parts.length > 1 &&
        parts[0] !== "uploads" &&
        parts[0] !== "products" &&
        parts[0] !== "categories" &&
        parts[0] !== "branding" &&
        parts[0] !== "media"
      ) {
        pathname = parts.slice(1).join("/");
      }
      return pathname;
    } catch {
      // Fallback
    }
  }

  return str
    .replace(/^\/uploads\//, "")
    .replace(/^uploads\//, "")
    .replace(/^\/+/, "");
}
