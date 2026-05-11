import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Uploads a video file to Cloudinary and deletes the local file
 * @param filePath Path to the local video file
 * @param folder Cloudinary folder name
 * @returns The secure URL of the uploaded video
 */
export async function uploadVideo(filePath: string, folder: string = 'autoreels', keepLocal: boolean = false): Promise<string> {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  try {
    console.log(`[Storage] Uploading ${path.basename(filePath)} to Cloudinary...`);
    
    const result = await cloudinary.uploader.upload(filePath, {
      resource_type: 'video',
      folder: folder,
      overwrite: true,
    });

    console.log(`[Storage] Upload OK: ${result.secure_url}`);

    // Delete local file only if not explicitly told to keep it
    if (!keepLocal) {
      fs.unlinkSync(filePath);
      console.log(`[Storage] Deleted local file: ${filePath}`);
    } else {
      console.log(`[Storage] Kept local file as requested: ${filePath}`);
    }

    return result.secure_url;
  } catch (error: any) {
    console.error('[Storage] Cloudinary Upload Error:', error.message);
    throw new Error(`Cloudinary upload failed: ${error.message}`);
  }
}

/**
 * Deletes a file safely (no-op if not exists)
 */
export function cleanupFile(filePath: string) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`[Storage] Cleaned up: ${filePath}`);
    }
  } catch (e) {
    console.error(`[Storage] Cleanup error for ${filePath}:`, e);
  }
}

/**
 * Downloads a file from a URL to a local path
 */
export function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Ensure directory exists
    const dir = path.dirname(dest);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Handle local files
    if (url.startsWith('/') || url.match(/^[a-zA-Z]:\\/) || !url.startsWith('http')) {
      try {
        let localPath = url;
        // If relative to root, check public folder first then absolute
        if (url.startsWith('/')) {
          const publicPath = path.join(process.cwd(), 'public', url);
          const rootPath = path.join(process.cwd(), url);
          if (fs.existsSync(publicPath)) {
            localPath = publicPath;
          } else if (fs.existsSync(rootPath)) {
            localPath = rootPath;
          }
        }
        
        if (fs.existsSync(localPath)) {
          console.log(`[Storage] Copying local file: ${localPath} -> ${dest}`);
          fs.copyFileSync(localPath, dest);
          return resolve();
        } else {
          return reject(new Error(`Local file not found: ${localPath}`));
        }
      } catch (err) {
        return reject(err);
      }
    }

    const file = fs.createWriteStream(dest);
    const protocol = url.startsWith('https') ? https : http;
    
    protocol.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          file.close();
          return downloadFile(redirectUrl, dest).then(resolve).catch(reject);
        }
      }

      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(dest);
        return reject(new Error(`Failed to download file: ${response.statusCode} ${response.statusMessage}`));
      }

      response.pipe(file);
      
      file.on('finish', () => {
        file.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      file.on('error', (err) => {
        file.close();
        if (fs.existsSync(dest)) fs.unlinkSync(dest);
        reject(err);
      });
    }).on('error', (err) => {
      file.close();
      if (fs.existsSync(dest)) fs.unlinkSync(dest);
      reject(err);
    });
  });
}

/**
 * Deletes a video/file from Cloudinary
 * @param fileUrl The full Cloudinary URL
 */
export async function deleteRemoteFile(fileUrl: string): Promise<boolean> {
  if (!fileUrl || !fileUrl.includes('cloudinary.com')) return false;

  try {
    // Extract public_id from URL
    // Format: .../upload/v12345678/folder/public_id.mp4
    const parts = fileUrl.split('/');
    const uploadIndex = parts.indexOf('upload');
    if (uploadIndex === -1) return false;

    // Get everything after the version (e.g., v12345678)
    const publicIdWithExt = parts.slice(uploadIndex + 2).join('/');
    // Remove extension
    const publicId = publicIdWithExt.split('.').slice(0, -1).join('.');

    console.log(`[Storage] Deleting remote file from Cloudinary: ${publicId}`);
    
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: fileUrl.includes('/video/') ? 'video' : 'image'
    });

    return result.result === 'ok';
  } catch (error: any) {
    console.error('[Storage] Cloudinary Delete Error:', error.message);
    return false;
  }
}
