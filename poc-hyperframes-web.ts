import { chromium } from 'playwright';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const targetUrl = 'https://tramdk.github.io/landing-page/'; // Trang web mẫu
  const numSlides = 3;
  const durationPerSlide = 4; // giây
  const totalDuration = numSlides * durationPerSlide;

  const workDir = path.join(__dirname, 'render_cache', 'web_to_hf_poc');
  await fs.mkdir(workDir, { recursive: true });

  // BƯỚC 1: Dùng Playwright chụp ảnh trang web
  console.log('🚀 Khởi động trình duyệt...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 2 // Ép chụp ảnh độ phân giải cao (Retina) để tránh chớp chữ khi zoom
  });
  const page = await context.newPage();
  
  console.log(`🌐 Truy cập ${targetUrl}...`);
  await page.goto(targetUrl, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: '::-webkit-scrollbar { display: none; }' });

  const imageFiles: string[] = [];
  console.log('📸 Đang chụp các khối màn hình theo tọa độ cứng...');
  for (let i = 0; i < numSlides; i++) {
    const fileName = `slide_${i}.png`;
    const imgPath = path.join(workDir, fileName);
    
    // Chụp chính xác theo viewport (0, 1080, 2160...) để không bị lệch pixel
    await page.evaluate((y) => window.scrollTo(0, y), i * 1080);
    await page.waitForTimeout(500); // Đợi render ổn định
    await page.screenshot({ path: imgPath });
    
    imageFiles.push(fileName);
  }
  await browser.close();
  console.log('✅ Đã chụp xong hình ảnh.');

  // BƯỚC 2: Tạo HTML Template cho HyperFrames với GSAP Animation
  console.log('🎨 Đang tạo HTML Template với GSAP Animations...');
  
  const crossfade = 1.2; // Tăng thời gian hòa trộn để mượt hơn
  const actualDuration = numSlides * durationPerSlide - (numSlides - 1) * (durationPerSlide - (durationPerSlide - crossfade)); 

  // Calculate actual total duration properly
  const totalAnimDuration = (numSlides * durationPerSlide) - ((numSlides - 1) * crossfade);

  let slidesHtml = '';
  for (let i = 0; i < numSlides; i++) {
    const start = i * (durationPerSlide - crossfade);
    // Each slide exists for durationPerSlide + crossfade (to overlap perfectly with the next one)
    const clipDuration = (i === numSlides - 1) ? durationPerSlide : durationPerSlide + crossfade;
    const enterClass = (i % 2 === 0) ? 'slide-in-left' : 'slide-in-right';
    const panClass = (i % 2 === 0) ? 'pan-ltr' : 'pan-rtl';
    
    slidesHtml += `
      <div class="slide-container ${enterClass}" id="slide-${i}" data-start="${start.toFixed(3)}" data-duration="${clipDuration.toFixed(3)}" data-track-index="1" style="z-index: ${10 + i};">
        <div class="image-wrapper ${panClass}" style="animation-duration: ${clipDuration.toFixed(3)}s;">
          <img class="slide-image" src="./${imageFiles[i]}" />
        </div>
        <div class="overlay-wrapper">
          <div class="overlay">
            <h1 class="title">Website Showcase</h1>
            <p class="subtitle">Phân cảnh ${i + 1} - Giao diện hiện đại</p>
          </div>
        </div>
      </div>
    `;
  }

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { 
      margin: 0; width: 1920px; height: 1080px; 
      background: #000; color: white; font-family: 'Inter', sans-serif; 
      overflow: hidden; 
    }
    #root {
      position: absolute; width: 100%; height: 100%; top: 0; left: 0;
      display: flex; align-items: center; justify-content: center; 
    }
    .slide-container { 
      position: absolute; width: 100%; height: 100%; 
      display: flex; align-items: center; justify-content: center;
      opacity: 0; /* Khởi đầu bằng ẩn để CSS animation hiện lên */
      will-change: transform, opacity;
      perspective: 1500px;
    }
    .image-wrapper {
      width: 92%; height: 88%;
      border-radius: 24px; 
      box-shadow: 0 40px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.1); 
      transform-origin: center center;
      will-change: transform;
      backface-visibility: hidden;
      transform: translate3d(0,0,0);
      overflow: hidden;
      image-rendering: auto; /* Dùng mặc định vì ảnh Retina 2x đã rất sắc nét */
    }
    .slide-image { 
      width: 100%; height: 100%; object-fit: cover; 
      backface-visibility: hidden;
      transform: translate3d(0,0,0);
      transform: scale(1.15); /* Tăng nhẹ kích thước ảnh nền để khi pan không lộ viền */
    }
    
    /* CSS KEYFRAME ANIMATIONS FOR HYPERFRAMES ADAPTER */
    @keyframes hf-slide-in-left {
      from { opacity: 0; transform: translate3d(-150px, 0, 0); filter: blur(15px); }
      to { opacity: 1; transform: translate3d(0, 0, 0); filter: blur(0px); }
    }
    @keyframes hf-slide-in-right {
      from { opacity: 0; transform: translate3d(150px, 0, 0); filter: blur(15px); }
      to { opacity: 1; transform: translate3d(0, 0, 0); filter: blur(0px); }
    }
    @keyframes hf-pan-ltr {
      from { transform: translate3d(-30px, -10px, 0) rotate(-0.3deg); }
      to { transform: translate3d(30px, 10px, 0) rotate(0.3deg); }
    }
    @keyframes hf-pan-rtl {
      from { transform: translate3d(30px, 10px, 0) rotate(0.3deg); }
      to { transform: translate3d(-30px, -10px, 0) rotate(-0.3deg); }
    }
    
    .slide-in-left {
      animation: hf-slide-in-left 1200ms cubic-bezier(0.25, 1, 0.5, 1) both;
    }
    .slide-in-right {
      animation: hf-slide-in-right 1200ms cubic-bezier(0.25, 1, 0.5, 1) both;
    }
    .pan-ltr {
      animation: hf-pan-ltr linear both;
    }
    .pan-rtl {
      animation: hf-pan-rtl linear both;
    }
    .overlay-wrapper {
      position: absolute; bottom: 80px; left: 120px; 
      will-change: transform, opacity;
      transform: translate3d(0,0,0);
    }
    .overlay { 
      background: rgba(10, 15, 30, 0.9); 
      padding: 30px 45px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.08); 
      box-shadow: 0 15px 35px rgba(0,0,0,0.5);
      backface-visibility: hidden;
    }
    .title { font-size: 56px; font-weight: 800; margin: 0; background: linear-gradient(90deg, #fff, #a5b4fc); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .subtitle { font-size: 32px; opacity: 0.8; margin-top: 12px; color: #cbd5e1; margin-bottom: 0; }
  </style>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>
  <script>
    window.__hf = window.__hf || {};
    window.__hf.active = true;
    (function() {
      var d = ${totalAnimDuration};
      window.duration = d;
      window.remotion_duration = d;
      window.__hf.duration = d;
      window.__hf.getDuration = function() { return d; };
      window.__hf.seek = function(t) {};
    })();
  </script>
</head>
<body>
  <div id="root" data-composition-id="root" data-duration="${totalAnimDuration}" data-width="1920" data-height="1080">
    ${slidesHtml}
  </div>

  <script>
    console.log("Init GSAP");
    const tl = gsap.timeline({ id: "root", paused: true });
    window.__timelines = window.__timelines || {};
    window.__timelines["root"] = tl;
    window._tl = tl;
    
    const slides = document.querySelectorAll('.slide-container');
    
    slides.forEach((slide, i) => {
      const start = parseFloat(slide.getAttribute('data-start'));
      const dur = parseFloat(slide.getAttribute('data-duration'));
      
      const wrapper = slide.querySelector('.image-wrapper');
      const overlayWrapper = slide.querySelector('.overlay-wrapper');
      
      // Exit (synchronized with next slide)
      // We ONLY fade the overlay (text) to avoid ghosting.
      // We keep the slide container (background) solid to avoid flickering.
      if (i < slides.length - 1) {
        tl.to(overlayWrapper, {
          opacity: 0,
          y: -30,
          duration: 0.8,
          ease: "power2.in"
        }, start + dur - 0.8);
      }
      
      // Overlay hiện ra mượt mà không gây xao nhãng
      tl.from(overlayWrapper, 
        { opacity: 0, y: 30, duration: 1.5, ease: "expo.out" }, 
        start + 0.6
      );
    });

    tl.time(0);
    console.log("GSAP initialized");
  </script>
</body>
</html>
  `;

  const indexPath = path.join(workDir, 'index.html');
  await fs.writeFile(indexPath, htmlContent, 'utf-8');

  // BƯỚC 3: Dùng HyperFrames để Render ra MP4
  const outputPath = path.join(__dirname, 'final_hyperframes_slides.mp4');
  console.log('🎬 Bắt đầu render bằng HyperFrames (có thể mất vài phút)...');
  
  let hyperframesBin = path.join(__dirname, 'node_modules', '.bin', 'hyperframes');
  if (process.platform === 'win32') hyperframesBin += '.cmd';

  const cmd = `"${hyperframesBin}" render "${workDir}" -o "${outputPath}" -f 30 -q high`;
  
  const ffmpegStatic = (await import('ffmpeg-static')).default;
  const ffmpegDir = path.dirname(ffmpegStatic);
  const env = { 
    ...process.env, 
    FFMPEG_PATH: ffmpegStatic, 
    PATH: `${ffmpegDir}${path.delimiter}${process.env.PATH}` 
  };
  
  return new Promise((resolve, reject) => {
    exec(cmd, { cwd: __dirname, env }, async (error, stdout, stderr) => {
      if (error) {
        console.error('Lỗi Render HyperFrames:', stderr);
        return reject(error);
      }
      console.log(`🎉 HOÀN THÀNH! Video CỰC KỲ CHUYÊN NGHIỆP đã được lưu tại: ${outputPath}`);
      resolve(null);
    });
  });
}

main().catch(console.error);
