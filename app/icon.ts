import { getSiteConfig } from "@/lib/storefront";
import fs from "fs/promises";
import path from "path";

export const size = {
  width: 32,
  height: 32,
};

export const contentType = "image/png";

export default async function Icon() {
  try {
    const config = await getSiteConfig();
    const faviconUrl = config?.favicon_url;

    if (faviconUrl && faviconUrl.startsWith("/uploads/")) {
      const cleanSubpath = faviconUrl
        .replace(/^\/?uploads\/?/, "")
        .replace(/\.\./g, "");
      const filePath = path.join(process.cwd(), "uploads", cleanSubpath);

      try {
        const fileBuffer = await fs.readFile(filePath);
        const ext = path.extname(filePath).toLowerCase();
        let mimeType = "image/png";
        if (ext === ".jpg" || ext === ".jpeg") mimeType = "image/jpeg";
        else if (ext === ".svg") mimeType = "image/svg+xml";
        else if (ext === ".webp") mimeType = "image/webp";
        else if (ext === ".ico") mimeType = "image/x-icon";

        return new Response(fileBuffer, {
          headers: {
            "Content-Type": mimeType,
            "Cache-Control": "public, max-age=3600, must-revalidate",
          },
        });
      } catch (fileErr) {
        console.error("Failed to read favicon file from disk:", fileErr);
      }
    }
  } catch (err) {
    console.error("Error fetching site config for icon:", err);
  }

  // Fallback 1x1 transparent PNG if no dynamic favicon found
  const fallbackPng = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64"
  );

  return new Response(fallbackPng, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-cache",
    },
  });
}
