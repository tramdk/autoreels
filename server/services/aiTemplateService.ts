import { genAI, getAIClient } from '../lib/ai';

/**
 * Sanitize AI-generated HTML to prevent "Bad control character in string literal" errors.
 * 
 * Problem: Gemini Flash sometimes outputs literal control characters (newlines, tabs, etc.)
 * inside JS string literals like JSON.parse('...'). When the browser executes this code,
 * JSON.parse throws "Bad control character in string literal".
 * 
 * This function:
 * 1. Finds all JSON.parse('...') single-quoted string arguments in the HTML
 * 2. Strips literal control characters from inside those strings
 * 3. Ensures {{ SCENES_JSON }} / {{ SCENE_DURATIONS_JSON }} placeholders are properly formatted
 * 4. Removes any hardcoded Vietnamese text that AI may have leaked into JS blocks
 */
function sanitizeAiHtmlForJsonParse(html: string): string {
  let result = html;

  // 1. Fix AI sometimes wrapping JSON.parse with double quotes instead of single quotes
  //    e.g. JSON.parse("{{ SCENES_JSON }}") → JSON.parse('{{ SCENES_JSON }}')
  result = result.replace(
    /JSON\.parse\(\s*"(\{\{[^}]+\}\})"\s*\)/g,
    "JSON.parse('$1')"
  );

  // 2. Fix AI sometimes using template literals: JSON.parse(`{{ SCENES_JSON }}`)
  result = result.replace(
    /JSON\.parse\(\s*`(\{\{[^}]+\}\})`\s*\)/g,
    "JSON.parse('$1')"
  );

  // 3. Clean control characters inside ALL single-quoted JS strings that contain {{ }} placeholders
  //    This catches: JSON.parse('{{ SCENES_JSON }}'), var x = '{{ SOME_VAR }}', etc.
  result = result.replace(
    /('(?:[^'\\]|\\.)*\{\{[^}]+\}\}(?:[^'\\]|\\.)*')/g,
    (match) => {
      // Remove literal control characters (newlines, tabs, carriage returns, etc.)
      // but keep the escaped versions (\n, \t, \r) as-is
      return match.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '')  // Remove non-printable controls
                  .replace(/\r\n/g, '')   // Remove literal CRLF
                  .replace(/\r/g, '')     // Remove literal CR
                  .replace(/\n/g, '')     // Remove literal LF
                  .replace(/\t/g, ' ');   // Replace literal TAB with space
    }
  );

  // 4. Ensure {{ SCENES_JSON }} placeholder exists — if AI hardcoded data instead of using the placeholder,
  //    try to detect and fix it
  if (!result.includes('{{ SCENES_JSON }}') && !result.includes('{{SCENES_JSON}}')) {
    // Check for variants AI might produce
    const scenesVarPattern = /var\s+SCENES_DATA\s*=\s*JSON\.parse\(\s*'([^']*)'\s*\)/;
    const match = result.match(scenesVarPattern);
    if (match && !match[1].includes('SCENES_JSON')) {
      // AI hardcoded data — replace with placeholder
      console.warn('[AI HTML Sanitizer] AI hardcoded SCENES_DATA instead of using {{ SCENES_JSON }} placeholder. Fixing...');
      result = result.replace(scenesVarPattern, "var SCENES_DATA = JSON.parse('{{ SCENES_JSON }}')");
    }
  }

  // 5. Same check for SCENE_DURATIONS_JSON
  if (!result.includes('{{ SCENE_DURATIONS_JSON }}') && !result.includes('{{SCENE_DURATIONS_JSON}}')) {
    const durationsVarPattern = /var\s+SCENE_DURATIONS\s*=\s*JSON\.parse\(\s*'([^']*)'\s*\)/;
    const match = result.match(durationsVarPattern);
    if (match && !match[1].includes('SCENE_DURATIONS_JSON')) {
      console.warn('[AI HTML Sanitizer] AI hardcoded SCENE_DURATIONS instead of using {{ SCENE_DURATIONS_JSON }} placeholder. Fixing...');
      result = result.replace(durationsVarPattern, "var SCENE_DURATIONS = JSON.parse('{{ SCENE_DURATIONS_JSON }}')");
    }
  }

  // 6. Normalize {{ KEY }} spacing: handle AI writing {{KEY}} or {{ KEY}} or {{KEY }}
  result = result.replace(/\{\{\s*(SCENES_JSON)\s*\}\}/g, '{{ SCENES_JSON }}');
  result = result.replace(/\{\{\s*(SCENE_DURATIONS_JSON)\s*\}\}/g, '{{ SCENE_DURATIONS_JSON }}');
  result = result.replace(/\{\{\s*(DURATION)\s*\}\}/g, '{{ DURATION }}');
  result = result.replace(/\{\{\s*(WIDTH)\s*\}\}/g, '{{ WIDTH }}');
  result = result.replace(/\{\{\s*(HEIGHT)\s*\}\}/g, '{{ HEIGHT }}');

  // 7. Ngăn chặn exit animation trên sceneEl: fading sceneEl (chứa bg) gây chớp nháy đen giữa các cảnh
  //    Chỉ nên fade .scene-content, .scene-text-card — không bao giờ fade chính scene container
  //    Pattern: tl.to(sceneEl, { opacity: 0, ... }, exitTime)
  result = result.replace(
    /tl\s*\.\s*to\s*\(\s*sceneEl\s*,\s*\{[^}]*opacity\s*:\s*0[^}]*\}\s*,\s*[^)]+\)/gi,
    '/* EXIT ANIMATION REMOVED (opacity on sceneEl causes bg flash between scenes) */'
  );
  //    Pattern: tl.fromTo(sceneEl, { ... }, { opacity: 0, ... }, exitTime)
  result = result.replace(
    /tl\s*\.\s*fromTo\s*\(\s*sceneEl\s*,\s*\{[^}]*\}\s*,\s*\{[^}]*opacity\s*:\s*0[^}]*\}\s*,\s*[^)]+\)/gi,
    '/* EXIT ANIMATION REMOVED (opacity on sceneEl causes bg flash between scenes) */'
  );

  return result;
}

/**
 * Standalone AI Custom HTML Template Generator: uses Gemini Flash to design 
 * a 100% custom visual layout, styling, and GSAP timeline specifically tailored 
 * to the emotions, theme, and rhythm of the script.
 */
export async function generateAiDynamicHtml(title: string, scenes: any[], customSettings: any, ratio: string = '9:16', templateId: string = 'dynamic'): Promise<string> {
  const resolvedAI = getAIClient(genAI);
  if (!resolvedAI) {
    console.warn('[AI HTML] AI not configured. Returning empty string.');
    return '';
  }

  const sampleScene = scenes[0] || { id: 1, type: 'hook', voiceText: 'Nội dung mẫu cảnh mở đầu' };
  const scriptSummary = scenes.map((s, idx) => `Cảnh ${idx + 1}: ${s.voiceText || s.bodyText || ''}`).join('\n');
  let ratioLayoutRules = "";
  if (ratio === '16:9') {
    ratioLayoutRules = `
=== QUY TẮC BỐ CỤC KHUNG HÌNH NGANG (16:9 LANDSCAPE WIDESCREEN) ===
Bạn đang thiết kế cho màn hình ngang (16:9) chuẩn máy tính/TV/Youtube.
1. CONTAINER GỐC #root: Bắt buộc khai báo: <div id="root" data-composition-id="main" data-width="1920" data-height="1080" data-start="0" data-duration="{{ DURATION }}">
2. ĐỊNH VỊ PHỦ ĐÈ TUYỆT ĐỐI (.scene-card): Toàn bộ các thẻ cảnh '.scene-card' BẮT BUỘC phải sử dụng thuộc tính CSS định vị absolute chồng lên nhau để crossfade hoàn hảo:
   'position: absolute; inset: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; box-sizing: border-box;'
3. BỐ CỤC LINH HOẠT THEO PHONG CÁCH:
   - Hãy thiết kế bố cục ngang rộng rãi, chia cột hợp lý hoặc căn giữa nghệ thuật tùy thuộc vào Style được chọn (ví dụ: Promo dùng split-screen 50/50 hoặc thẻ nổi bật; Tech dùng bento-grid ngang hoặc console mockup; Editorial dùng layout tối giản sang trọng).
`;
  } else if (ratio === '1:1') {
    ratioLayoutRules = `
=== QUY TẮC BỐ CỤC KHUNG HÌNH VUÔNG (1:1 SQUARE INSTAGRAM) ===
Bạn đang thiết kế cho màn hình vuông (1:1).
1. CONTAINER GỐC #root: Bắt buộc khai báo: <div id="root" data-composition-id="main" data-width="1080" data-height="1080" data-start="0" data-duration="{{ DURATION }}">
2. ĐỊNH VỊ PHỦ ĐÈ TUYỆT ĐỐI (.scene-card): Toàn bộ các thẻ cảnh '.scene-card' BẮT BUỘC phải sử dụng thuộc tính CSS định vị absolute chồng lên nhau để crossfade hoàn hảo:
   'position: absolute; inset: 0; width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center; box-sizing: border-box; padding: 60px 40px;'
`;
  } else {
    ratioLayoutRules = `
=== QUY TẮC BỐ CỤC KHUNG HÌNH DỌC (9:16 VERTICAL MOBILE TIKTOK/REELS) ===
Bạn đang thiết kế cho màn hình đứng (9:16) chuẩn di động.
1. CONTAINER GỐC #root: Bắt buộc khai báo: <div id="root" data-composition-id="main" data-width="1080" data-height="1920" data-start="0" data-duration="{{ DURATION }}">
2. ĐỊNH VỊ PHỦ ĐÈ TUYỆT ĐỐI (.scene-card): Toàn bộ các thẻ cảnh '.scene-card' BẮT BUỘC phải sử dụng thuộc tính CSS định vị absolute chồng lên nhau để crossfade hoàn hảo:
   'position: absolute; inset: 0; width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: center; box-sizing: border-box; padding: 160px 45px;'
3. TRÁNH CHIA CỘT NGANG RỘNG: Vì chiều rộng 9:16 rất hẹp, hãy thiết kế bố cục xếp chồng dọc mượt mà (ảnh/video ở trên hoặc làm nền mờ toàn màn hình, chữ và call-to-action xếp dưới).
`;
  }

  const prompt = `
Bạn là giám đốc nghệ thuật kiêm nhà phát triển frontend motion cao cấp (creative director & senior motion designer) chuyên thiết kế các video chất lượng điện ảnh chuyên nghiệp hàng đầu cho các nền tảng mạng xã hội.

Dưới đây là thông tin chi tiết về kịch bản video để bạn phân tích chủ đề:
=== THÔNG TIN KỊCH BẢN ===
- Tiêu đề video: "${title}"
- Nội dung kịch bản để phân tích chủ đề:
"${scriptSummary}"
- Cấu trúc dữ liệu của 1 cảnh mẫu: ${JSON.stringify(sampleScene)}
- Tỷ lệ khung hình video hiện tại: ${ratio}

Nhiệm vụ của bạn là: Lập trình ra MỘT TRANG index.html hoàn toàn mới, standalone, hoàn chỉnh 100% để HyperFrames (sử dụng GSAP + Puppeteer) render ra video. 

=== CHỈ THỊ PHONG CÁCH (STYLE DIRECTIVE) ===
${templateId === 'promo' ? `BẮT BUỘC sử dụng phong cách [PROMO & MARKETING]. Thiết kế phải mang đậm tính thương mại cao cấp, kêu gọi hành động mạnh mẽ, thu hút mua hàng/đăng ký.` : `Hãy TỰ ĐỘNG phân tích kịch bản để chọn phong cách phù hợp nhất trong danh sách bên dưới.`}

=== CÁC PHONG CÁCH NGHỆ THUẬT CÓ SẴN (STYLE CLASSIFICATION) ===
Bạn BẮT BUỘC phải tự thiết kế một hệ thống CSS cực kỳ đẹp mắt, nhiều màu sắc, có chiều sâu, mang tính thẩm mỹ cao (WOW factor). CẤM HOÀN TOÀN việc để nền màu đen thui đơn điệu (#000000). Hãy sử dụng:
- Các dải màu Gradient chuyển động mượt mà (Linear/Radial/Mesh gradients) kết hợp với các đốm sáng Neon mờ ảo (flowing blur blobs).
- Khung thẻ chứa Glassmorphism hiện đại (bo góc lớn từ 24px - 32px, viền trắng mờ phát sáng nhẹ, đổ bóng mịn màng).
- Bố cục Bento Grid tinh tế hoặc Split-Screen chia tỉ lệ vàng cực chuyên nghiệp.

1. [PROMO & MARKETING] (Quảng cáo, ra mắt sản phẩm, bán hàng, khuyến mãi):
   - Tone màu & Nền: Nền gradient chuyển động cực mạnh (ví dụ: Deep Purple sang Emerald, hoặc Dark Charcoal sang Warm Orange #FF4E50). Thêm các đốm sáng neon (blur circles) chuyển động mượt mà dưới nền.
   - Layout & Graphics: Thẻ Bento nổi bật dạng Glassmorphism cao cấp, viền vàng kim hoặc neon phát sáng, nút bấm CTA (Call to Action) lớn bo tròn rực rỡ, các nhãn dán như "SALE", "HOT", "MUA NGAY".
   - Typography: Chữ tiêu đề siêu lớn, bold 900, tô màu gradient óng ánh, bóng chữ rực rỡ.

2. [CINEMATIC & EDITORIAL] (Lịch sử, kể chuyện, triết lý, tin tức tài chính cao cấp):
   - Tone màu & Nền: Gradient tông màu sang trọng, tối giản nhưng ấm áp (ví dụ: Be trầm ấm sang Dark Charcoal, hoặc Creamy White sang Emerald). Có hiệu ứng Vignette tối mờ ở 4 góc để tập trung ánh nhìn.
   - Layout & Graphics: Khung ảnh cổ điển siêu mỏng tinh khiết (Classic Border), đường phân cách thanh lịch (0.5px), khoảng trống thoáng đãng (Generous Whitespace).
   - Typography: Font chữ Serif quý phái như 'fraunces' hoặc 'lora' kết hợp với Sans-serif mảnh mai cực kỳ sang trọng.

3. [TECH & DEVELOPMENT] (AI, lập trình, công nghệ, tiền điện tử):
   - Tone màu & Nền: Nền Dark Cyber Deep (Đen sâu thẳm kết hợp với Grid tọa độ chấm bi nhỏ mờ ảo màu Xanh Mint neon hoặc Tím Cyber). Các đốm sáng phát quang mềm mại.
   - Layout & Graphics: Bố cục Bento Grid công nghệ, các ô dữ liệu xếp chồng mượt mà, khung mô phỏng giao diện Terminal/Browser macOS tối giản có nút bấm 3 màu đỏ/vàng/xanh ở góc trái.
   - Typography: Sử dụng font Monospace ('jetbrains mono', 'fira code') cho các thẻ phụ, màu xanh neon phát sáng.

4. [DYNAMIC & ENERGETIC] (Giải trí, tin nhanh, thể thao, tạo động lực):
   - Tone màu & Nền: Gradient chéo góc nghiêng (ví dụ: Vàng chanh rực rỡ sang Đen nhám hoặc Xanh lá Neon sang Tím khói).
   - Layout & Graphics: Thiết kế phá cách với góc nghiêng nhẹ (skew -3deg), viền kép (double borders), họa tiết Retro Halftone hoặc sọc chéo thể thao năng động.
   - Typography: Chữ cực lớn (Heavy Ultra Bold), viền chữ đen dày cá tính.

=== CẢNH BÁO CỰC KỲ QUAN TRỌNG VỀ FONT CHỮ TRONG HYPERFRAMES (BẮT BUỘC TUÂN THỦ 100%) ===
Trình biên dịch của HyperFrames phân tích font chữ tĩnh (static compilation) nên có những giới hạn cực kỳ khắt khe sau:
1. TUYỆT ĐỐI KHÔNG ĐƯỢC phép sử dụng biến CSS để khai báo font-family (ví dụ: CẤM VIẾT 'font-family: var(--font-family)' hay 'font-family: var(...)'). Bạn BẮT BUỘC phải viết trực tiếp tên font chữ dưới dạng chuỗi literal trong thuộc tính CSS (ví dụ: 'font-family: "montserrat", sans-serif;' hoặc 'font-family: "plus jakarta sans", sans-serif;').
2. BẮT BUỘC KHÔNG SỬ DỤNG CÁC FONT CHỮ BỊ CẤM SAU (Banned Fonts):
   - Tuyệt đối CẤM các font mặc định, nhàm chán gây cảm giác "AI tạo" sau: 'inter', 'roboto', 'open sans', 'lato', 'poppins', 'outfit', 'nunito', 'playfair display', 'eb garamond', 'syne'.
3. CHỈ ĐƯỢC PHÉP sử dụng các font chất lượng cao hỗ trợ Tiếng Việt cực tốt sau:
   - Sans-serif: 'montserrat', 'plus jakarta sans', 'lexend', 'space grotesk', 'be vietnam pro', 'archivo', 'oswald', 'bebas neue'.
   - Serif: 'lora', 'merriweather', 'fraunces', 'crimson pro', 'dm serif display', 'newsreader'.
   - Monospace: 'jetbrains mono', 'space mono', 'source code pro', 'fira code'.
4. Cặp font tương phản cao (Typography Pairings & Weight Contrast):
   - Luôn kết hợp font có độ tương phản lớn về kiểu dáng hoặc độ dày.
5. BẮT BUỘC HỖ TRỢ TIẾNG VIỆT UNICODE (KHÔNG LỖI DIACRITICS):
   - Bạn BẮT BUỘC phải nhập liên kết Google Fonts ở thẻ <head> chứa đúng các bộ font được hỗ trợ tiếng Việt có dấu hoàn hảo.

=== HIỆU ỨNG VÀ CHUYỂN CẢNH CAO CẤP TRÊN HYPERFRAMES (BẮT BUỘC) ===
1. CẤM HOÀN TOÀN SCALE/ZOOM DƯỚI MỌI HÌNH THỨC TRÊN CARD/WORD/SCENE QUA GSAP:
   - Tuyệt đối CẤM sử dụng GSAP (timeline hay tween) để tạo hiệu ứng zoom/scale hoặc thay đổi tọa độ Y trên các chữ/từ đang highlight (active word) để tránh giật seeker và Puppeteer crashes.
   - Khi render hoặc seek, GSAP reset scale đột ngột gây giật nháy hình.
2. ACTIVE WORD HIGHLIGHTING QUA MÀU SẮC VÀ GLOW:
   - Highlight chữ chạy: chữ mặc định ở trạng thái inactive sẽ mờ nhẹ (e.g., \`opacity: 0.4; color: #ffffff;\`).
   - Khi được đọc tới, GSAP sẽ chỉ thay đổi màu chữ (color) sang màu neon làm điểm nhấn sáng (ví dụ: Vàng Neon \`#FFE600\`, Xanh mint \`#4AE3B5\` hoặc Cam rực rỡ), tăng opacity lên \`1\`, và thêm bóng chữ phát sáng nhẹ. Cấm thay đổi scale, rotation, hay vị trí Y của từ trong lúc highlight!
3. CHUYỂN CẢNH CSS KEYFRAMES VÀ PANNING:
   - Sử dụng CSS \`@keyframes\` animations để thực hiện transition đi vào cho các slide/ảnh và hiệu ứng pan nền (panning) bằng \`translate3d\`.
   - Định nghĩa sẵn các \`@keyframes\` trong thẻ \`<style>\`:
     * Chuyển động pan ảnh nền (Background Panning):
       \`@keyframes hf-pan-slow-ltr { from { transform: translate3d(-30px, -10px, 0) scale(1.15); } to { transform: translate3d(30px, 10px, 0) scale(1.15); } }\`
       (Lưu ý: giữ \`scale(1.15)\` cố định trong suốt quá trình pan để tránh nháy viền).
4. EXIT TRANSITION FADE INTERNAL CARDS ONLY (CẤM FADE sceneEl CONTAINER):
   - Tuyệt đối KHÔNG được fade opacity của \`sceneEl\` (scene container) về 0. Làm như vậy sẽ làm ẩn luôn ảnh nền blur và gây chớp nháy màn hình đen giữa các cảnh.
   - Thay vào đó, exit transition của mỗi cảnh chỉ được fade-out các elements nội dung bên trong về \`opacity: 0\` khi gần hết thời gian cảnh (bắt đầu từ \`duration - CROSSFADE\`).

${ratioLayoutRules}

=== CẢNH BÁO BẮT BUỘC KHÁC VỀ THẺ CHỮ & BỐ CỤC CHUNG ===
1. Bạn TUYỆT ĐỐI KHÔNG ĐƯỢC phép hardcode bất kỳ thẻ HTML nào đại diện cho cảnh.
2. Thẻ body của bạn BẮT BUỘC phải bọc toàn bộ nội dung trong một container chính duy nhất có cấu trúc chính xác như sau để đảm bảo có background rực rỡ, không bị đen:
   <div id="root" data-composition-id="main" data-width="{{ WIDTH }}" data-height="{{ HEIGHT }}" data-start="0" data-duration="{{ DURATION }}">
     <!-- Hai đốm sáng phát quang ambient cực đẹp để tạo chiều sâu cho video, ngăn chặn nền đen -->
     <div class="ambient-glow ambient-glow-1"></div>
     <div class="ambient-glow ambient-glow-2"></div>
     
     <div id="bg-container"></div>
     <div id="scene-container"></div>
   </div>
3. Trong thẻ \`<style>\`, bạn BẮT BUỘC phải định nghĩa các lớp CSS chất lượng cao cho \`.ambient-glow\`, \`.ambient-glow-1\`, \`.ambient-glow-2\` sử dụng radial-gradient với các màu neon tương thích với chủ đề đã chọn và hiệu ứng di chuyển \`@keyframes float-ambient\` (sử dụng translate3d và blur từ 80px - 120px) để nền luôn luôn chuyển động sang trọng, óng ánh đầy chiều sâu.
4. Các thẻ chứa chữ \`.scene-text-card\` hoặc Bento cards của bạn BẮT BUỘC phải sử dụng phong cách Glassmorphism cao cấp: \`background: rgba(255, 255, 255, 0.05); backdrop-filter: blur(20px); border: 1.5px solid rgba(255, 255, 255, 0.1); border-radius: 28px; box-shadow: 0 20px 50px rgba(0,0,0,0.3);\` hoặc tương tự để tăng tính thẩm mỹ vượt trội.
5. Bạn BẮT BUỘC phải viết mã JavaScript ở cuối file sử dụng đúng khung cấu trúc vòng lặp dưới đây để sinh DOM động và dựng timeline GSAP seekable hoàn mỹ.

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

// Hàm tách dòng và bọc trong card viền cùng stagger word slide-up mượt mà
function splitTextToLineCards(text) {
  if (!text) return '';
  var lines = text.split(/(?:<br\\s*\\/?>|\\n)/gi);
  return lines.map(function(line) {
    var trimmed = line.trim();
    if (!trimmed) return '';
    var wordsSpans = trimmed.split(' ').map(function(word) {
      if (!word.trim()) return '';
      return '<span class="word-wrapper" style="display:inline-block; overflow:hidden; vertical-align:bottom; margin-right:0.25em;"><span class="word" style="display:inline-block; transform:translateY(105%); opacity:0.4; color:#ffffff; will-change:transform, opacity, color, text-shadow;">' + word + '</span></span>';
    }).join(' ');
    return '<div class="scene-line-card">' + wordsSpans + '</div>';
  }).join('');
}

// Xóa sạch container trước khi nạp
if (document.getElementById('bg-container')) {
  document.getElementById('bg-container').innerHTML = '';
}
document.getElementById('scene-container').innerHTML = '';

for (var i = 0; i < SCENES_DATA.length; i++) {
  var scene = SCENES_DATA[i];
  var duration = SCENE_DURATIONS[i] || 5;
  var sceneId = 'scene-' + i;

  // 1. Tạo lớp ảnh nền mờ ảo (B-roll Background Blur Layer)
  var bgEl = null;
  if (document.getElementById('bg-container')) {
    bgEl = document.createElement('div');
    bgEl.className = 'scene-bg-layer';
    bgEl.id = 'bg-' + i;
    if (scene.imageUrl) {
      bgEl.style.backgroundImage = 'url(' + scene.imageUrl + ')';
    }
    document.getElementById('bg-container').appendChild(bgEl);
  }

  // 2. Tạo phần tử DOM động dựa trên cấu trúc style của bạn
  var sceneEl = document.createElement('div');
  sceneEl.id = sceneId;
  sceneEl.className = 'scene-card';
  sceneEl.style.display = 'none';
  sceneEl.setAttribute('data-start', currentTime.toFixed(3));
  sceneEl.setAttribute('data-duration', duration.toFixed(3));
  
  var htmlContent = '';
  
  // HÃY TỰ DO THIẾT KẾ CẤU TRÚC HTML ĐỘC ĐÁO PHÙ HỢP VỚI CHỦ ĐỀ KỊCH BẢN CỦA BẠN!
  // Bạn có 100% sự linh hoạt để sắp xếp, thiết kế các thẻ chứa (ví dụ: chia đôi trái-phải, 
  // bento grid, khung terminal mockups, khung điện ảnh cổ điển, hoặc thẻ promo sản phẩm).
  // ĐIỀU KIỆN DUY NHẤT để GSAP tự động nhận diện và tạo chuyển động mượt mà là:
  // - Khối chứa hình ảnh của bạn phải có class "scene-image-card"
  // - Mỗi dòng phụ đề phải được bọc bằng hàm splitTextToLineCards() và có class "scene-line-card"
  // - Mỗi từ trong phụ đề sẽ tự động có class "word" để phục vụ việc highlight karaoke chữ chạy.
  //
  // Ví dụ cấu trúc linh hoạt:
  if (scene.imageUrl) {
    var panClass = (i % 2 === 0) ? 'pan-ltr' : 'pan-rtl';
    htmlContent += '<div class="scene-image-card my-custom-img-container">';
    htmlContent += '  <img class="scene-image ' + panClass + '" src="' + scene.imageUrl + '" style="animation-duration: ' + duration + 's;" />';
    htmlContent += '</div>';
    htmlContent += '<div class="scene-text-card my-custom-text-layout">';
    htmlContent += '  <div class="scene-text highlight-text">' + splitTextToLineCards(scene.bodyText || scene.voiceText || '') + '</div>';
    htmlContent += '</div>';
  } else {
    htmlContent += '<div class="scene-text-card full-size my-custom-text-layout">';
    htmlContent += '  <div class="scene-text centered-text">' + splitTextToLineCards(scene.bodyText || scene.voiceText || '') + '</div>';
    htmlContent += '</div>';
  }
  
  sceneEl.innerHTML = htmlContent;
  document.getElementById('scene-container').appendChild(sceneEl);

  // 3. Tạo sub-timeline riêng cho cảnh này
  var tl = gsap.timeline();
  tl.set(sceneEl, { display: 'flex', visibility: 'visible', zIndex: 50 + i }, 0);
  if (bgEl) {
    tl.set(bgEl, { display: 'block', visibility: 'visible', zIndex: i + 1 }, 0);
  }

  // C. Chuyển động Panning ảnh B-roll qua CSS class (pan-ltr/pan-rtl)
  // Không sử dụng GSAP scale/zoom.

  // D. Staggered entrance for B-roll image card (không scale)
  var imgCard = sceneEl.querySelector('.scene-image-card');
  if (imgCard) {
    tl.fromTo(imgCard, 
      { opacity: 0, y: 35 },
      { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" },
      0
    );
  }

  // E. Entrance animation for line cards (staggered, không scale)
  var lineCards = sceneEl.querySelectorAll('.scene-line-card');
  if (lineCards.length > 0) {
    tl.fromTo(lineCards, 
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.7, stagger: 0.15, ease: "power3.out" },
      0.1
    );
  }

  // F. Word stagger slide-up with spring bounce inside line cards (không scale)
  var words = sceneEl.querySelectorAll('.word');
  if (words.length > 0) {
    tl.fromTo(words, 
      { y: '105%', opacity: 0.4 },
      { y: '0%', opacity: 0.4, duration: 0.45, stagger: 0.025, ease: "back.out(1.4)" },
      0.2
    );

    // Active word-by-word coloring and glow (simulated stagger over scene duration)
    var highlightDuration = duration - 0.6 - CROSSFADE;
    if (highlightDuration > 0.5) {
      tl.to(words, {
        color: '#FFE600', // Đổi màu highlight động theo style của bạn (ví dụ màu vàng neon)
        textShadow: '0 0 12px rgba(255, 230, 0, 0.75)',
        opacity: 1,
        stagger: {
          each: highlightDuration / words.length
        },
        duration: 0.25
      }, 0.65);
    }
  }

  // G. Exit transition: fade-out các elements nội dung bên trong (.scene-text-card và .scene-image-card)
  // để tạo hiệu ứng crossfade hoàn hảo mà không làm mất ảnh nền blur của sceneEl.
  if (i < SCENES_DATA.length - 1) {
    var textCard = sceneEl.querySelector('.scene-text-card');
    if (textCard) {
      tl.to(textCard, { opacity: 0, duration: CROSSFADE, ease: "power2.in" }, duration - CROSSFADE);
    }
    if (imgCard) {
      tl.to(imgCard, { opacity: 0, duration: CROSSFADE, ease: "power2.in" }, duration - CROSSFADE);
    }
  }

  // 4. Thêm sub-timeline vào main timeline
  mainTl.add(tl, currentTime);

  // 5. Dọn dẹp: chỉ ẩn scene (visibility), không xóa bg layer — bg cũ crossfade mượt sang bg mới
  if (i < SCENES_DATA.length - 1) {
    mainTl.add(gsap.set(sceneEl, { visibility: 'hidden', zIndex: -1 }), currentTime + duration + 0.3);
    if (bgEl) {
      mainTl.add(gsap.set(bgEl, { visibility: 'hidden', zIndex: -1 }), currentTime + duration + 0.3);
    }
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
    
    // HỆ THỐNG PHÒNG THỦ & CHUẨN HÓA FONT CHỮ CHO HYPERFRAMES (POST-PROCESSING SANITIZER)
    let sanitizedHtml = cleanHtml;
    
    // 1. Catch-all: replace ANY var(--xxx) CSS variable reference in any context with safe fallback
    sanitizedHtml = sanitizedHtml.replace(/var\(--[a-zA-Z0-9_-]+\)/g, "'montserrat'");
    
    // 2. Regex chuẩn hóa font-family với CSS variable (font-family: var(--xxx))
    sanitizedHtml = sanitizedHtml.replace(/font-family\s*:\s*[^;}]*var\([^)]+\)[^;}]*/gi, "font-family: 'montserrat', sans-serif");
    
    // 3. Chuẩn hóa triệt để bất kỳ phông chữ nào không nằm trong danh sách hỗ trợ của HyperFrames
    const ALLOWED_FONTS = [
      'montserrat', 'plus jakarta sans', 'plus-jakarta-sans', 'lexend', 'space grotesk', 
      'be vietnam pro', 'be-vietnam-pro', 'archivo', 'oswald', 'bebas neue',
      'lora', 'merriweather', 'fraunces', 'crimson pro', 'dm serif display', 'dm-serif-display', 
      'newsreader', 'jetbrains mono', 'space mono', 'source code pro', 'fira code',
      'archivo black', 'arial black', 'arial', 'courier new', 'courier', 'din alternate',
      'futura', 'garamond', 'helvetica bold', 'helvetica neue', 'helvetica', 'ibm plex mono',
      'league gothic', 'noto sans japanese', 'noto sans jp', 'segoe ui',
      'inherit', 'initial', 'unset', 'revert'
    ];
    
    sanitizedHtml = sanitizedHtml.replace(/font-family\s*:\s*([^;}]+)/gi, (match, fontVal) => {
      const fontValLower = fontVal.toLowerCase();
      const hasAllowed = ALLOWED_FONTS.some(font => fontValLower.includes(font));
      if (hasAllowed) {
        return match;
      }
      return "font-family: 'montserrat', sans-serif";
    });
    
    // 4. SANITIZE JSON.parse() PATTERNS — Fix AI generating broken single-quoted JS string literals
    // AI sometimes outputs literal newlines/tabs/control chars inside JS strings which breaks JSON.parse
    sanitizedHtml = sanitizeAiHtmlForJsonParse(sanitizedHtml);
    
    return sanitizedHtml;
  } catch (error) {
    console.error('[AI HTML] Error generating custom dynamic HTML template:', error);
    return '';
  }
}





/**
 * Dynamic Template AI generator: uses Gemini Flash to analyze the script content
 * and output tailored CSS/HTML template parameters matching the theme/tone.
 */
export async function generateAiTemplateSettings(scenes: any[]): Promise<any> {
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
Hãy xác định chủ đề chủ đạo của video (ví dụ: Công nghệ, Tin tức giật gân, Tài chính/Kinh doanh, Quảng cáo sản phẩm/Khuyến mãi, Lịch sử kịch tính, Động lực cuộc sống, Hài hước/Giải trí...) và chọn:
1. Palette màu phối hợp (màu logo, màu hook, màu tag badge, màu nền, màu divider, màu thẻ card, màu chữ body). Hãy dùng các màu sắc nổi bật, độ bão hòa tốt cho video dọc (nhấn mạnh màu đỏ/vàng/cam cho chủ đề quảng cáo khuyến mãi).
2. Phông chữ (fontFamily) phù hợp với cảm xúc chủ đạo (Lưu ý: BẮT BUỘC chỉ chọn các font hỗ trợ tiếng Việt Unicode hoàn hảo, tránh bị lỗi hiển thị các từ có dấu):
   - "Plus Jakarta Sans" hoặc "Be Vietnam Pro" cho tin tức mạnh mẽ, giật gân, kịch tính, công nghệ, hoặc tối giản, hiện đại, sang trọng, khoa học.
   - "Fraunces" hoặc "Lora" cho chiều sâu nghệ thuật, lịch sử cổ điển.
   - "Montserrat" hoặc "Lexend" cho truyền cảm hứng, thể thao, năng động, quảng cáo bán hàng, tin tức nhanh.
   - "Space Grotesk" hoặc "JetBrains Mono" cho công nghệ, AI, tương lai.
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
- "fontFamily": Tên font chữ được chọn (BẮT BUỘC chỉ được chọn một trong các phông chữ hỗ trợ tiếng Việt có dấu tốt nhất sau: "Plus Jakarta Sans", "Montserrat", "Be Vietnam Pro", "Lexend", "Lora", "Fraunces", "Space Grotesk", "JetBrains Mono"). Tuyệt đối KHÔNG chọn Anton, Georgia, hay các font bị cấm như Inter, Outfit, Nunito, Playfair Display để tránh giao diện rập khuôn.
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
