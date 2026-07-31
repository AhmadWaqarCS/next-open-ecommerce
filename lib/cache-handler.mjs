// lib/persistent-cache-handler.mjs
import FileSystemCache from 'next/dist/server/lib/incremental-cache/file-system-cache.js';
import path from 'node:path';
import fs from 'node:fs';

export default class PersistentCacheHandler extends FileSystemCache.default {
  constructor(options) {
    // Persistent directory outside .next (will NOT be wiped by next build)
    const persistentDir = path.join(process.cwd(), "cache", 'server');

    // Ensure persistent directory exists
    if (!fs.existsSync(persistentDir)) {
      fs.mkdirSync(persistentDir, { recursive: true });
    }

    // Direct Next.js FileSystemCache to write/read app & fetch cache here
    if (options && options.serverDistDir) {
      options.serverDistDir = persistentDir;
    }

    super(options);
    this.serverDistDir = persistentDir;
  }
}
