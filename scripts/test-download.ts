import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { downloadFile } from '../server/services/storage';

async function testDownloadLogic() {
  console.log('--- TESTING DOWNLOAD LOGIC ---');
  
  // Use a known public URL (e.g. a sample image from Cloudinary or Google)
  const testUrl = 'https://res.cloudinary.com/demo/image/upload/sample.jpg';
  const dest = path.join(process.cwd(), 'temp_renders', 'test_sample.jpg');
  
  try {
    console.log(`1. Downloading from ${testUrl}...`);
    await downloadFile(testUrl, dest);
    
    if (fs.existsSync(dest)) {
      const stats = fs.statSync(dest);
      console.log(`✅ SUCCESS: File downloaded. Size: ${stats.size} bytes`);
      fs.unlinkSync(dest);
    } else {
      console.error('❌ FAILED: File does not exist after download');
    }
  } catch (err: any) {
    console.error('❌ DOWNLOAD TEST FAILED:', err.message);
  }
}

testDownloadLogic();
