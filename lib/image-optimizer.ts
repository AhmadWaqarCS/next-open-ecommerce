import imageCompression from "browser-image-compression";

export type ImageFormat =
  | "original"
  | "image/webp"
  | "image/jpeg"
  | "image/avif"
  | "image/png";

export interface ImageOptimizationSettings {
  format: ImageFormat;
  quality: number; // 0.1 to 1.0 (default: 0.8)
  maxSizeMB: number; // Max file size in MB (default: 2)
  preserveAspectRatio: boolean; // default: true
  maxWidth?: number;
  maxHeight?: number;
  customWidth?: number;
  customHeight?: number;
  stripMetadata: boolean; // default: true
}

export const DEFAULT_OPTIMIZATION_SETTINGS: ImageOptimizationSettings = {
  format: "image/webp",
  quality: 0.8,
  maxSizeMB: 2,
  preserveAspectRatio: true,
  maxWidth: 1920,
  maxHeight: 1080,
  stripMetadata: true,
};

/**
 * Get natural width and height of a File
 */
export function getImageDimensions(
  file: File,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const dimensions = { width: img.naturalWidth, height: img.naturalHeight };
      URL.revokeObjectURL(url);
      resolve(dimensions);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}

/**
 * Fetch an image URL and convert it into a File object for optimization
 */
export async function urlToFile(
  url: string,
  defaultName = "image.png",
): Promise<File | null> {
  if (!url || url.startsWith("blob:")) return null;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    const contentType = blob.type || "image/png";

    // Extract filename from URL if possible
    let filename = defaultName;
    try {
      const parsed = new URL(url, window.location.href);
      const pathname = parsed.pathname;
      const segment = pathname.split("/").pop();
      if (segment && segment.includes(".")) {
        filename = segment;
      }
    } catch {
      // fallback to defaultName
    }

    return new File([blob], filename, { type: contentType });
  } catch (err) {
    console.error("Failed to convert URL to File:", err);
    return null;
  }
}

/**
 * Replace file extension based on target format MIME type
 */
export function changeFileExtension(filename: string, targetMime: string): string {
  const parts = filename.split(".");
  const nameWithoutExt = parts.length > 1 ? parts.slice(0, -1).join(".") : filename;

  switch (targetMime) {
    case "image/webp":
      return `${nameWithoutExt}.webp`;
    case "image/jpeg":
      return `${nameWithoutExt}.jpg`;
    case "image/avif":
      return `${nameWithoutExt}.avif`;
    case "image/png":
      return `${nameWithoutExt}.png`;
    default:
      return filename;
  }
}

/**
 * Resize image to exact custom dimensions using HTML5 Canvas
 */
async function resizeCanvasExact(
  file: File,
  targetWidth: number,
  targetHeight: number,
): Promise<File> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("Could not get 2d canvas context"));
        return;
      }

      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
      URL.revokeObjectURL(url);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Canvas blob creation failed"));
            return;
          }
          const resizedFile = new File([blob], file.name, {
            type: file.type || "image/png",
          });
          resolve(resizedFile);
        },
        file.type || "image/png",
        0.95,
      );
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}

/**
 * Optimize a single original image File using browser-image-compression and canvas options.
 * ALWAYS receives the original uncompressed File as `originalFile`.
 */
export async function optimizeSingleImage(
  originalFile: File,
  settings: ImageOptimizationSettings,
): Promise<File> {
  let sourceFile = originalFile;

  // 1. If custom exact dimensions are requested without maintaining aspect ratio
  if (
    !settings.preserveAspectRatio &&
    settings.customWidth &&
    settings.customHeight &&
    settings.customWidth > 0 &&
    settings.customHeight > 0
  ) {
    try {
      sourceFile = await resizeCanvasExact(
        originalFile,
        settings.customWidth,
        settings.customHeight,
      );
    } catch (err) {
      console.warn("Exact canvas resize failed, proceeding with original source:", err);
    }
  }

  // 2. Determine target file type
  const targetFileType =
    settings.format === "original" ? originalFile.type : settings.format;

  // 3. Compute maxWidthOrHeight for browser-image-compression when preserving aspect ratio
  let maxWidthOrHeight: number | undefined;
  if (settings.preserveAspectRatio) {
    if (settings.maxWidth && settings.maxHeight) {
      maxWidthOrHeight = Math.max(settings.maxWidth, settings.maxHeight);
    } else if (settings.maxWidth) {
      maxWidthOrHeight = settings.maxWidth;
    } else if (settings.maxHeight) {
      maxWidthOrHeight = settings.maxHeight;
    }
  }

  // 4. Configure compression options
  const compressionOptions: any = {
    maxSizeMB: settings.maxSizeMB > 0 ? settings.maxSizeMB : 10,
    maxWidthOrHeight: maxWidthOrHeight || undefined,
    initialQuality: Math.min(Math.max(settings.quality, 0.1), 1.0),
    preserveExif: !settings.stripMetadata,
    useWebWorker: true,
  };

  if (targetFileType && targetFileType !== "original") {
    compressionOptions.fileType = targetFileType;
  }

  // 5. Compress
  let compressedBlob: Blob;
  try {
    compressedBlob = await imageCompression(sourceFile, compressionOptions);
  } catch (err) {
    console.warn("browser-image-compression failed, falling back to source file:", err);
    compressedBlob = sourceFile;
  }

  // 6. Ensure resulting File object has updated filename extension and correct MIME type
  const newFilename = changeFileExtension(
    originalFile.name,
    targetFileType || originalFile.type,
  );

  const finalType = compressedBlob.type || targetFileType || originalFile.type;

  return new File([compressedBlob], newFilename, {
    type: finalType,
    lastModified: Date.now(),
  });
}
