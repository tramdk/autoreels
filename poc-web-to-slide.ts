import { chromium } from 'playwright';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

// Setup ffmpeg path
ffmpeg.setFfmpegPath(ffmpegStatic as string);

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function createSlideVideo(imagePath: string, outputPath: string, duration: number = 4, index: number = 0): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`Đang tạo video thô cho slide ${index + 1}...`);
    
    // Hiệu ứng Ken Burns tinh tế: Zoom in rất chậm
    const kenBurns = `zoompan=z='min(zoom+0.001,1.15)':d=${duration * 30}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'`;

    ffmpeg()
      .input(imagePath)
      .inputOptions(['-loop 1'])
      .videoFilters([kenBurns])
      .outputOptions([
        '-c:v libx264',
        `-t ${duration}`,
        '-pix_fmt yuv420p',
        '-s 1920x1080' // Desktop/Landscape
      ])
      .save(outputPath)
      .on('end', () => resolve())
      .on('error', (err) => reject(err));
  });
}

async function concatWithXfade(videoPaths: string[], outputPath: string, durationPerSlide: number, fadeDuration: number = 1): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`Đang áp dụng hiệu ứng chuyển cảnh mượt (Crossfade)...`);
    const command = ffmpeg();
    
    videoPaths.forEach(p => command.input(p));
    
    if (videoPaths.length > 1) {
      const filters = [];
      let lastOut = '[0:v]';
      let currentLength = durationPerSlide;
      
      for (let i = 1; i < videoPaths.length; i++) {
        const offset = currentLength - fadeDuration;
        const outLabel = `[v${i}]`;
        // Hiệu ứng xfade chuyên nghiệp
        filters.push(`${lastOut}[${i}:v]xfade=transition=fade:duration=${fadeDuration}:offset=${offset}${outLabel}`);
        lastOut = outLabel;
        currentLength = currentLength + durationPerSlide - fadeDuration;
      }
      // Áp dụng filter complex
      command.complexFilter(filters, lastOut.replace(/\[|\]/g, ''));
    }
    
    command
      .outputOptions([
        '-c:v libx264',
        '-pix_fmt yuv420p'
      ])
      .save(outputPath)
      .on('end', () => resolve())
      .on('error', (err) => reject(err));
  });
}

async function main() {
  const targetUrl = 'https://apple.com';
  const outputDir = path.join(__dirname, 'temp_slides');
  
  await fs.mkdir(outputDir, { recursive: true });

  console.log('🚀 Khởi động trình duyệt...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  
  console.log(`🌐 Truy cập ${targetUrl}...`);
  await page.goto(targetUrl, { waitUntil: 'networkidle' });

  // Ẩn scrollbar để video trông đẹp hơn
  await page.addStyleTag({ content: '::-webkit-scrollbar { display: none; }' });

  const numSlides = 4; // Tăng lên 4 slide cho đẹp
  const imagePaths: string[] = [];
  
  console.log('📸 Bắt đầu chụp màn hình các khối...');
  for (let i = 0; i < numSlides; i++) {
    const imgPath = path.join(outputDir, `slide_${i}.png`);
    await page.screenshot({ path: imgPath });
    imagePaths.push(imgPath);
    
    await page.evaluate(() => window.scrollBy({ top: window.innerHeight * 0.8, behavior: 'smooth' }));
    await page.waitForTimeout(1500); // Đợi scroll và animation trên web
  }

  await browser.close();
  console.log('✅ Đã chụp xong dữ liệu web.');

  const videoPaths: string[] = [];
  const durationPerSlide = 4;
  for (let i = 0; i < imagePaths.length; i++) {
    const vidPath = path.join(outputDir, `slide_vid_${i}.mp4`);
    await createSlideVideo(imagePaths[i], vidPath, durationPerSlide, i);
    videoPaths.push(vidPath);
  }

  const finalOutput = path.join(__dirname, 'final_website_slides_pro.mp4');
  await concatWithXfade(videoPaths, finalOutput, durationPerSlide, 1.5); // Fade 1.5s cho lãng mạn, sang trọng

  console.log(`🎉 HOÀN THÀNH! Video chuyên nghiệp đã được lưu tại: ${finalOutput}`);
  
  // Dọn dẹp
  for (const file of [...imagePaths, ...videoPaths]) {
    await fs.unlink(file).catch(() => {});
  }
  await fs.rmdir(outputDir).catch(() => {});
}

main().catch(console.error);
