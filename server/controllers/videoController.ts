import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import prisma from '../lib/prisma';
import { generateAudio } from '../services/tts';
import { renderWithHyperFrames, findFfmpegPath, getAudioDuration } from '../services/renderer';
import { publishToTikTok } from '../services/tiktok';
import { uploadVideo, downloadFile, deleteRemoteFile } from '../services/storage';
import { genAI, getAIClient } from '../lib/ai';

export const videoProgress = new Map<string, { progress: number, phase: string, title?: string }>();

/**
 * Helper to split plain text into structured scenes for the rendering pipeline.
 */
function generateScriptFromText(text: string, imageUrl?: string | null) {
  const emojiRegex = /(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])/g;
  const cleanContent = text.replace(emojiRegex, '').replace(/[*_~`|>\\\[\]]/g, ' ').replace(/\s+/g, ' ').trim();

  // Improved splitting: split by common sentence enders followed by space or newline, or at line breaks
  const lines = cleanContent
    .split(/(?<=[.!?])\s+|\n/)
    .map(line => line.trim())
    .filter(line => line.length >= 3); // Allow short impactful hooks like "TIN NÓNG!"

  if (lines.length > 0) {
    return {
      scenes: lines.map((line, idx) => ({
        id: idx + 1,
        type: idx === 0 ? 'hook' : (idx === lines.length - 1 ? 'outro' : 'body'),
        voiceText: line,
        bodyText: line,
        imageUrl: imageUrl || null
      }))
    };
  }

  return {
    scenes: [
      {
        id: 1,
        type: 'body',
        voiceText: text,
        bodyText: text,
        imageUrl: imageUrl || null
      }
    ]
  };
}

export const getVideos = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const user = (req as any).user;
    const status = req.query.status as string;
    const skip = (page - 1) * limit;
    const where: any = status ? { status } : {};
    
    // Role-based filtering: Users only see their own videos, Admins see all
    if (user && user.role !== 'admin') {
      where.userId = user.id;
    }

    const [videos, total] = await Promise.all([
      prisma.video.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { articles: true }
      }),
      prisma.video.count({ where })
    ]);

    res.json({
      items: videos,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (err) {
    next(err);
  }
};

export const generateBulk = async (req: Request, res: Response) => {
  try {
    const { items } = req.body;
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Items array is required' });
    }

    console.log(`🚀 [API] Received bulk-generate request for ${items.length} items from source: ${items[0]?.source || 'unknown'}`);

    // Get global default template ONCE before loop
    const globalTpl = await prisma.setting.findUnique({ where: { key: 'global_default_template' } });
    const defaultTplId = globalTpl?.value || 'classic';

    const results = [];
    for (const item of items) {
      const { articleId, templateId, ttsProvider, ttsVoiceId, bgmAssetId, bgmVolume, ratio, content, script, title, imageUrl, source } = item;

      // Create a persistent task in the database
      const task = await prisma.videoTask.create({
        data: {
          articleId: articleId || null,
          templateId: templateId || defaultTplId,
          title: title || (content ? content.substring(0, 50) : null),
          content: content || null,
          script: script ? (typeof script === 'string' ? script : JSON.stringify(script)) : null,
          imageUrl: imageUrl || null,
          ttsProvider: ttsProvider || 'edge',
          ttsVoiceId: ttsVoiceId || 'vi-VN-NamMinhNeural',
          bgmAssetId: bgmAssetId || null,
          bgmVolume: typeof bgmVolume === 'number' ? bgmVolume : 0.15,
          ratio: ratio || '9:16',
          status: 'pending',
          userId: (req as any).user.id,
          source: source || 'internal'
        }
      });

      console.log(`📝 [API] Task created: ${task.id} (Status: pending)`);
      
      // Update article status to 'generating' immediately so UI knows it's in progress
      if (articleId) {
        await prisma.article.update({
          where: { id: articleId },
          data: { status: 'generating' }
        });
      }

      results.push({ videoId: task.id, status: 'pending' });
    }

    res.status(201).json({ success: true, videos: results });

    // Poke the worker
    console.log('🔔 [API] Triggering background worker...');
    const { triggerWorker } = await import('../services/videoWorker');
    triggerWorker();
  } catch (error: any) {
    console.error('❌ [API] Bulk generate error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getVideoById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const video = await prisma.video.findUnique({ where: { id: req.params.id } });
    if (!video) {
      // Check if it is still in the active generation map
      const progress = videoProgress.get(req.params.id);
      if (progress !== undefined) {
        return res.json({ id: req.params.id, status: 'processing', progress });
      }
      return res.status(404).json({ error: 'Video not found or expired' });
    }
    res.json(video);
  } catch (err) {
    next(err);
  }
};

export const getBulkStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) return res.status(400).json({ error: 'IDs array required' });

    const results = await Promise.all(ids.map(async (id) => {
      // 1. Check if in progress (memory) - Most active state
      const statusObj = videoProgress.get(id);
      if (statusObj) {
        return { id, status: 'processing', ...statusObj };
      }

      // 2. Check Task table for queue status
      const task = await prisma.videoTask.findUnique({ where: { id } });
      if (task) {
        const status = task.status;
        let videoUrl = undefined;

        if (status === 'completed') {
          // Get the final URL from Video table
          const video = await prisma.video.findUnique({ where: { id } });
          videoUrl = video?.videoUrl;
          // Task cleanup is handled by cleanupOldTasks in videoWorker
        }

        return {
          id,
          status: status,
          error: task.error,
          videoUrl,
          progress: status === 'pending' ? 0 : (status === 'completed' ? 100 : 10)
        };
      }

      // 3. Fallback: If not in Task table, check if it already finished and was deleted
      const finishedVideo = await prisma.video.findUnique({ where: { id } });
      if (finishedVideo) {
        return {
          id,
          status: 'completed',
          videoUrl: finishedVideo.videoUrl,
          progress: 100
        };
      }

      return { id, status: 'not_found' };
    }));

    res.json(results);
  } catch (err) {
    next(err);
  }
};

export const generateVideo = async (req: Request, res: Response, next: NextFunction) => {
  const { articleId, templateId, ttsProvider, ttsVoiceId, bgmAssetId, bgmVolume, ratio, imageUrl, settings, customScript, title } = req.body;

  try {
    const article = await prisma.article.findUnique({ where: { id: articleId } });
    if (!article) return res.status(404).json({ error: 'Article not found' });

    // Correctly extract the scenes array from various possible formats
    let finalScenes: any[] = [];
    const scriptToParse = customScript || article.script;
    
    if (scriptToParse) {
      try {
        let parsed = typeof scriptToParse === 'string' ? JSON.parse(scriptToParse) : scriptToParse;
        // Handle the case where the script is wrapped in another object { scenes: [...], customSettings: {...} }
        if (parsed && parsed.scenes && Array.isArray(parsed.scenes)) {
          finalScenes = parsed.scenes;
        } else if (Array.isArray(parsed)) {
          finalScenes = parsed;
        } else if (parsed && typeof parsed === 'object') {
          finalScenes = [parsed]; // Single scene object fallback
        }
      } catch (e) {
        console.warn(`[API] Failed to parse script for article ${articleId}, falling back to text generation.`);
      }
    }

    // Fallback: Generate from content if script is missing or invalid
    if (finalScenes.length === 0) {
      const gen = generateScriptFromText(article.contentSnippet || article.title, article.imageUrl);
      finalScenes = gen.scenes;
    }

    // Get global default template if not specified
    const globalTpl = await prisma.setting.findUnique({ where: { key: 'global_default_template' } });
    const defaultTplId = globalTpl?.value || 'classic';

    // Construct a comprehensive payload that includes both script and custom settings
    // Prioritize title from payload if provided
    const payload = {
      scenes: finalScenes,
      customSettings: settings || null
    };

    // Create a persistent task with the payload SNAPSHOTTED into the script field
    const task = await prisma.videoTask.create({
      data: {
        articleId: articleId,
        templateId: templateId || defaultTplId,
        title: title || article.title,
        script: JSON.stringify(payload),
        imageUrl: imageUrl || article.imageUrl,
        content: article.contentSnippet || article.title,
        ttsProvider: ttsProvider || 'edge',
        ttsVoiceId: ttsVoiceId || 'vi-VN-HoaiMyNeural',
        bgmAssetId: bgmAssetId || null,
        bgmVolume: typeof bgmVolume === 'number' ? bgmVolume : 0.15,
        ratio: ratio || '9:16',
        status: 'pending',
        userId: (req as any).user.id
      }
    });

    // Save render settings to article script (optional metadata)
    await prisma.article.updateMany({
      where: { id: articleId },
      data: {
        script: {
          ...(article.script as any),
          renderSettings: { templateId, ttsProvider, ttsVoiceId, bgmAssetId, bgmVolume }
        }
      }
    });

    res.json({ videoId: task.id, status: 'pending' });

    // Poke the worker to start immediately if idle
    const { triggerWorker } = await import('../services/videoWorker');
    triggerWorker();
  } catch (err: any) {
    next(err);
  }
};



/**
 * Standalone AI Custom HTML Template Generator: uses Gemini Flash to design 
 * a 100% custom visual layout, styling, and GSAP timeline specifically tailored 
 * to the emotions, theme, and rhythm of the script.
 */
async function generateAiDynamicHtml(title: string, scenes: any[], customSettings: any): Promise<string> {
  const resolvedAI = getAIClient(genAI);
  if (!resolvedAI) {
    console.warn('[AI HTML] AI not configured. Returning empty string.');
    return '';
  }

  const sampleScene = scenes[0] || { id: 1, type: 'hook', voiceText: 'Nội dung mẫu cảnh mở đầu' };
  
  // Tổng hợp tóm tắt toàn bộ kịch bản để AI phân tích chủ đề sâu sắc
  const scriptSummary = scenes.map((s, idx) => `Cảnh ${idx + 1}: ${s.voiceText || s.bodyText || ''}`).join('\n');

  const prompt = `
Bạn là giám đốc nghệ thuật kiêm nhà phát triển frontend motion cao cấp (creative director & senior motion designer) chuyên thiết kế các video đứng dạng đứng (9:16) chất lượng điện ảnh chuyên nghiệp hàng đầu cho TikTok/Reels/Shorts.

Dưới đây là thông tin chi tiết về kịch bản video để bạn phân tích chủ đề:
=== THÔNG TIN KỊCH BẢN ===
- Tiêu đề video: "${title}"
- Nội dung kịch bản để phân tích chủ đề:
"${scriptSummary}"
- Cấu trúc dữ liệu của 1 cảnh mẫu: ${JSON.stringify(sampleScene)}

Nhiệm vụ của bạn là: Lập trình ra MỘT TRANG index.html hoàn toàn mới, standalone, hoàn chỉnh 100% để HyperFrames (sử dụng GSAP + Puppeteer) render ra video. Trang này phải có giao diện ĐỘC BẢN, thiết kế đo ni đóng giày phù hợp hoàn hảo với chủ đề và nội dung của kịch bản trên!

=== CẢNH BÁO CỰC KỲ QUAN TRỌNG (BẮT BUỘC TUÂN THỦ 100%) ===
Bạn chỉ biết tiêu đề và cấu trúc của 1 cảnh mẫu. Số lượng cảnh thực tế của video là ĐỘNG (có thể là 3 cảnh, 6 cảnh, hoặc 10 cảnh) và được nạp tự động qua biến SCENES_DATA ở runtime.
Do đó:
1. Bạn TUYỆT ĐỐI KHÔNG ĐƯỢC phép hardcode bất kỳ thẻ HTML nào đại diện cho cảnh (ví dụ: cấm viết trực tiếp các thẻ như <div class="scene" id="scene1">...</div> hay hardcode bất kỳ nội dung chữ nào của kịch bản vào HTML body).
2. Thẻ body của bạn BẮT BUỘC phải bọc toàn bộ nội dung trong một container chính duy nhất có cấu trúc chính xác như sau:
   <div id="root" data-composition-id="main" data-width="{{ WIDTH }}" data-height="{{ HEIGHT }}" data-start="0" data-duration="{{ DURATION }}">
   (Thiếu các thuộc tính data- này, HyperFrames render engine sẽ hoàn toàn bị mù, dẫn đến lỗi timeout "window.__hf not ready" và render thất bại!).
3. Bên trong container #root trên, bạn chỉ đặt các phần tử tĩnh như logo, ngày giờ, progress-bar rỗng, và một container rỗng duy nhất để đổ cảnh: <div id="scene-container"></div>.
4. Bạn BẮT BUỘC phải viết mã JavaScript ở cuối file sử dụng đúng khung cấu trúc vòng lặp dưới đây để sinh DOM động và dựng timeline GSAP seekable hoàn mỹ.

=== QUY TRÌNH THIẾT KẾ ĐO NI ĐÓNG GIÀY THEO CHỦ ĐỀ KỊCH BẢN (THEME ANALYSIS) ===
Bạn hãy đọc kỹ Tiêu đề video và Nội dung tóm tắt kịch bản để chọn chính xác 1 trong các hướng thiết kế nghệ thuật sau đây. Bạn BẮT BUỘC phải tạo ra bộ CSS variables, Fonts, Background và Decorator Floater đặc chủng tương ứng:

1. CHỦ ĐỀ TÀI CHÍNH / KINH DOANH / ĐẦU TƯ / LÀM GIÀU (Finance/Business):
   - Nền: Navy tối sâu thẳm sang trọng (#090e1a). Lưới chấm tròn màu xanh ngọc nhạt.
   - Bảng màu Neon: Xanh lục Neon phát lộc (#00ff66) làm chủ đạo, vàng Gold (#ffd700) làm điểm nhấn, chữ đen tuyền trên thẻ chữ.
   - Hạt trang trí lơ lửng ở nền (Background floaters): Các biểu tượng ký tự tiền tệ $, €, hoặc các mũi tên đi lên (growth arrows) hoặc biểu đồ hình cột bay lơ lửng tự xoay cực chậm bằng CSS keyframes.
   - Typography: Font 'Lexend Mega' (weight 900) cực kỳ vững chãi và quyền lực.
   - Thẻ Bento: Bo góc sắc sảo vừa phải (radius 20px), viền đen dày 7px.

2. CHỦ ĐỀ CÔNG NGHỆ / AI / TƯƠNG LAI / GAME (Tech/AI/Future):
   - Nền: Tím thẫm Cyberpunk vũ trụ (#0b021c). Mạng lưới grid điện tử ô vuông mờ ảo phát sáng.
   - Bảng màu Neon: Xanh Cyan Neon cực lạnh (#00f5ff), hồng Neon rực lửa (#ff007f), tím Cyber (#7d2eff).
   - Hạt trang trí lơ lửng ở nền: Các ký tự lập trình như {}, <>, số nhị phân 0, 1 hoặc các điểm nút mạch điện tử phát sáng lơ lửng quay chậm.
   - Typography: Font 'JetBrains Mono' (weight 700) hoặc 'Share Tech Mono' kết hợp 'Montserrat' mang hơi thở tương lai.
   - Thẻ Bento: Bo góc công nghệ sắc bén (radius 12px) kèm đường viền kép neon glow phát sáng nhẹ.

3. CHỦ ĐỀ TÌNH YÊU / TÂM SỰ / CẢM XÚC / CUỘC SỐNG (Love/Emotional/Life):
   - Nền: Màu mận chín sâu lắng hoặc tím thạch anh thẫm (#1c010a).
   - Bảng màu Neon: Hot Pink rực cháy (#ff3366), đỏ quyến rũ (#ff2a2a), trắng kem ấm áp.
   - Hạt trang trí lơ lửng ở nền: Hình trái tim đập nhịp nhàng, các hạt lấp lánh (sparkles) nở ra rồi co lại trôi nổi lãng mạn.
   - Typography: Font 'Plus Jakarta Sans' (weight 800) hoặc 'Quicksand' bo góc tròn trịa, truyền tải cảm xúc ấm áp.
   - Thẻ Bento: Bo góc cực kỳ mềm mại, tròn trịa đẫm chất tình cảm (radius 35px) với viền thanh thoát hơn.

4. CHỦ ĐỀ KỲ BÍ / LỊCH SỬ / KINH DỊ / KHÁM PHÁ (Mystery/History/Horror):
   - Nền: Đen bụi than tối tăm huyền bí (#050505) kết hợp bụi khói lờ lững mờ ảo.
   - Bảng màu Neon: Đỏ máu thẫm (#b30000), vàng đồng cổ kính rỉ sét (#c59b27), trắng bạc ma mị.
   - Hạt trang trí lơ lửng ở nền: Các biểu tượng rune cổ xưa, hoặc các hạt bụi khói lơ lửng xoay chuyển mờ ảo.
   - Typography: Font 'Cinzel' hoặc 'Playfair Display' kết hợp 'Syne' mang lại nét cổ kính thần bí.
   - Thẻ Bento: Góc vuông vắn cổ điển (radius 8px), các chi tiết nứt nẻ hoặc đường viền thô mộc.

5. CHỦ ĐỀ ĐỜI SỐNG / VLOGS / TIN TỨC / CHỦ ĐỀ KHÁC (Vlogs/News/General):
   - Nền: Tối nguyên bản Neubrutalism (#060709) kèm lưới ô vuông chấm tròn tương phản cao.
   - Bảng màu Neon: Vàng Neon chói lọi (#e2ff3b), Cam Neon cá tính (#ff6b00), Xanh lá Neon.
   - Hạt trang trí lơ lửng ở nền: Các ngôi sao 4 cánh Neubrutalism đặc trưng, các chấm tròn to nhỏ xoay chuyển.
   - Typography: Font 'Lexend Mega' hoặc 'Montserrat' (weight 900) thời thượng.
   - Thẻ Bento: Phong cách Neubrutalism cổ điển viền đen siêu dày 8px, đổ bóng phẳng lệch góc 14px thô mộc.

=== YÊU CẦU CHI TIẾT VỀ GIAO DIỆN & TIÊU CHUẨN KỸ THUẬT (BẮT BUỘC) ===
- TRÁNH LỖI PHÂN RÃ CHỮ & TRÀN VIỀN:
  * Toàn bộ chữ phụ đề '.scene-text' BẮT BUỘC phải bọc trong các thẻ block có thuộc tính: 'white-space: normal; word-wrap: break-word; overflow-wrap: break-word; word-break: break-word; text-align: center; display: block; width: 100%;'
  * Mỗi từ '.word-wrapper' bên trong phải dùng style 'display: inline-block; vertical-align: middle; margin-right: 0.22em;' và lớp chữ '.word' bên trong dùng 'display: inline-block;'.
  * Đặt thẻ cha '#scene-container' ở vùng an toàn tuyệt đối của màn hình dọc:
    'position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; padding: 140px 45px; box-sizing: border-box; z-index: 50; overflow: hidden;'
- BENTO GRID 2 KHỐI ĐỘC LẬP CHO CẢNH CÓ ẢNH:
  * Nếu Cảnh CÓ HÌNH ẢNH ('scene.imageUrl'): Hiển thị một khối ảnh phía trên '.scene-image-card' và khối chữ phụ đề phía dưới '.scene-text-card' viền dày bóng đổ phẳng lệch góc.
  * Nếu Cảnh KHÔNG CÓ HÌNH ẢNH: Khối '.scene-text-card' tự động mở rộng to bản toàn diện ('full-size'), căn giữa hoàn mỹ, sử dụng cỡ chữ khổng lồ (từ 44px đến 50px) để tạo cú hit thị giác đỉnh cao!
- AUDIO-REACTIVE EQUALIZER: Bên trong mỗi '.scene-text-card', tích hợp một cụm cột sóng equalizer âm thanh 5 thanh đứng '.equalizer-bar' tự động co giãn chiều cao nhịp nhàng bằng keyframes để tăng độ sống động.
- LOGO PILL BADGE & PROGRESSBAR NEON: Thiết kế logo pill chữ đậm cách điệu ở góc trên bằng CSS, tránh dùng img logo. Thanh tiến trình chạy suốt thời lượng video ở đáy màn hình viền đen dày ruột neon rực rỡ.

=== KHUNG LẬP TRÌNH DỰNG DOM & GSAP TIMELINE ĐỘNG (BẮT BUỘC) ===
Bạn phải viết mã JavaScript ở cuối file sử dụng đúng cấu trúc sau (Lưu ý: Bắt buộc viết mã này bên trong khối code javascript):

var SCENES_DATA = JSON.parse('{{ SCENES_JSON }}');
var SCENE_DURATIONS = JSON.parse('{{ SCENE_DURATIONS_JSON }}');
var TOTAL_DURATION = parseFloat("{{ DURATION }}") || 15;

var mainTl = gsap.timeline({ paused: true });
window.__timelines = { "main": mainTl };
window._tl = mainTl;

var currentTime = 0;
var CROSSFADE = 0.6; // Thời gian chồng chéo cảnh tiếp theo đè lên cảnh trước

// Hàm tách từ để làm stagger word slide-up mượt mà
function splitTextToSpans(text) {
  if (!text) return '';
  return text.split(' ').map(function(word) {
    if (!word.trim()) return '';
    return '<span class="word-wrapper" style="display:inline-block; overflow:hidden; vertical-align:bottom; margin-right:0.22em;"><span class="word" style="display:inline-block; transform:translateY(105%); opacity:0; will-change:transform, opacity;">' + word + '</span></span>';
  }).join(' ');
}

for (var i = 0; i < SCENES_DATA.length; i++) {
  var scene = SCENES_DATA[i];
  var duration = SCENE_DURATIONS[i] || 5;
  var sceneId = 'scene-' + i;

  // 1. Tạo phần tử DOM động dựa trên cấu trúc Layout độc bản bạn thiết kế
  var sceneEl = document.createElement('div');
  sceneEl.id = sceneId;
  sceneEl.className = 'scene-card';
  sceneEl.style.display = 'none';
  
  // Chu kỳ màu sắc cho từng bento card
  var bgColors = ['--accent-yellow', '--accent-cyan', '--accent-pink', '--accent-purple'];
  var currentBgVar = bgColors[i % bgColors.length];
  
  var htmlContent = '';
  // Hiển thị hình ảnh ở bất cứ cảnh nào có scene.imageUrl (Bento grid 2 ô xếp chồng)
  if (scene.imageUrl) {
    htmlContent += '<div class="scene-image-card">';
    htmlContent += '  <img class="scene-image" src="' + scene.imageUrl + '" />';
    htmlContent += '</div>';
    htmlContent += '<div class="scene-text-card" style="background-color: var(' + currentBgVar + ');">';
    htmlContent += '  <div class="scene-text highlight-text">' + splitTextToSpans(scene.bodyText || scene.voiceText || '') + '</div>';
    htmlContent += '  <div class="equalizer-container">';
    htmlContent += '    <div class="equalizer-bar bar-1"></div>';
    htmlContent += '    <div class="equalizer-bar bar-2"></div>';
    htmlContent += '    <div class="equalizer-bar bar-3"></div>';
    htmlContent += '    <div class="equalizer-bar bar-4"></div>';
    htmlContent += '    <div class="equalizer-bar bar-5"></div>';
    htmlContent += '  </div>';
    htmlContent += '</div>';
  } else {
    // Không có ảnh thì thẻ chữ căn giữa to bản chiếm trọn không gian thẻ card
    htmlContent += '<div class="scene-text-card full-size" style="background-color: var(' + currentBgVar + ');">';
    htmlContent += '  <div class="scene-text centered-text">' + splitTextToSpans(scene.bodyText || scene.voiceText || '') + '</div>';
    htmlContent += '  <div class="equalizer-container">';
    htmlContent += '    <div class="equalizer-bar bar-1"></div>';
    htmlContent += '    <div class="equalizer-bar bar-2"></div>';
    htmlContent += '    <div class="equalizer-bar bar-3"></div>';
    htmlContent += '    <div class="equalizer-bar bar-4"></div>';
    htmlContent += '    <div class="equalizer-bar bar-5"></div>';
    htmlContent += '  </div>';
    htmlContent += '</div>';
  }
  sceneEl.innerHTML = htmlContent;
  
  document.getElementById('scene-container').appendChild(sceneEl);

  // 2. Tạo sub-timeline riêng cho cảnh này
  var tl = gsap.timeline();
  
  // 3. Entrance Animation: Bento Card giật nảy Spring + Xoay nhẹ
  var rotationAngle = i % 2 === 0 ? 1.8 : -1.8;
  tl.set(sceneEl, { display: 'flex', zIndex: 50 + i }, 0);
  tl.fromTo(sceneEl, 
    { opacity: 0, y: 80, scale: 0.9, rotation: rotationAngle },
    { opacity: 1, y: 0, scale: 1, rotation: 0, duration: 0.75, ease: "back.out(1.5)" }, 
    0
  );

  // Ken Burns zoom chậm ảnh B-roll
  var imgEl = sceneEl.querySelector('.scene-image');
  if (imgEl) {
    tl.fromTo(imgEl, 
      { scale: 1.0 }, 
      { scale: 1.15, duration: duration, ease: "none" }, 
      0
    );
  }

  // Word stagger slide-up
  var words = sceneEl.querySelectorAll('.word');
  if (words.length > 0) {
    tl.to(words, {
      y: '0%',
      opacity: 1,
      duration: 0.55,
      stagger: 0.035,
      ease: "power3.out"
    }, 0.12);
  }

  // 4. Exit Animation: Đồng bộ chồng chéo với cảnh tiếp theo (nếu chưa phải cảnh cuối)
  if (i < SCENES_DATA.length - 1) {
    tl.to(sceneEl, { 
      opacity: 0,
      y: -60,
      scale: 0.95,
      rotation: -rotationAngle / 2,
      duration: CROSSFADE,
      ease: "power2.in"
    }, duration - CROSSFADE);
  }

  // 5. Thêm sub-timeline vào main timeline
  mainTl.add(tl, currentTime);

  // 6. Dọn dẹp ẩn cảnh sau khi cảnh tiếp theo đã che phủ hoàn toàn để tránh lag trình duyệt
  if (i < SCENES_DATA.length - 1) {
    mainTl.add(gsap.set(sceneEl, { visibility: 'hidden' }), currentTime + duration);
    currentTime += duration - CROSSFADE;
  } else {
    currentTime += duration;
  }
}

// 7. Animate ProgressBar chạy từ 0% đến 100% suốt toàn bộ video (Bắt buộc phải add trực tiếp vào mainTl ở giây 0 để seek được)
if (document.getElementById('progressBar')) {
  mainTl.to("#progressBar", { width: "100%", duration: TOTAL_DURATION, ease: "none" }, 0);
}

// 8. Outro fade mượt toàn bộ màn hình về đen ở cuối video
mainTl.to("#root", { opacity: 0, duration: 0.5, ease: "power2.inOut" }, TOTAL_DURATION - 0.5);

// Đăng ký HyperFrames seeker contract
window.__hf = {
  duration: TOTAL_DURATION,
  seek: function(t) { if (window._tl) window._tl.pause().seek(t); }
};
\`\`\`

=== YÊU CẦU ĐẦU RA ===
Trả về duy nhất mã nguồn index.html hoàn chỉnh nhất bên trong khối code markdown \`\`\`html. Tuyệt đối không giải thích thêm hay viết lời mở đầu/kết thúc nào cả.
`;
  try {
    const model = resolvedAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const cleanHtml = text.replace(/```html/g, '').replace(/```/g, '').trim();
    return cleanHtml;
  } catch (error) {
    console.error('[AI HTML] Error generating custom dynamic HTML template:', error);
    return '';
  }
}


/**
 * Dynamic Template AI generator: uses Gemini Flash to analyze the script content
 * and output tailored CSS/HTML template parameters matching the theme/tone.
 */
async function generateAiTemplateSettings(scenes: any[]): Promise<any> {
  const resolvedAI = getAIClient(genAI);
  if (!resolvedAI) {
    console.warn('[AI Template] AI not configured. Returning empty settings.');
    return {};
  }

  const scriptText = scenes.map(s => `[Cảnh ${s.id} - ${s.type}]: ${s.voiceText || s.bodyText || ''}`).join('\n');
  const prompt = `
Bạn là chuyên gia thiết kế đồ họa chuyển động (motion designer) và đạo diễn nghệ thuật (art director) cho video ngắn trên TikTok/Reels.

Dưới đây là kịch bản video dạng cảnh (scene-based) bằng tiếng Việt:
=== KỊCH BẢN ===
${scriptText}

Nhiệm vụ của bạn là phân tích tông giọng, chủ đề, cảm xúc và cấu trúc của kịch bản này để thiết kế ra một bộ thông số giao diện (template settings) hoàn hảo nhất, thu hút người xem từ 3 giây đầu tiên và giữ chân họ xuyên suốt video.

=== QUY TẮC PHÂN TÍCH TÔNG GIỌNG (TONE & THEME) ===
Hãy xác định chủ đề chủ đạo của video (ví dụ: Công nghệ, Tin tức giật gân, Tài chính/Kinh doanh, Lịch sử kịch tính, Động lực cuộc sống, Hài hước/Giải trí...) và chọn:
1. Palette màu phối hợp (màu logo, màu hook, màu tag badge, màu nền, màu divider, màu thẻ card, màu chữ body). Hãy dùng các màu sắc nổi bật, độ bão hòa tốt cho video dọc.
2. Phông chữ (fontFamily) phù hợp với cảm xúc chủ đạo:
   - "Anton" hoặc "Inter" cho tin tức mạnh mẽ, giật gân, kịch tính, công nghệ.
   - "Outfit" hoặc "Inter" cho hiện đại, tối giản, sang trọng, khoa học.
   - "Playfair Display" hoặc "Georgia" cho chiều sâu nghệ thuật, lịch sử cổ điển.
   - "Montserrat" cho truyền cảm hứng, thể thao, năng động.
3. Hoạt ảnh chuyển động (Animations) cho từng khối văn bản:
   - Các hoạt ảnh hỗ trợ: "slide-up", "slide-down", "slide-left", "slide-right", "fade-in", "scale-in", "rotate-in", "bounce-in".

=== CÁC PHÍM THÔNG SỐ BẮT BUỘC TRONG JSON TRẢ VỀ ===
Hãy chọn các giá trị cho các trường thuộc tính dưới đây:
- "logoText": Một nhãn ngắn gọn đại diện cho chủ đề (tối đa 12 chữ viết hoa, ví dụ: "TIN NÓNG", "SỨC KHỎE", "AI TECH", "SỰ THẬT").
- "logoColor": Màu hex của logo (ví dụ: "#EF4444", "#10B981").
- "logoAlign": Vị trí căn lề logo: "center", "left", "right".
- "logoPlacement": Vị trí đặt logo theo chiều dọc: "top", "center", "bottom".
- "logoAnim": Hoạt ảnh logo: "slide-down", "fade-in", "scale-in", v.v.
- "logoSize": Kích thước chữ logo (số nguyên từ 36 đến 56).
- "hookColor": Màu chữ tiêu đề cảnh mở đầu (Hook) (màu sáng rõ, nổi bật, ví dụ: "#FBBF24", "#FFFFFF").
- "hookAnim": Hoạt ảnh xuất hiện chữ tiêu đề: "rotate-in", "scale-in", "slide-up", "fade-in", v.v.
- "hookSize": Kích thước chữ tiêu đề cảnh mở đầu (Hook) (số nguyên từ 72 đến 96).
- "bodyColor": Màu chữ nội dung chính (ví dụ: "#FFFFFF" hoặc màu sữa "rgba(255,255,255,0.95)").
- "bodyAnim": Hoạt ảnh nội dung chính: "slide-up", "fade-in", "slide-left", v.v.
- "bodySize": Kích thước chữ nội dung (số nguyên từ 38 đến 48).
- "dividerColor": Màu sắc thanh phân tách (ví dụ: trùng tông với logoColor).
- "dividerWidth": Chiều rộng thanh divider (số nguyên từ 100 đến 250).
- "mainAlign": Căn lề khối chữ chính: "center", "left", "right".
- "mainPlacement": Vị trí đặt khối chữ chính theo chiều dọc: "center", "top", "bottom".
- "tagText": Nhãn tiêu đề phụ nổi bật (ví dụ: "XU HƯỚNG", "KỸ NĂNG", "BÍ MẬT").
- "tagBg": Màu nền của tag badge (ví dụ: màu tương phản nổi bật như xanh dương "#3B82F6", đỏ "#EF4444").
- "tagColor": Màu chữ của tag badge (thường là "#ffffff" hoặc "#000000").
- "tagAlign": Căn lề của tag badge: "center", "left", "right".
- "tagPlacement": Vị trí đặt tag badge theo chiều dọc: "bottom", "top", "center".
- "tagAnim": Hoạt ảnh tag badge: "slide-right", "slide-left", "fade-in", "scale-in".
- "tagSize": Kích thước chữ tag badge (số nguyên từ 24 đến 32).
- "backgroundBrightness": Độ sáng hình nền (số thực từ 0.3 đến 0.5 để đảm bảo độ tương phản chữ đọc tốt).
- "showCard": Hiển thị khung thẻ bọc nội dung hay không (boolean: true hoặc false. Dùng true nếu muốn phong cách glassmorphism hiện đại).
- "cardBgColor": Màu nền thẻ card (ví dụ: "rgba(0,0,0,0.3)" hoặc "rgba(255,255,255,0.05)" hoặc "rgba(0,0,0,0)" nếu không muốn dùng).
- "cardBorderColor": Màu viền thẻ card (ví dụ: "rgba(255,255,255,0.1)").
- "cardBorderRadius": Độ bo góc thẻ card (số nguyên từ 0 đến 32).
- "fontFamily": Tên font chữ được chọn (một trong các font: "Inter", "Anton", "Montserrat", "Outfit", "Georgia").
- "showLogo": Có hiển thị logo hay không (boolean: true).
- "showTag": Có hiển thị tag badge hay không (boolean: true).
- "showDatetime": Có hiển thị ngày giờ hay không (boolean: true).
- "showProgressBar": Có hiển thị thanh chạy tiến trình hay không (boolean: true).

=== YÊU CẦU ĐẦU RA ===
Trả về duy nhất 1 JSON object hợp lệ chứa đầy đủ các khóa trên, tuyệt đối không giải thích thêm hay bọc trong khối code markdown gì cả.
`;

  try {
    const model = resolvedAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error('[AI Template] Error generating settings:', error);
    return {};
  }
}

export const runVideoGenerationPipeline = async (articleId: string, settings: any, existingVideoId?: string, userId?: string) => {
  const {
    templateId, ttsProvider, ttsVoiceId, bgmAssetId, bgmVolume, ratio,
    customContent, customScript, customImageUrl, source, title: settingsTitle
  } = settings;

  const videoId = existingVideoId || `v_${articleId}_${Date.now()}`;
  let script: any = { scenes: [] };
  let title = settingsTitle || 'Untitled Video';

  console.log(`🎬 [RENDER START] Beginning pipeline for Video ID: ${videoId}`);
  console.log(`🔍 [RENDER INFO] ArticleID: ${articleId || 'None'}, Source: ${source || 'internal'}`);
  console.log(`📝 [RENDER DATA] hasContent: ${!!customContent}, hasScript: ${!!customScript}`);

    // Set initial progress
    videoProgress.set(videoId, { progress: 5, phase: 'Initializing...', title });

  try {
    
    // 1. Load script from customScript or customContent (Snapshot)
    const scriptSource = customScript || customContent;
    let customSettings: any = null;

    if (scriptSource) {
      try {
        if (typeof scriptSource === 'string' && scriptSource.trim().startsWith('{')) {
          const parsed = JSON.parse(scriptSource);
          if (parsed.scenes && Array.isArray(parsed.scenes)) {
            script = { scenes: parsed.scenes };
            customSettings = parsed.customSettings || null;
          } else if (Array.isArray(parsed)) {
            script = { scenes: parsed };
          } else {
            script = generateScriptFromText(scriptSource, customImageUrl);
          }
        } else if (typeof scriptSource === 'object') {
          if (Array.isArray(scriptSource)) {
            script = { scenes: scriptSource };
          } else if ((scriptSource as any).scenes) {
            script = { scenes: (scriptSource as any).scenes };
            customSettings = (scriptSource as any).customSettings || null;
          } else {
            script = { scenes: [scriptSource] };
          }
        } else {
          script = generateScriptFromText(String(scriptSource), customImageUrl);
        }
      } catch (e) {
        script = generateScriptFromText(String(scriptSource), customImageUrl);
      }
    }

    // Merge customSettings from the pipeline parameters if provided directly
    if (!customSettings && settings.settings) {
      customSettings = settings.settings;
    }

    if (script.scenes) {
      console.log(`📦 [RENDER] Script initialized (${script.scenes.length} scenes).`);
    }

    // 2. Fallback only if snapshot is missing (Legacy)
    if ((!script.scenes || script.scenes.length === 0) && articleId) {
      console.log(`📂 [RENDER] Falling back to Article query for ID: ${articleId}...`);
      const article = await prisma.article.findUnique({ where: { id: articleId } });
      if (article) {
        script = article.script as any;
        if (title === 'Untitled Video') title = article.title;
      }
    }

    if (!script || !script.scenes || script.scenes.length === 0) {
      throw new Error('No valid script found for rendering');
    }

    // Process AI dynamic template settings if templateId is 'dynamic'
    let customHtml: string | undefined;
    if (templateId === 'dynamic') {
      try {
        console.log(`[PIPELINE] Selected DYNAMIC TEMPLATE. Invoking AI to design custom HTML structure...`);
        customHtml = await generateAiDynamicHtml(title, script.scenes || [], customSettings || {});
        console.log(`[PIPELINE] Dynamic HTML designed successfully (length: ${customHtml?.length || 0} chars).`);
      } catch (err) {
        console.error(`[PIPELINE] Failed to generate AI custom HTML, falling back to defaults:`, err);
      }
    }

    // Process video generation asynchronously
    let bgmTempPath: string | undefined;
    try {

      const rawScenes = script.scenes;
      const scenes: any[] = Array.isArray(rawScenes) ? rawScenes : (rawScenes ? [rawScenes] : []);
      const localTmpDir = path.join(process.cwd(), 'render_cache');
      if (!fs.existsSync(localTmpDir)) fs.mkdirSync(localTmpDir, { recursive: true });

      // === PARALLEL: TTS + BGM Download ===
      // Run both concurrently since they're independent I/O operations
      const SEPARATOR = ' . . . ';
      const validScenes = scenes.map(s => ({ ...s, voiceText: s.voiceText || '' }));
      const fullText = validScenes.map(s => s.voiceText).join(SEPARATOR);

      console.log(`[PIPELINE] STEP 1: Starting TTS (${fullText.length} chars) + BGM download in parallel...`);
      videoProgress.set(videoId, { progress: 10, phase: 'Generating AI Audio...', title });

      const ttsStartTime = Date.now();

      // BGM download task (runs in parallel with TTS)
      const bgmTask = (async () => {
        if (!bgmAssetId || bgmAssetId === 'none') return;
        try {
          if (bgmAssetId.startsWith('preset:')) {
            const presetName = bgmAssetId.replace('preset:', '');
            const presetPath = path.join(process.cwd(), 'public', 'bgm', presetName);
            if (fs.existsSync(presetPath)) {
              bgmTempPath = presetPath;
              console.log(`[RENDER] Using preset BGM: ${presetName}`);
            }
          } else {
            const bgmAsset = await prisma.asset.findUnique({ where: { id: bgmAssetId } });
            if (bgmAsset && bgmAsset.url) {
              const extension = bgmAsset.url.split('.').pop()?.split('?')[0] || 'mp3';
              bgmTempPath = path.join(localTmpDir, `${videoId}_bgm.${extension}`);
              console.log(`[RENDER] Downloading BGM (${extension}) from: ${bgmAsset.url}`);
              await downloadFile(bgmAsset.url, bgmTempPath);
            }
          }
        } catch (bgmErr) {
          console.error('[RENDER] BGM download failed, continuing without BGM:', bgmErr);
          bgmTempPath = undefined;
        }
      })();

      // TTS generation task (runs in parallel with BGM)
      const ttsTask = generateAudio(fullText, templateId, {
        provider: ttsProvider,
        voiceId: ttsVoiceId,
      });

      // Wait for both to complete
      const [, ttsRes] = await Promise.all([bgmTask, ttsTask]);
      const ttsDuration = (Date.now() - ttsStartTime) / 1000;
      console.log(`[PIPELINE] TTS+BGM COMPLETE in ${ttsDuration.toFixed(1)}s: Audio ${ttsRes.durationSeconds}s, Buffer ${ttsRes.buffer.length} bytes`);

      // Use a timestamped filename to avoid any OS-level file caching
      const audioPath = path.join(localTmpDir, `${videoId}_${Date.now()}_audio.${ttsRes.ext}`);
      fs.writeFileSync(audioPath, ttsRes.buffer);

      let totalDuration = getAudioDuration(audioPath);
      console.log(`[PIPELINE] FFPROBE Duration for ${path.basename(audioPath)}: ${totalDuration}s`);

      if (!totalDuration || totalDuration <= 0) {
        console.warn(`[PIPELINE] ffprobe failed, falling back to TTS estimate: ${ttsRes.durationSeconds}`);
        totalDuration = ttsRes.durationSeconds || 5; 
      }
      
      // Ensure minimum duration to prevent HyperFrames crash
      totalDuration = Math.max(totalDuration, 1.0);
      console.log(`[PIPELINE] Final Audio Master Duration: ${totalDuration.toFixed(2)}s`);

      videoProgress.set(videoId, { progress: 20, phase: 'Preparing Assets...', title }); // TTS Fully finished and analyzed

      const totalChars = validScenes.reduce((sum, s) => sum + (s.voiceText?.length || 0), 0);
      const CROSSFADE = 0.6; // Synchronize with template's CROSSFADE constant
      const sceneDurations = validScenes.map((s, idx) => {
        const charCount = s.voiceText?.length || 1;
        const baseDuration = (charCount / totalChars) * totalDuration;
        // Compensate for crossfade: every scene except the last one must be extended 
        // by the CROSSFADE duration because it will be overlapped by the next scene.
        return idx < validScenes.length - 1 ? baseDuration + CROSSFADE : baseDuration;
      });

      console.log(`[PIPELINE] Proportional Scene Durations: ${sceneDurations.map(d => d.toFixed(2)).join(', ')} (Total: ${totalDuration.toFixed(2)}s)`);

      // === VIDEO RENDERING ===
      const outputPath = path.join(localTmpDir, `${videoId}.mp4`);

      await renderWithHyperFrames({
        videoId,
        scenes: validScenes, // Use cleaned scenes
        sceneDurations,
        templateId,
        outputPath,
        audioBuffer: ttsRes.buffer,
        audioExt: ttsRes.ext,
        audioDuration: totalDuration,
        bgmPath: bgmTempPath,
        bgmVolume: typeof bgmVolume === 'number' ? bgmVolume : 0.15,
        ratio: ratio || '9:16',
        settings: customSettings || undefined, // PASS CUSTOM SETTINGS TO RENDERER
        customHtml, // PASS DYNAMIC CUSTOM HTML GENERATED BY AI
        onProgress: (p) => {
          const scaledProgress = 20 + (p * 0.75); // 20% to 95%
          videoProgress.set(videoId, { progress: Math.round(scaledProgress), phase: 'Rendering Frames...', title });
        }
      });

      // === CLOUD UPLOAD ===
      console.log(`[RENDER] Uploading results to Cloudinary for persistence...`);
      videoProgress.set(videoId, { progress: 96, phase: 'Uploading results...', title });

      // Upload video and audio to Cloudinary
      const [videoCloudUrl, audioCloudUrl] = await Promise.all([
        uploadVideo(outputPath, 'autoreels_videos', true), // Keep local for a bit
        uploadVideo(audioPath, 'autoreels_audio', true)
      ]);

      // Save to DB with Cloud URLs
      const video = await prisma.video.create({
        data: {
          id: videoId,
          title: title,
          videoUrl: videoCloudUrl,
          audioUrl: audioCloudUrl,
          status: 'ready',
          userId: userId || null,
          source: source || 'internal'
        }
      });

      // Try to link to article and update its status
      if (articleId) {
        await prisma.article.updateMany({
          where: { id: articleId },
          data: {
            status: 'video_generated',
            videoId: video.id
          }
        });
      }

      videoProgress.set(videoId, { progress: 100, phase: 'Finished', title });

      // Cleanup progress map after 5 minutes to prevent memory leak
      setTimeout(() => videoProgress.delete(videoId), 5 * 60 * 1000);

      // === CLEANUP ===
      // Cleanup temp audio file (TTS)
      try { if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath); } catch (_) { }

      // Cleanup temp BGM file (but not preset files)
      if (bgmTempPath && bgmAssetId && !bgmAssetId.startsWith('preset:')) {
        try { if (fs.existsSync(bgmTempPath)) fs.unlinkSync(bgmTempPath); } catch (_) { }
      }
    } catch (err: any) {
      console.error('[VIDEO GEN ERROR]', err);
      videoProgress.set(videoId, { progress: -1, phase: 'Error occurred', title });

      if (bgmTempPath && settings.bgmAssetId && !settings.bgmAssetId.startsWith('preset:')) {
        try { fs.unlinkSync(bgmTempPath); } catch (_) { }
      }

      if (articleId) {
        await prisma.article.updateMany({
          where: { id: articleId },
          data: { status: 'summarized' }
        });
      }
      throw err;
    }
  } catch (err: any) {
    console.error('[PIPELINE FATAL ERROR]', err);
    throw err; // Re-throw so videoWorker can update task status to 'error'
  }
};

// Local download helper removed in favor of storage service downloadFile

export const getProgress = (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const videoId = req.params.id;

  const sendProgress = () => {
    const statusObj = videoProgress.get(videoId) || { progress: 0, phase: 'Pending' };
    res.write(`data: ${JSON.stringify(statusObj)}\n\n`);

    if (statusObj.progress === 100 || statusObj.progress === -1) {
      clearInterval(interval);
      res.end();
    }
  };

  // Send immediately, then poll
  sendProgress();
  const interval = setInterval(sendProgress, 1000);

  req.on('close', () => {
    clearInterval(interval);
  });
};

export const deleteVideo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const video = await prisma.video.findUnique({ where: { id: req.params.id } });
    if (!video) throw new Error('Video not found');

    const user = (req as any).user;
    if (user.role !== 'admin' && video.userId !== user.id) {
      return res.status(403).json({ error: 'You do not have permission to delete this video' });
    }

    // 1. Delete from Cloudinary (if it's a cloud URL)
    if (video.videoUrl && video.videoUrl.startsWith('http')) {
      console.log(`[Video] Deleting remote video: ${video.videoUrl}`);
      await deleteRemoteFile(video.videoUrl).catch(err => console.error('[Video] Cloudinary delete failed:', err));
    }

    if (video.audioUrl && video.audioUrl.startsWith('http')) {
      console.log(`[Video] Deleting remote audio: ${video.audioUrl}`);
      await deleteRemoteFile(video.audioUrl).catch(err => console.error('[Video] Cloudinary audio delete failed:', err));
    }

    // 2. Delete local file (if exists)
    const videoPath = path.join(process.cwd(), 'render_cache', `${req.params.id}.mp4`);
    if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);

    // 3. Delete from DB
    await prisma.video.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

export const postToTikTok = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await publishToTikTok(req.params.videoId);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const playVideo = async (req: Request, res: Response) => {
  const videoId = req.params.id;
  const videoPath = path.join(process.cwd(), 'render_cache', videoId.endsWith('.mp4') ? videoId : `${videoId}.mp4`);

  if (fs.existsSync(videoPath)) {
    return res.sendFile(videoPath);
  }

  // If local file is missing (published and archived), check DB for Cloudinary URL
  try {
    const video = await prisma.video.findUnique({ where: { id: videoId } });
    if (video && video.videoUrl && video.videoUrl.startsWith('http')) {
      return res.redirect(video.videoUrl);
    }
    return res.status(404).json({ error: 'Video file not found' });
  } catch (err) {
    return res.status(404).json({ error: 'Video file not found' });
  }
};

export const getActiveTasks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const where: any = { 
      status: { in: ['pending', 'processing'] }
    };
    
    if (user && user.role !== 'admin') {
      where.userId = user.id;
    }

    const tasks = await prisma.videoTask.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    res.json(tasks);
  } catch (err) {
    next(err);
  }
};

export const getTikTokStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const video = await prisma.video.findUnique({ where: { id: req.params.videoId } });
    if (!video) return res.status(404).json({ error: 'Video not found' });
    res.json({ status: video.status, publishId: video.publishId });
  } catch (err) {
    next(err);
  }
};


