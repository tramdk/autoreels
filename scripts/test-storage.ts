import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { uploadVideo, downloadFile, cleanupFile } from '../server/services/storage';

async function testStorageFlow() {
  console.log('--- STARTING STORAGE FLOW TEST ---');
  
  const testFile = path.join(process.cwd(), 'temp_test.txt');
  const downloadDest = path.join(process.cwd(), 'temp_downloaded.txt');
  const content = 'Hello Cloudinary ' + Date.now();
  
  try {
    // 1. Create a dummy file
    fs.writeFileSync(testFile, content);
    console.log('1. Created local dummy file');

    // 2. Upload to Cloudinary (as a raw file or image since it's txt, but we use uploadVideo which forces resource_type: video)
    // Actually, Cloudinary might reject a .txt if we force resource_type: video.
    // Let's use a dummy .mp4 (even if it's just text, Cloudinary might accept it as a small video file if we rename it)
    const videoTestFile = path.join(process.cwd(), 'temp_test.mp4');
    fs.writeFileSync(videoTestFile, content);
    
    console.log('2. Uploading dummy mp4 to Cloudinary...');
    const cloudUrl = await uploadVideo(videoTestFile, 'tests', true);
    console.log('   Upload success. URL:', cloudUrl);

    // 3. Delete local file to simulate "post-deploy" state
    fs.unlinkSync(videoTestFile);
    console.log('3. Deleted local file (simulating new deployment)');

    // 4. Download from Cloudinary
    console.log('4. Downloading back from Cloudinary...');
    const videoDownloadDest = path.join(process.cwd(), 'temp_restored.mp4');
    await downloadFile(cloudUrl, videoDownloadDest);
    console.log('   Download success.');

    // 5. Verify content
    const downloadedContent = fs.readFileSync(videoDownloadDest, 'utf-8');
    if (downloadedContent === content) {
      console.log('✅ VERIFICATION SUCCESS: Content matches!');
    } else {
      console.error('❌ VERIFICATION FAILED: Content mismatch!');
    }

    // Cleanup
    cleanupFile(testFile);
    cleanupFile(videoDownloadDest);
    console.log('5. Cleanup done.');

  } catch (err: any) {
    console.error('❌ TEST FAILED:', err.message);
  }
}

testStorageFlow();
