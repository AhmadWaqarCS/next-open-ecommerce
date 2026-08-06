import fs from "node:fs/promises";
import path from "node:path";
import prisma from "./prisma";
import {
  MediaConnection,
  MediaFileItem,
  BrokenLinkItem,
  MediaScanResult,
  formatBytes,
} from "./media-types";

export * from "./media-types";

function getMimeType(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  switch (ext) {
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    case ".svg":
      return "image/svg+xml";
    case ".avif":
      return "image/avif";
    case ".ico":
      return "image/x-icon";
    default:
      return "application/octet-stream";
  }
}

/**
 * Normalizes relative image URLs to facilitate matching.
 * e.g. "uploads/categories/tech.png" -> "/uploads/categories/tech.png"
 */
function normalizeUrlPath(url?: string | null): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("/")) return trimmed;
  return `/${trimmed}`;
}

/**
 * Scans physical uploads/ folder and queries Prisma DB to map images and calculate disk stats.
 */
export async function scanMediaStorage(): Promise<MediaScanResult> {
  const uploadsDir = path.join(process.cwd(), "uploads");

  // Ensure uploads directory exists
  try {
    await fs.mkdir(uploadsDir, { recursive: true });
  } catch {
    // Already exists or created
  }

  // 1. Recursively walk uploads directory
  interface DiskFile {
    relativePath: string;
    fileName: string;
    subfolder: string;
    size: number;
    updatedAt: string;
  }

  const diskFiles: DiskFile[] = [];

  async function walkDir(currentDir: string) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        await walkDir(fullPath);
      } else if (entry.isFile()) {
        const stats = await fs.stat(fullPath);
        const relFromUploads = path.relative(uploadsDir, fullPath).split(path.sep).join("/");
        const relativeUrlPath = `/uploads/${relFromUploads}`;
        const parts = relFromUploads.split("/");
        const subfolder = parts.length > 1 ? parts[0] : "root";

        diskFiles.push({
          relativePath: relativeUrlPath,
          fileName: entry.name,
          subfolder,
          size: stats.size,
          updatedAt: stats.mtime.toISOString(),
        });
      }
    }
  }

  await walkDir(uploadsDir);

  // 2. Fetch all DB image references inside a single Prisma transaction
  const [categories, products, productImages, productVariants, siteConfig] =
    await prisma.$transaction(async (tx) => {
      return Promise.all([
        tx.category.findMany({
          where: { deleted_at: null },
          select: { id: true, name: true, slug: true, image_url: true },
        }),
        tx.product.findMany({
          where: { deleted_at: null },
          select: {
            id: true,
            name: true,
            slug: true,
            feature_image_url: true,
            sku: true,
          },
        }),
        tx.product_image.findMany({
          where: { deleted_at: null },
          select: {
            id: true,
            product_id: true,
            url: true,
            alt_text: true,
            product: { select: { name: true, slug: true } },
          },
        }),
        tx.product_variant.findMany({
          where: { deleted_at: null },
          select: {
            id: true,
            product_id: true,
            name: true,
            sku: true,
            image_url: true,
            product: { select: { name: true, slug: true } },
          },
        }),
        tx.site_config.findFirst({
          where: { deleted_at: null },
          select: {
            id: true,
            light_logo_url: true,
            dark_logo_url: true,
            favicon_url: true,
          },
        }),
      ]);
    });

  // Set of physical files for quick lookup
  const diskPathsSet = new Set(diskFiles.map((f) => f.relativePath));

  // Map to hold connections for each physical relativePath
  const connectionsMap = new Map<string, MediaConnection[]>();

  function addConnection(relPath: string, connection: MediaConnection) {
    const normalized = normalizeUrlPath(relPath);
    if (!normalized) return;
    const existing = connectionsMap.get(normalized) || [];
    existing.push(connection);
    connectionsMap.set(normalized, existing);
  }

  const brokenLinks: BrokenLinkItem[] = [];

  function isExternalUrl(url?: string | null): boolean {
    if (!url) return false;
    const trimmed = url.trim().toLowerCase();
    return (
      trimmed.startsWith("http://") ||
      trimmed.startsWith("https://") ||
      trimmed.startsWith("//") ||
      trimmed.startsWith("data:")
    );
  }

  function checkAndRegisterDbImage(
    url: string | null | undefined,
    connection: MediaConnection
  ) {
    if (!url || isExternalUrl(url)) return;

    const normalized = normalizeUrlPath(url);
    if (!normalized) return;

    if (diskPathsSet.has(normalized)) {
      addConnection(normalized, connection);
    } else if (normalized.startsWith("/uploads/")) {
      // It's a local /uploads/ URL that doesn't exist on physical disk -> Broken Link
      brokenLinks.push({
        url: normalized,
        ...connection,
      });
    }
  }

  // Map Categories
  for (const cat of categories) {
    if (cat.image_url) {
      checkAndRegisterDbImage(cat.image_url, {
        entityType: "category",
        entityId: cat.id,
        entityName: cat.name,
        slug: cat.slug,
        details: `Category Banner Image`,
      });
    }
  }

  // Map Product Feature Images
  for (const prod of products) {
    if (prod.feature_image_url) {
      checkAndRegisterDbImage(prod.feature_image_url, {
        entityType: "product_feature",
        entityId: prod.id,
        entityName: prod.name,
        slug: prod.slug,
        details: prod.sku ? `Product Feature (SKU: ${prod.sku})` : "Product Feature Image",
      });
    }
  }

  // Map Product Gallery Images
  for (const img of productImages) {
    if (img.url) {
      checkAndRegisterDbImage(img.url, {
        entityType: "product_gallery",
        entityId: img.product_id,
        entityName: img.product.name,
        slug: img.product.slug,
        details: `Product Gallery Image #${img.id}`,
        galleryImageId: img.id,
      });
    }
  }

  // Map Product Variant Images
  for (const v of productVariants) {
    if (v.image_url) {
      checkAndRegisterDbImage(v.image_url, {
        entityType: "product_variant",
        entityId: v.id,
        entityName: `${v.product.name} (${v.name})`,
        slug: v.product.slug,
        details: v.sku ? `Variant Image (SKU: ${v.sku})` : "Variant Image",
      });
    }
  }

  // Map Site Config Logos
  if (siteConfig) {
    if (siteConfig.light_logo_url) {
      checkAndRegisterDbImage(siteConfig.light_logo_url, {
        entityType: "site_logo_light",
        entityId: siteConfig.id,
        entityName: "Site Config",
        details: "Light Theme Logo",
      });
    }
    if (siteConfig.dark_logo_url) {
      checkAndRegisterDbImage(siteConfig.dark_logo_url, {
        entityType: "site_logo_dark",
        entityId: siteConfig.id,
        entityName: "Site Config",
        details: "Dark Theme Logo",
      });
    }
    if (siteConfig.favicon_url) {
      checkAndRegisterDbImage(siteConfig.favicon_url, {
        entityType: "site_favicon",
        entityId: siteConfig.id,
        entityName: "Site Config",
        details: "Browser Favicon",
      });
    }
  }

  // 3. Assemble Media File items list
  let totalDiskSizeBytes = 0;
  let connectedFilesCount = 0;
  let orphanFilesCount = 0;
  let wastedOrphanSizeBytes = 0;

  const fileItems: MediaFileItem[] = diskFiles.map((df) => {
    totalDiskSizeBytes += df.size;
    const connections = connectionsMap.get(df.relativePath) || [];
    const isOrphan = connections.length === 0;

    if (isOrphan) {
      orphanFilesCount += 1;
      wastedOrphanSizeBytes += df.size;
    } else {
      connectedFilesCount += 1;
    }

    return {
      relativePath: df.relativePath,
      fileName: df.fileName,
      subfolder: df.subfolder,
      size: df.size,
      formattedSize: formatBytes(df.size),
      mimeType: getMimeType(df.fileName),
      updatedAt: df.updatedAt,
      connections,
      isOrphan,
    };
  });

  // Sort files by latest updated date by default
  fileItems.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  return {
    files: fileItems,
    brokenLinks,
    stats: {
      totalDiskSizeBytes,
      formattedTotalDiskSize: formatBytes(totalDiskSizeBytes),
      totalFilesCount: fileItems.length,
      connectedFilesCount,
      orphanFilesCount,
      wastedOrphanSizeBytes,
      formattedWastedOrphanSize: formatBytes(wastedOrphanSizeBytes),
      brokenLinksCount: brokenLinks.length,
    },
  };
}
