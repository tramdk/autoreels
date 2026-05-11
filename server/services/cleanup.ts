import fs from 'fs';
import path from 'path';

export function cleanupTempRenders() {
  const localTmpDir = path.join(process.cwd(), 'render_cache');
  if (!fs.existsSync(localTmpDir)) return;

  const now = Date.now();
  const maxAge = 6 * 60 * 60 * 1000; // 6 hours

  try {
    const folders = fs.readdirSync(localTmpDir);
    for (const folder of folders) {
      if (!folder.startsWith('hf_')) continue; // Only clean our render folders
      const folderPath = path.join(localTmpDir, folder);
      const stats = fs.statSync(folderPath);
      if (now - stats.mtimeMs > maxAge) {
        console.log(`[Cleanup] Removing old render directory: ${folder}`);
        fs.rmSync(folderPath, { recursive: true, force: true });
      }
    }
  } catch (err) {
    console.error('[Cleanup] Error during cleanup:', err);
  }
}

export function startCleanupJob() {
  cleanupTempRenders();
  setInterval(cleanupTempRenders, 60 * 60 * 1000); // Every 1 hour
}
