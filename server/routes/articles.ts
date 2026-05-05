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
        script: JSON.stringify(script),
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
  const resolvedAI = getAIClient(genAI);

  if (!resolvedAI) {
    return res.status(500).json({ error: 'AI not configured' });
  }

  const article = await prisma.article.findUnique({ where: { id: req.params.id } });
  if (!article) return res.status(404).json({ error: 'Article not found' });

  try {
    const model = resolvedAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const prompt = `
Bạn là chuyên gia viết kịch bản video TikTok viral bằng tiếng Việt.

Hãy tóm tắt bài báo dưới đây thành một kịch bản video dạng cảnh (scene-based), phù hợp để đọc voice-over bằng TTS (Text-to-Speech).

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
    { "id": 1, "type": "hook", "voiceText": "...", "imageKeyword": "...", "imageUrl": "..." },
    { "id": 2, "type": "body", "voiceText": "...", "imageKeyword": "...", "imageUrl": "" },
    { "id": N, "type": "outro", "voiceText": "...", "imageKeyword": "...", "imageUrl": "" }
  ],
  "suggestedImages": ["...", "...", "..."]
}
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();

    console.log(`[AI Summarize] Success for article: ${article.id}`);

    await prisma.article.update({
      where: { id: article.id },
      data: { script: cleanJson, status: 'summarized' }
    });

    res.json(JSON.parse(cleanJson));
  } catch (error: any) {
    console.error('[AI Summarize] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id/script', authenticate, async (req, res) => {
  const { script } = req.body;
  try {
    await prisma.article.update({
      where: { id: req.params.id },
      data: { script: JSON.stringify(script) }
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
