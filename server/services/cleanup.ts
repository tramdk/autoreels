import fs from 'fs';
import path from 'path';

export function cleanupTempRenders() {
  const localTmpDir = path.join(process.cwd(), 'render_cache');
  if (!fs.existsSync(localTmpDir)) return;

  const now = Date.now();
  const maxAge = 6 * 60 * 60 * 1000; // 6 hours

  try {
    const entries = fs.readdirSync(localTmpDir);
    let cleaned = 0;
    for (const entry of entries) {
      if (entry === 'uploads') continue; // Skip uploads folder
      const entryPath = path.join(localTmpDir, entry);
      try {
        const stats = fs.statSync(entryPath);
        if (now - stats.mtimeMs > maxAge) {
          if (stats.isDirectory()) {
            fs.rmSync(entryPath, { recursive: true, force: true });
          } else {
            fs.unlinkSync(entryPath);
          }
          cleaned++;
        }
      } catch (_) { /* skip entries we can't stat */ }
    }
    if (cleaned > 0) console.log(`[Cleanup] Removed ${cleaned} old render entries.`);
  } catch (err) {
    console.error('[Cleanup] Error during cleanup:', err);
  }
}

export function startCleanupJob() {
  cleanupTempRenders();
  setInterval(cleanupTempRenders, 60 * 60 * 1000); // Every 1 hour
}
