import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { scrapeRssSources } from '../services/scraper';
import { genAI, getAIClient } from '../lib/ai';

const router = Router();

router.get('/', authenticate, async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  const [total, items] = await Promise.all([
    prisma.article.count(),
    prisma.article.findMany({
      orderBy: { createdAt: 'desc' },
      include: { source: true },
      skip,
      take: limit,
    })
  ]);

  res.json({ total, items, page, limit, totalPages: Math.ceil(total / limit) });
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const article = await prisma.article.findUnique({
      where: { id: req.params.id },
      include: { source: true }
    });
    if (!article) return res.status(404).json({ error: 'Article not found' });
    res.json(article);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/scrape', authenticate, async (req, res) => {
  try {
    const newArticles = await scrapeRssSources();
    res.json({ success: true, count: newArticles.length, articles: newArticles });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/manual', authenticate, async (req, res) => {
  const { title, content, imageUrl } = req.body;
  try {
    const article = await prisma.article.create({
      data: {
        title,
        contentSnippet: content,
        imageUrl: imageUrl || null,
        link: 'manual://' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        status: 'scraped'
      }
    });
    res.json(article);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/manual-script', authenticate, async (req, res) => {
  const { title, script } = req.body;
  try {
    const article = await prisma.article.create({
      data: {
        title,
        contentSnippet: 'Manual Script',
        script: script as any,
        link: 'manual-script://' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        status: 'summarized'
      }
    });
    res.json(article);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/summarize/:id', authenticate, async (req, res) => {
  const { tone } = req.body;
  const resolvedAI = getAIClient(genAI);

  if (!resolvedAI) {
    return res.status(500).json({ error: 'AI not configured' });
  }

  const article = await prisma.article.findUnique({ where: { id: req.params.id } });
  if (!article) return res.status(404).json({ error: 'Article not found' });

  // Define tone-specific instructions
  const toneMap: Record<string, string> = {
    'Dramatic': 'Tông giọng kịch tính, sâu sắc, hồi hộp, dùng nhiều từ ngữ mạnh mẽ, khơi gợi cảm xúc mạnh.',
    'Humorous': 'Tông giọng hài hước, vui vẻ, châm biếm nhẹ nhàng, dùng ngôn ngữ trẻ trung, năng động, phá cách.',
    'News': 'Tông giọng tin tức, chuyên nghiệp, khách quan, ngắn gọn, súc tích, tập trung vào sự thật.',
    'Inspirational': 'Tông giọng truyền cảm hứng, tích cực, sâu lắng, truyền động lực, dùng từ ngữ mang tính khích lệ.',
    'AulaqAI': 'Tông giọng review công nghệ đỉnh cao, giải thích mã nguồn/AI ngắn gọn, sắc bén, kích thích trí tò mò, mang phong cách của kênh TikTok @aulaq.ai.'
  };

  const selectedTone = toneMap[tone] || toneMap['News'];

  try {
    const model = resolvedAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    let prompt = '';
    
    if (tone === 'AulaqAI') {
      prompt = `
Bạn là chuyên gia viết kịch bản video TikTok viral bằng tiếng Việt, có gu thẩm mỹ công nghệ đỉnh cao và phong cách trình bày dạng Slide/Bento của kênh @aulaq.ai.

Hãy tóm tắt bài viết dưới đây thành một kịch bản video slide-show công nghệ đặc sắc. Mỗi cảnh phải chứa hai trường văn bản riêng biệt:
1. "voiceText": Dành cho TTS (giọng đọc). Viết theo phong cách văn nói tự nhiên, sắc bén, khơi gợi sự tò mò.
2. "bodyText": Dành cho hiển thị trên màn hình (Visual Slide). Văn bản phải được cấu trúc cực kỳ tối giản, trình bày dạng slide thẻ giao diện, sử dụng các ký tự đặc biệt, biểu tượng và emoji để trực quan hóa thông tin.

=== CẤU TRÚC KỊCH BẢN (BẮT BUỘC) ===
- Tổng số cảnh: Từ 6 đến 12 cảnh.
- Cảnh 1 (Hook): Nêu bật vấn đề, sự cố hoặc mâu thuẫn lớn (ví dụ: lỗi code, code phèn, AI ngáo) khiến người xem đứng hình từ 3 giây đầu.
- Cảnh 2 (Concept/Giải pháp): Đưa ra hướng giải quyết tổng quan hoặc giới thiệu công cụ sẽ dùng.
- Cảnh 3-10 (Features/Anti-patterns): Phân tách thành 3 - 5 tính năng, quy trình từng bước, hoặc quy tắc cấm (Anti-patterns). Trực quan hóa bằng các thông số dạng điểm số, thanh trượt (slider), hoặc thẻ so sánh.
- Cảnh áp chót (Reality Check / Lưu ý): Nhận xét khách quan, lưu ý thực tế khi áp dụng công cụ để tăng độ tin cậy.
- Cảnh cuối (Outro / CTA): Kêu gọi hành động rõ ràng (lưu lại repo, lấy link ở bio, follow kênh).

=== QUY TẮC VIẾT VOICETEXT (TTS) ===
- Tổng số từ toàn bộ voiceText: 175-300 từ.
- KHÔNG sử dụng các ký hiệu viết tắt hoặc số. PHẢI viết hoàn toàn bằng chữ:
  Ví dụ: AI → "ây ai" | API → "ây pi ai" | TS → "tai pơ sờ cờ ríp" | 8/10 → "tám trên mười" | 200MB → "hai trăm mê ga bai" | v2.5 → "phiên bản hai chấm năm".
- Tuyệt đối cấm ký hiệu đặc biệt trong voiceText: &, %, $, #, @, +, *, /, -, ➔.
- Kết thúc mỗi câu bằng dấu chấm (.) hoặc dấu hỏi (?) để TTS ngắt nghỉ tự nhiên.

=== QUY TẮC CẤU TRÚC BODYTEXT (HIỂN THỊ SLIDE) ===
- BẮT BUỘC: Sử dụng thẻ \`<br>\` để xuống dòng trong bodyText. KHÔNG sử dụng \`\\n\`.
- Mỗi bodyText phải được cấu trúc dạng thẻ giao diện tối giản gồm:
  + Dòng 1: Nhãn phân đoạn viết hoa (như: \`[AI FRONTEND]\`, \`[ANTI-PATTERN]\`, \`[DIALS]\`, \`[EDGE CASES]\`).
  + Dòng 2: Tiêu đề phụ ngắn gọn.
  + Các dòng tiếp theo: Danh sách dạng dấu chấm tròn \`•\`, hoặc so sánh, hoặc giá trị thông số dạng thanh trượt mô phỏng (ví dụ: \`Strictness: [==== 8/10 ====] ✓\`).
- Ví dụ bodyText chuẩn:
  \`[ANTI-PATTERN]<br>Chặn code rác sinh ra<br>• Any type ➔ BAN 🚫<br>• Nested loops ➔ REDUCE ⚠️<br>• Hardcoded secrets ➔ BLOCK ❌\`
- Tuyệt đối KHÔNG viết các đoạn văn dài dòng vào bodyText. Càng ngắn gọn và trực quan càng tốt.

=== DỮ LIỆU BÀI BÁO ===
Tiêu đề: ${article.title}
Nội dung: ${article.contentSnippet}
Ảnh minh họa bài báo: ${article.imageUrl || 'Không có'}

=== QUY TẮC CHỌN ẢNH ===
- BẮT BUỘC: Nếu bài báo có "Ảnh minh họa bài báo", hãy đưa URL đó vào trường "imageUrl" của CẢNH ĐẦU TIÊN (Hook).
- Các cảnh khác để trống trường "imageUrl" để hệ thống tự tìm ảnh.

=== OUTPUT ===
Trả về DUY NHẤT một JSON object hợp lệ, không giải thích gì thêm:
{
  "scenes": [
    { "id": 1, "type": "hook", "voiceText": "...", "bodyText": "...", "imageKeyword": "...", "imageUrl": "..." },
    { "id": 2, "type": "body", "voiceText": "...", "bodyText": "...", "imageKeyword": "...", "imageUrl": "" },
    { "id": N, "type": "outro", "voiceText": "...", "bodyText": "...", "imageKeyword": "...", "imageUrl": "" }
  ],
  "suggestedImages": ["...", "...", "..."]
}
      `;
    } else {
      prompt = `
Bạn là chuyên gia viết kịch bản video TikTok viral bằng tiếng Việt.

Hãy tóm tắt bài báo dưới đây thành một kịch bản video dạng cảnh (scene-based), phù hợp để đọc voice-over bằng TTS (Text-to-Speech).

=== YÊU CẦU VỀ TÔNG GIỌNG (TONE OF VOICE) ===
${selectedTone}

=== CẤU TRÚC KỊCH BẢN ===
- Tổng số từ toàn bộ voiceText: khoảng 175-300 từ (tương đương 55-75 giây đọc tốc độ bình thường).
- Bảo đảm phải có đầy đủ mọi ý chính trong bài viết.
- Số cảnh: 5-12 cảnh, gồm: 1 hook + 3-10 body + 1 outro.
- Mỗi cảnh có voiceText từ 1-5 câu ngắn, viết theo văn nói tự nhiên, không văn viết.
- Kết thúc mỗi câu trong voiceText bằng dấu chấm (.) hoặc dấu hỏi (?) để TTS ngắt nghỉ tự nhiên.


=== QUY TẮC VIẾT VOICETEXT CHO TTS ===

1. SỐ VÀ ĐƠN VỊ — luôn viết thành chữ, KHÔNG dùng ký hiệu số rút gọn:
   - Số thập phân: dùng "chấm" (văn nói) hoặc "phẩy" (trang trọng).
     Ví dụ: 5.5 → "năm chấm năm" | 82.7% → "tám mươi hai phẩy bảy phần trăm"
   - Phiên bản: iPhone 17 → "iPhone mười bảy" | iOS 18.2 → "iOS mười tám chấm hai"
   - Thông số: 200MP → "hai trăm megapixel" | 5000mAh → "năm nghìn miliampe giờ"
   - Tiền tệ: 21 triệu đồng → "hai mươi mốt triệu đồng" | $5 → "năm đô la"

2. TÊN TIẾNG ANH — giữ nguyên, TTS đọc ổn:
   Apple, Google, OpenAI, Microsoft, TikTok, YouTube, ChatGPT, Gemini, Meta, Samsung ✓

3. TỪ VIẾT TẮT TIẾNG ANH — viết âm đọc nếu TTS hay đọc sai:
   - AI → "ây ai" | API → "ây pi ai" | GPT → "gí pi tí" | iOS → "ai ô ét"

4. KÝ HIỆU BỊ CẤM trong voiceText:
   → & % $ # + = * / \\ [ ] { } < > @
   (Dấu ! và ? ở cuối câu thì ĐƯỢC PHÉP)

=== QUY TẮC VIẾT HOOK ===
- Hook là cảnh đầu tiên, quyết định 3 giây đầu giữ người xem.
- PHẢI chứa ít nhất một trong: con số cụ thể, thống kê, tuyên bố gây sốc, hoặc câu hỏi kích thích tò mò.

=== DỮ LIỆU BÀI BÁO ===
Tiêu đề: ${article.title}
Nội dung: ${article.contentSnippet}
Ảnh minh họa bài báo: ${article.imageUrl || 'Không có'}

=== QUY TẮC CHỌN ẢNH ===
- BẮT BUỘC: Nếu bài báo có "Ảnh minh họa bài báo", hãy đưa URL đó vào trường "imageUrl" của CẢNH ĐẦU TIÊN (Hook).
- Các cảnh khác có thể để trống trường "imageUrl" để hệ thống tự tìm ảnh.

=== OUTPUT ===
Trả về DUY NHẤT một JSON object hợp lệ, không giải thích gì thêm:
{
  "scenes": [
    { "id": 1, "type": "hook", "voiceText": "...", "bodyText": "...", "imageKeyword": "...", "imageUrl": "..." },
    { "id": 2, "type": "body", "voiceText": "...", "bodyText": "...", "imageKeyword": "...", "imageUrl": "" },
    { "id": N, "type": "outro", "voiceText": "...", "bodyText": "...", "imageKeyword": "...", "imageUrl": "" }
  ],
  "suggestedImages": ["...", "...", "..."]
}
      `;
    }

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();

    console.log(`[AI Summarize] Success for article: ${article.id}`);

    // Parse and sanitize script data
    let parsedScript = JSON.parse(cleanJson);
    if (parsedScript && parsedScript.scenes && Array.isArray(parsedScript.scenes)) {
      parsedScript.scenes = parsedScript.scenes.map((scene: any) => ({
        ...scene,
        voiceText: cleanBracketTags(scene.voiceText || '', true),
        bodyText: cleanBracketTags(scene.bodyText || '', false),
      }));
    }

    const updatedArticle = await prisma.article.update({
      where: { id: article.id },
      data: { script: parsedScript as any, status: 'summarized' }
    });

    res.json(updatedArticle);
  } catch (error: any) {
    console.error('[AI Summarize] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Clean technical bracketed tags from script texts.
 * For voiceText (TTS), it removes ALL square brackets and their contents.
 * For bodyText (visual display), it removes technical tags but keeps stylistic ones (stripping just the brackets).
 */
export function cleanBracketTags(text: string, isVoiceText: boolean): string {
  if (!text) return '';
  if (isVoiceText) {
    // For voiceText (TTS): ALWAYS remove ALL square brackets and their contents completely,
    // along with any trailing colons, dashes or spaces.
    return text
      .replace(/\[[^\]]*\]\s*[:\-–—]?\s*/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  } else {
    // For bodyText (visual display):
    // 1. Completely remove technical/metadata tags like [Cảnh X], [Visual: ...], [Giọng đọc], [Music] etc.
    const technicalTagsRegex = /\[(cảnh|scene|visual|sound|music|sfx|bgm|giọng đọc|narrator|voiceover|voice|hình ảnh|âm thanh|hook|body|outro|intro)[^\]]*\]\s*[:\-–—]?\s*/gi;
    let cleaned = text.replace(technicalTagsRegex, '');
    
    // 2. For stylistic segment labels like [AI FRONTEND] or [ANTI-PATTERN], keep the text but strip the outer square brackets.
    // Make sure we do NOT touch progress-bar-like bracketed items, e.g., [==== 8/10 ====]
    cleaned = cleaned.replace(/\[([a-zA-Z0-9_\s\-–—]{3,})\]/g, '$1');
    
    return cleaned.trim();
  }
}

router.put('/:id/script', authenticate, async (req, res) => {
  const { script } = req.body;
  try {
    await prisma.article.update({
      where: { id: req.params.id },
      data: { script: script as any }
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/clear', authenticate, async (req, res) => {
  await prisma.article.deleteMany();
  res.json({ success: true });
});

export default router;
