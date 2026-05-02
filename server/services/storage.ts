import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';

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
