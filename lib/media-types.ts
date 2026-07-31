export interface MediaConnection {
  entityType:
    | "category"
    | "product_feature"
    | "product_gallery"
    | "product_variant"
    | "site_logo_light"
    | "site_logo_dark"
    | "site_favicon";
  entityId?: number;
  entityName: string;
  slug?: string;
  details: string;
  galleryImageId?: number;
}

export interface MediaFileItem {
  relativePath: string; // e.g. "/uploads/products/nike-air.png"
  fileName: string;     // e.g. "nike-air.png"
  subfolder: string;    // e.g. "products", "categories", or "root"
  size: number;         // size in bytes
  formattedSize: string; // e.g. "1.2 MB"
  mimeType: string;     // e.g. "image/png"
  updatedAt: string;    // ISO string date
  connections: MediaConnection[];
  isOrphan: boolean;
}

export interface BrokenLinkItem {
  url: string;
  entityType:
    | "category"
    | "product_feature"
    | "product_gallery"
    | "product_variant"
    | "site_logo_light"
    | "site_logo_dark"
    | "site_favicon";
  entityId?: number;
  entityName: string;
  slug?: string;
  details: string;
  galleryImageId?: number;
}

export interface MediaStorageStats {
  totalDiskSizeBytes: number;
  formattedTotalDiskSize: string;
  totalFilesCount: number;
  connectedFilesCount: number;
  orphanFilesCount: number;
  wastedOrphanSizeBytes: number;
  formattedWastedOrphanSize: string;
  brokenLinksCount: number;
}

export interface MediaScanResult {
  files: MediaFileItem[];
  brokenLinks: BrokenLinkItem[];
  stats: MediaStorageStats;
}

export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}
