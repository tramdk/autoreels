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

  return result;
}

/**
 * Standalone AI Custom HTML Template Generator: uses Gemini Flash to design 
 * a 100% custom visual layout, styling, and GSAP timeline specifically tailored 
 * to the emotions, theme, and rhythm of the script.
 */
export async function generateAiDynamicHtml(title: string, scenes: any[], customSettings: any, ratio: string = '9:16'): Promise<string> {
  const resolvedAI = getAIClient(genAI);
  if (!resolvedAI) {
    console.warn('[AI HTML] AI not configured. Returning empty string.');
    return '';
  }

  const sampleScene = scenes[0] || { id: 1, type: 'hook', voiceText: 'Nội dung mẫu cảnh mở đầu' };
  
  // Tổng hợp tóm tắt toàn bộ kịch bản để AI phân tích chủ đề sâu sắc
  const scriptSummary = scenes.map((s, idx) => `Cảnh ${idx + 1}: ${s.voiceText || s.bodyText || ''}`).join('\n');

  // ĐỊNH HƯỚNG BỐ CỤC THEO KHUNG HÌNH (DYNAMIC ASPECT RATIO RESPONSIVE RULES)
  let ratioLayoutRules = "";
  if (ratio === '16:9') {
    ratioLayoutRules = `
=== QUY TẮC BỐ CỤC KHUNG HÌNH NGANG (16:9 LANDSCAPE WIDESCREEN) ===
Bạn đang thiết kế cho màn hình ngang (16:9) chuẩn máy tính/TV/Youtube.
1. CONTAINER GỐC #root: Bắt buộc khai báo: <div id="root" data-composition-id="main" data-width="1920" data-height="1080" data-start="0" data-duration="{{ DURATION }}">
2. ĐỊNH VỊ PHỦ ĐÈ TUYỆT ĐỐI (.scene-card): Toàn bộ các thẻ cảnh '.scene-card' BẮT BUỘC phải sử dụng thuộc tính CSS định vị absolute chồng lên nhau để crossfade hoàn hảo:
   'position: absolute; inset: 0; width: 100%; height: 100%; display: flex; flex-direction: row; justify-content: center; align-items: center; gap: 40px; box-sizing: border-box; padding: 120px 80px;'
3. CHIA ĐÔI SONG SONG TRÁI-PHẢI (HORIZONTAL SIDE-BY-SIDE SPLIT):
   - Màn hình 16:9 cực kỳ rộng rãi theo chiều ngang. Nếu cảnh CÓ hình ảnh (scene.imageUrl):
     * Khối ảnh '.scene-image-card' nằm bên TRÁI, chiếm khoảng 46% chiều rộng và 100% chiều cao của khu vực hiển thị.
     * Khối chữ '.scene-text-card' nằm bên PHẢI, chiếm khoảng 46% chiều rộng và 100% chiều cao của khu vực hiển thị.
     * Hai khối này nằm cân đối cạnh nhau theo chiều ngang. Ảnh '.scene-image' phải có 'width: 100%; height: 100%; object-fit: cover; border-radius: 16px; will-change: transform, filter; transform-origin: center;'.
   - Nếu cảnh KHÔNG CÓ hình ảnh: Khối chữ '.scene-text-card.full-size' tự động chiếm trọn vẹn 100% không gian bề ngang và nằm ở vị trí trung tâm.
`;
  } else if (ratio === '1:1') {
    ratioLayoutRules = `
=== QUY TẮC BỐ CỤC KHUNG HÌNH VUÔNG (1:1 SQUARE INSTAGRAM) ===
Bạn đang thiết kế cho màn hình vuông (1:1).
1. CONTAINER GỐC #root: Bắt buộc khai báo: <div id="root" data-composition-id="main" data-width="1080" data-height="1080" data-start="0" data-duration="{{ DURATION }}">
2. ĐỊNH VỊ PHỦ ĐÈ TUYỆT ĐỐI (.scene-card): Toàn bộ các thẻ cảnh '.scene-card' BẮT BUỘC phải sử dụng thuộc tính CSS định vị absolute chồng lên nhau để crossfade hoàn hảo:
   'position: absolute; inset: 0; width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: center; gap: 30px; box-sizing: border-box; padding: 80px 45px;'
3. BỐ CỤC XẾP CHỒNG DỌC CÂN ĐỐI (VERTICAL BALANCED STACK):
   - Nếu cảnh CÓ hình ảnh (scene.imageUrl):
     * Khối ảnh '.scene-image-card' nằm ở trên, chiếm khoảng 44% chiều cao và 100% chiều rộng.
     * Khối chữ '.scene-text-card' nằm ở dưới, chiếm khoảng 44% chiều cao và 100% chiều rộng.
   - Nếu cảnh KHÔNG CÓ hình ảnh: Khối chữ '.scene-text-card.full-size' tự động mở rộng chiếm 80% không gian vuông ở trung tâm.
`;
  } else {
    // 9:16 vertical
    ratioLayoutRules = `
=== QUY TẮC BỐ CỤC KHUNG HÌNH DỌC (9:16 VERTICAL MOBILE TIKTOK/REELS) ===
Bạn đang thiết kế cho màn hình đứng (9:16) chuẩn di động.
1. CONTAINER GỐC #root: Bắt buộc khai báo: <div id="root" data-composition-id="main" data-width="1080" data-height="1920" data-start="0" data-duration="{{ DURATION }}">
2. ĐỊNH VỊ PHỦ ĐÈ TUYỆT ĐỐI (.scene-card): Toàn bộ các thẻ cảnh '.scene-card' BẮT BUỘC phải sử dụng thuộc tính CSS định vị absolute chồng lên nhau để crossfade hoàn hảo:
   'position: absolute; inset: 0; width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: center; gap: 35px; box-sizing: border-box; padding: 160px 45px;'
3. BỐ CỤC XẾP CHỒNG DỌC TUYỆT ĐỐI (NO HORIZONTAL COLUMNS):
   - Cấm hoàn toàn việc chia đôi màn hình theo chiều ngang (flex-direction: row) vì chiều rộng video đứng 9:16 cực kỳ hẹp.
   - Nếu cảnh CÓ hình ảnh (scene.imageUrl): Thiết kế dạng 2 khối bento xếp chồng dọc:
     * Khối ảnh '.scene-image-card' nằm ở trên, chiếm TỐI ĐA 32% chiều cao (height: 32%), chiều rộng 100% full viền bo góc. (Không được để ảnh quá to lấn chiếm chỗ của chữ). Ảnh '.scene-image' phải có 'width: 100%; height: 100%; object-fit: cover; border-radius: 16px; will-change: transform, filter; transform-origin: center;'.
     * Khối chữ '.scene-text-card' nằm ở dưới, ĐƯỢC ƯU TIÊN KHÔNG GIAN BẰNG CÁCH sử dụng 'flex: 1' hoặc 'height: 55%' để tự động chiếm toàn bộ phần không gian rộng lớn còn lại, đảm bảo văn bản dài không bao giờ bị cắt cụt.
   - Nếu cảnh KHÔNG CÓ hình ảnh: Khối chữ '.scene-text-card.full-size' tự động mở rộng chiếm trọn vẹn khu vực trung tâm (width: 100%; height: 80%;) với cỡ chữ khổng lồ bắt mắt.
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

Nhiệm vụ của bạn là: Lập trình ra MỘT TRANG index.html hoàn toàn mới, standalone, hoàn chỉnh 100% để HyperFrames (sử dụng GSAP + Puppeteer) render ra video. Trang này phải có giao diện ĐỘC BẢN, thiết kế đo ni đóng giày phù hợp hoàn hảo với chủ đề và nội dung của kịch bản trên!

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
   - Luôn kết hợp font có độ tương phản lớn về kiểu dáng hoặc độ dày (ví dụ: Tiêu đề dùng serif 'Fraunces' hoặc 'DM Serif Display' cực béo weight 900 kết hợp với nội dung dùng sans-serif 'Plus Jakarta Sans' hoặc 'Be Vietnam Pro' weight 400).
5. BẮT BUỘC HỖ TRỢ TIẾNG VIỆT UNICODE (KHÔNG LỖI DIACRITICS):
   - Bạn BẮT BUỘC phải nhập liên kết Google Fonts ở thẻ <head> chứa đúng các bộ font được hỗ trợ tiếng Việt có dấu hoàn hảo.
   - Ví dụ nhúng tối ưu:
     <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&family=Plus+Jakarta+Sans:wght@400;600;700;800&family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,700;0,9..144,900;1,9..144,400&family=Be+Vietnam+Pro:wght@400;600;700&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
   - Tuyệt đối cấm sử dụng các phông chữ custom lạ không có trên Google Fonts hoặc không hỗ trợ tiếng Việt có dấu, tránh việc các ký tự tiếng Việt có dấu bị lỗi hiển thị phông chữ hệ thống (tofu/mixed fonts).

=== TIÊU CHUẨN THIẾT KẾ ĐỘC ĐÁO & TRÁNH "LAZY DEFAULTS" (BẮT BUỘC TUÂN THỦ) ===
1. TUYỆT ĐỐI KHÔNG dùng các thiết kế lười biếng (Lazy Defaults):
   - Không dùng viền TRANG TRÍ đơn độc (sọc neon dọc mép trái). Viền card container 1px mờ LÀ OK.
   - Không dùng gradient text DÀN TRẢI toàn bộ câu. Được dùng gradient cho từ khóa highlight quan trọng.
   - Không dùng nền #000 thuần túy (dùng #06080F, #090e1a, #0b021c...).
2. ÁP DỤNG THIẾT KẾ CHI TIẾT 3 CẤP ĐỘ DENSITY:
   - Cấp 1 (Background texture): Nền phải có chiều sâu bằng cách vẽ các quả cầu ánh sáng mờ ảo (ambient radial glow), lưới tọa độ mảnh trôi nổi chậm, hoặc chữ chìm siêu lớn làm hình bóng (ghost text) với độ mờ nhẹ (opacity: 0.12 - 0.25).
     * Ví dụ lưới tọa độ chấm bi (.bg-dots-grid) siêu mỏng: \`background-image: radial-gradient(rgba(255, 255, 255, 0.15) 1px, transparent 1px); background-size: 40px 40px;\` hoặc lưới ô vuông: \`background-image: linear-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.08) 1px, transparent 1px); background-size: 80px 80px;\`
     * Vệt sáng ambient glow bằng radial-gradient: \`background: radial-gradient(circle at 50% 50%, rgba(var(--accent-glow), 0.25) 0%, transparent 70%); filter: blur(40px);\`
   - Cấp 2 (Structural borders & Containers): Sử dụng các đường viền dày hẳn từ 2.5px - 4px hoặc các khối bento vững chãi, bo góc mượt mà 32px - 48px. Để tránh lặp viền (repeating nested borders), hãy bọc kính Faux Glassmorphism cho container cha duy nhất (như \`.scene-text-card\`, \`.scene-image-card\` hoặc khung bento Grid ngoài cùng), còn các container con bên trong \`.scene-line-card\` phải trong suốt và không viền (\`border: none; background: transparent; shadow: none; padding: 0;\`).
   - Cấp 3 (High-Contrast Typography): Cỡ chữ cực lớn theo tỷ lệ video: Tiêu đề chính khổng lồ 72px - 110px, nội dung phụ đề rõ ràng 48px - 60px. (TUYỆT ĐỐI KHÔNG DÙNG CỠ CHỮ DƯỚI 40px VÌ RẤT KHÓ ĐỌC TRÊN ĐIỆN THOẠI).
3. BỐ CỤC ĐA DẠNG:
   - Ưu tiên các bố cục lệch trục, bất đối xứng (asymmetric bento grid) hoặc chia vùng (split frame: one side image/stats, other side text card) để tạo cảm giác cực kỳ premium.

=== HIỆU ỨNG VÀ CHUYỂN CẢNH CAO CẤP (CINEMATIC OVERLAYS & TRANSITIONS) ===
1. LỚP PHỦ HẠT NHIỄU PHIM (FILM GRAIN NOISE OVERLAY):
   - Thêm lớp phủ hạt nhiễu (Film Grain) bằng SVG data URI để tạo chiều sâu điện ảnh.
   - HTML (đặt trong #root):
     <div id="grain-overlay" style="position: absolute; inset: 0; pointer-events: none; z-index: 100;"><div class="grain-texture"></div></div>
   - CSS: TĨNH (không animation, không @keyframes):
     #grain-overlay .grain-texture {
       position: absolute; top: -50%; left: -50%; width: 200%; height: 200%;
       background: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
       opacity: 0.12;
     }
2. LỚP PHỦ VIGNETTE CINEMATIC:
   - Tạo hiệu ứng bo góc tối nghệ thuật làm nổi bật trung tâm.
   - HTML: <div id="hf-vignette" style="position: absolute; inset: 0; pointer-events: none; z-index: 90;"></div>
   - CSS:
     #hf-vignette { background: radial-gradient(ellipse at center, transparent var(--vignette-size, 45%), var(--vignette-color, rgba(0, 0, 0, 0.65)) var(--vignette-edge, 100%)); }
3. BÓNG BẨY KIM LOẠI (SHIMMER SWEEP):
   - Tạo vệt sáng quét ngang qua các thẻ card hoặc Badge để thu hút chú ý.
   - CSS:
     .shimmer-sweep-target { position: relative; display: inline-block; overflow: hidden; }
     .shimmer-sweep-target::after {
       content: ''; position: absolute; inset: 0; pointer-events: none;
       background: linear-gradient(120deg, transparent 0%, rgba(255, 255, 255, 0.4) var(--shimmer-pos, -20%), transparent 100%);
       mix-blend-mode: overlay;
     }
   - Dùng GSAP quét từ trái sang phải ở cảnh tương ứng:
     tl.fromTo(".shimmer-sweep-target", {"--shimmer-pos": "-20%"}, {"--shimmer-pos": "120%", duration: 1.2, ease: "power2.inOut"}, startTime);
4. CHUYỂN CẢNH LƯỚI ĐIỂM ẢNH (GRID PIXELATE WIPE TRANSITION):
   - Tạo chuyển cảnh cực ngầu bằng cách phóng to/thu nhỏ lưới ô vuông giữa các phân cảnh.
   - HTML (đặt trong #root): <div id="grid-pixelate-overlay" style="position: absolute; inset: 0; pointer-events: none; z-index: 999; display: grid;"></div>
   - CSS:
     #grid-pixelate-overlay { --grid-color: #06080F; }
     #grid-pixelate-overlay .grid-cell { background: var(--grid-color); transform: scale(0); transform-origin: center center; }

=== HOẠT ẢNH CHỮ CHẠY ĐỘNG CAO CẤP (PREMIUM DYNAMIC CAPTIONS) ===
Hãy thiết kế 1 trong các bộ hoạt ảnh chữ phù hợp với chủ đề của video để tạo cảm giác cực kỳ chuyên nghiệp:
1. GIẢI MÃ MA TRẬN (MATRIX DECODE) - Chủ đề Công nghệ, AI, Bí ẩn:
   - Dùng JS tách từ thành các phần tử chứa ký tự nhiễu (scrambled chars như @, #, $, %, &) và từ thực tế. GSAP set hiển thị lần lượt nhiễu 0.08s -> nhiễu 0.16s -> từ thật.
2. LỖI KÊNH MÀU (GLITCH RGB) - Chủ đề Gaming, Cyberpunk, Trẻ trung:
   - Sử dụng GSAP dịch chuyển ngang x kết hợp textShadow kênh màu đỏ/cyan rồi trả về 0:
     tl.to(wordEl, { x: -8, textShadow: "5px 0 #ff003c, -5px 0 #00e5ff, 0 4px 10px rgba(0,0,0,0.5)", duration: 0.08, ease: "none" }, w.start);
     tl.to(wordEl, { x: 0, textShadow: "0 0px 0px rgba(0,0,0,0)", duration: 0.12, ease: "power3.out" }, w.start + 0.08);
3. ĐẬP MẠNH (KINETIC SLAM) - Chủ đề Hooks, Promo, Năng động:
   - Mỗi từ rơi mạnh từ trên xuống hoặc zoom to đập ra với easing back.out(1.7) kết hợp scale/rotation nhẹ.
4. THAY ĐỔI ĐỘ DÀY (WEIGHT SHIFT) - Chủ đề Slide, Tài chính, Tối giản:
   - Chuyển font-weight từ 300 (light) sang 800 (bold) khi từ được nói tới, và trả về 300 khi qua từ khác.

${ratioLayoutRules}

=== CẢNH BÁO BẮT BUỘC KHÁC VỀ THẺ CHỮ & BỐ CỤC CHUNG ===
1. Bạn TUYỆT ĐỐI KHÔNG ĐƯỢC phép hardcode bất kỳ thẻ HTML nào đại diện cho cảnh (ví dụ: cấm viết trực tiếp các thẻ như <div class="scene" id="scene1">...</div> hay hardcode bất kỳ nội dung chữ nào của kịch bản vào HTML body).
2. Thẻ body của bạn BẮT BUỘC phải bọc toàn bộ nội dung trong một container chính duy nhất có cấu trúc chính xác như sau:
   <div id="root" data-composition-id="main" data-width="{{ WIDTH }}" data-height="{{ HEIGHT }}" data-start="0" data-duration="{{ DURATION }}">
   (Thiếu các thuộc tính data- này, HyperFrames render engine sẽ hoàn toàn bị mù, dẫn đến lỗi timeout "window.__hf not ready" và render thất bại!).
3. Bên trong container #root trên, bạn đặt một container rỗng để chứa các ảnh nền B-roll mờ ảo chuyển động: <div id="bg-container"></div>, rồi đến các phần tử tĩnh như logo, ngày giờ, progress-bar rỗng, và container rỗng để đổ cảnh: <div id="scene-container"></div>.
   - Hãy định nghĩa class '.scene-bg-layer' trong CSS: position: absolute; inset: 0; background-size: cover; background-position: center; filter: blur(60px) brightness(0.35); transform: scale(1.15); opacity: 0; z-index: 1; will-change: opacity; để tạo hiệu ứng nền mờ ảo tuyệt đẹp.
   - Định nghĩa #bg-container: position: absolute; inset: 0; z-index: 1; overflow: hidden;
   - Định nghĩa #scene-container: position: absolute; inset: 0; z-index: 10;
4. Bạn BẮT BUỘC phải viết mã JavaScript ở cuối file sử dụng đúng khung cấu trúc vòng lặp dưới đây để sinh DOM động và dựng timeline GSAP seekable hoàn mỹ.

=== YÊU CẦU THIẾT KẾ ĐẸP MẮT & TƯƠNG PHẢN ĐỘC ĐÁO ===
1. THIẾT KẾ CARD FONT-CONTAINER ĐỘC ĐÁO & GIẢI QUYẾT LẶP VIỀN (FAUX GLASSMORPHISM & ANTI-REPETITIVE BORDERS):
   - Để tránh lỗi lặp viền thô ráp chồng chéo (repeating nested borders), bạn BẮT BUỘC chỉ thiết kế 1 viền và nền mờ Faux Glassmorphism cho container cha duy nhất là '.scene-text-card' (hoặc '.scene-image-card' cho khối ảnh, hoặc khung bento Grid bên ngoài).
   - Lớp container cha '.scene-text-card' phải được thiết kế theo phong cách Kính giả lập siêu sang (Faux Glassmorphism) dùng CSS thuần (TUYỆT ĐỐI CẤM sử dụng backdrop-filter):
     * Nền bán trong suốt mượt mà: 'background: linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%);' hoặc nền tối bán trong suốt 'background: linear-gradient(135deg, rgba(10, 12, 22, 0.85) 0%, rgba(15, 18, 32, 0.75) 100%);'
     * Phản xạ viền mỏng trắng bóng bẩy ở mép trên: 'border: 1px solid rgba(255, 255, 255, 0.15);'
     * Bóng đổ mềm sâu rộng & viền trong phản chiếu: 'box-shadow: 0 12px 40px 0 rgba(0, 0, 0, 0.3), inset 0 1px 1px 0 rgba(255, 255, 255, 0.12);'
     * Bo góc mượt mà: 'border-radius: 40px;' hoặc '48px;'.
     * Đệm trong rộng rãi (rất quan trọng để chữ không sát mép): 'padding: 80px 60px;' hoặc 'clamp(60px, 8vw, 100px);'.
   - Bên trong đó, các thẻ dòng '.scene-line-card' BẮT BUỘC phải trong suốt và không viền ('border: none; background: transparent; box-shadow: none; padding: 0; margin-bottom: 20px;') để tránh lặp viền thô kệch! Từng từ bên trong '.word' sẽ trượt lên từ mặt nạ mask mượt mà.
   - Tuyệt đối CẤM sử dụng màu nền solid chói sáng (như vàng neon hay xanh neon nguyên khối) để làm nền thẻ, vì chữ trắng trên nền sáng sẽ cực kỳ nhạt nhòa, không thể đọc nổi.
   - Các màu Neon rực rỡ (xanh ngọc, cam, vàng, hồng) chỉ dùng để sơn viền card mỏng mảnh, hiệu ứng bóng mờ (box-shadow) và highlight chữ quan trọng.
2. KHẮC PHỤC CHỮ TRÀN, AN TOÀN VIỀN MÀN HÌNH & TIÊU ĐỀ QUÁ DÀI (SCREEN BORDER & TYPOGRAPHY SAFETY):
   - TUYỆT ĐỐI CẤM đặt padding-left/right bằng 0 hoặc margin bằng 0 ở bất cứ cấp container chính nào. Toàn bộ thiết kế (Bento Grid, so sánh, slide text, card chứa) bắt buộc phải nằm cách viền màn hình vật lý tối thiểu 60px ở cả bên trái và bên phải (sử dụng padding: 160px 60px; hoặc 120px 60px;). Điều này cực kỳ quan trọng để ngăn chặn nội dung bị đè lên bởi giao diện ứng dụng (TikTok/Reels/Shorts UI overlays).
   - Khi văn bản kịch bản hoặc tiêu đề Hook quá dài (trên 15 từ hoặc trên 80 ký tự):
     * Bạn phải tự động hạ cỡ chữ xuống mức an toàn bằng responsive typography (sử dụng 'font-size: clamp(38px, 4.5vw, 56px);' thay vì 80px).
     * Bắt buộc khai báo 'overflow: hidden; max-height: 100%;' cho các thẻ card chứa chữ và sử dụng line-height hợp lý 'line-height: 1.35' để ngăn chặn hoàn toàn việc chữ bị đè, tràn ra khỏi thẻ card hoặc lọt ra ngoài viền màn hình.
   - Lớp .scene-text-card (đại diện cho Border bọc ngoài) BẮT BUỘC dùng flex căn trái toàn bộ:
     * Đặt '.scene-text-card' thành 'display: flex; flex-direction: column; justify-content: center; align-items: flex-start; text-align: left;' để chữ dễ đọc và không bao giờ bị tràn dòng (tuyệt đối không dùng text-align: center).
   - Thẻ Subtitle '.scene-text' phải bọc trong các thẻ block có thuộc tính: 'white-space: normal; word-wrap: break-word; overflow-wrap: break-word; word-break: keep-all; text-align: left; display: block; width: 100%; font-size: 52px; font-weight: 600; line-height: 1.4;'
   - Từng từ bọc trong '.word-wrapper' có style 'display: inline-block; vertical-align: bottom; margin-right: 0.25em;' và lớp chữ '.word' bên trong dùng 'display: inline-block;'.
3. LOGO PILL BADGE & PROGRESSBAR NEON: Thiết kế logo pill chữ đậm cách điệu ở góc trên bằng CSS. Thanh tiến trình chạy suốt thời lượng video ở đáy màn hình viền đen dày ruột neon rực rỡ.

=== TRIẾT LÝ TRỰC QUAN HÓA THÔNG TIN (INFORMATION VISUALIZATION PHILOSOPHY) ===
Nhiệm vụ tối thượng của bạn là đảm bảo **nội dung kịch bản phải được cấu trúc và trực quan hóa xuất sắc cho người dùng**. Tuyệt đối KHÔNG hiển thị các phân cảnh dưới dạng những khối văn bản thô ráp dài dòng chạy chữ một cách nhàm chán.
Hãy đọc kỹ ngữ nghĩa kịch bản và tự do sáng tạo để chọn lựa cấu trúc hiển thị trực quan thông minh nhất (Không cần sao chép y hệt, hãy tự do thiết kế định dạng phù hợp nhất):

1. NẾU MANG TÍNH ĐỐI CHIẾU / SO SÁNH (Before vs After, Pros vs Cons, Lỗ vs Lãi, Đúng vs Sai):
   - Thiết kế các cột hoặc thẻ so sánh song song đối trực diện.
   - Thẻ tiêu cực/thất bại: Có viền mờ màu đỏ san hô và icon phủ định nổi bật.
   - Thẻ tích cực/thành công: Có viền neon rực rỡ màu xanh ngọc/xanh lá và icon khẳng định rực rỡ.
   - Dùng GSAP để khi nói đến thẻ nào thì thẻ đó phóng to nhẹ, sáng rực rỡ lên, còn thẻ kia mờ đi để dẫn dắt mắt người xem.

2. NẾU MANG TÍNH DANH SÁCH / BÀI HỌC / THÔNG TIN PHÂN PHỐI (Bento Grid Points):
   - Lập trình cấu trúc Bento Grid dạng lưới các ô thẻ độc lập với kích thước lệch nhau tinh tế (Bento Grid).
   - Mỗi ô thẻ đại diện cho 1 điểm hoặc 1 bài học, có tiêu đề to rõ, icon tương ứng ở góc và đoạn mô tả ngắn gọn.
   - Dùng GSAP để các ô Bento trượt lên (slide up stagger) lần lượt khi giọng đọc giải thích đến từng điểm một, tạo hiệu ứng chuyển động vô cùng chuyên nghiệp.

3. NẾU MANG TÍNH QUY TRÌNH / TỪNG BƯỚC / LỘ TRÌNH (Steps / Process / Steps 1-2-3):
   - Thiết kế các khối bước nối tiếp nhau (ví dụ: Bước 1 -> Bước 2 -> Bước 3) theo chiều ngang (16:9) hoặc xếp dọc (9:16).
   - Dùng GSAP để vẽ một đường nối (hoặc mũi tên chỉ hướng) phát sáng chạy qua các thẻ bước lần lượt khi giọng nói tiến triển qua từng bước.

4. NẾU MANG TÍNH ĐỐC KẾT / BÀI HỌC ĐẮT GIÁ (Takeaway / Key Lesson):
   - Thiết kế một thẻ đúc rút (takeaway box) cực kỳ trang trọng ở đáy hoặc trung tâm màn hình, có bo góc mềm mại, đường viền neon lấp lánh nhẹ và icon đại diện (bóng đèn sáng 💡, chìa khóa 🔑, ngôi sao ⭐).
   - Thẻ này sẽ được GSAP kích hoạt làm sáng bừng rực rỡ ở cảnh cuối cùng của video như một cú kết đầy ấn tượng.

=== QUY TRÌNH THIẾT KẾ ĐO NI ĐÓNG GIÀY THEO CHỦ ĐỀ KỊCH BẢN (THEME DESIGN) ===
Bạn hãy đọc kỹ Tiêu đề video và Nội dung kịch bản để chọn chính xác 1 trong các hướng thiết kế nghệ thuật sau đây:

1. CHỦ ĐỀ TÀI CHÍNH / KINH DOANH / ĐẦU TƯ / LÀM GIÀU (Finance/Business):
   - Nền: Navy tối sâu thẳm sang trọng (#090e1a). Lưới chấm tròn màu xanh ngọc nhạt.
   - Viền Neon: Xanh lục phát lộc (#00ff66) hoặc vàng Gold (#ffd700).
   - Hạt trang trí lơ lửng ở nền: Ký tự $, €, biểu đồ đi lên bay cực chậm và mờ ảo (opacity: 0.15).

2. CHỦ ĐỀ CÔNG NGHỆ / AI / TƯƠNG LAI / GAME (Tech/AI/Future):
   - Nền: Tím thẫm Cyberpunk vũ trụ (#0b021c). Mạng lưới grid điện tử ô vuông mờ ảo phát sáng.
   - Viền Neon: Xanh Cyan Neon cực lạnh (#00f5ff) hoặc hồng Neon rực lửa (#ff007f).
   - Hạt trang trí lơ lửng ở nền: Ký tự {}, <>, số nhị phân 0, 1 bay lơ lửng rất to rõ hơn chút và mờ ảo (opacity: 0.12).

3. CHỦ ĐỀ TRÌNH CHIẾU GIÁO DỤC / SLIDESHOW THÔNG TIN (YourClassVN Slide Presentation Style):
   - Phù hợp: Khi kịch bản mang tính giảng giải kiến thức, so sánh khái niệm, giải thích cấu trúc, hoặc hướng dẫn từng bước 1-2-3.
   - Nền: Màu đen thạch anh tối giản sâu thẳm (#06080F). Ở trung tâm màn hình, thiết kế một quả cầu ánh sáng nền (ambient backlight glow) màu xanh khói hoặc tím mờ ảo cực kỳ sang trọng bằng CSS radial-gradient phát sáng từ giữa tỏa ra. Overlay một lưới tọa độ mỏng mảnh hoặc các đường node mạng (network node connections) mờ ảo trôi nổi chậm ở background.
   - Bảng màu thẻ Slide: Thẻ Bento thiết kế dạng Slide phẳng, tối giản nhưng cực kỳ tinh tế. Khung viền siêu mỏng chỉ 1.5px có ánh hào quang neon nhẹ (glow) tương ứng với màu viền. Nền thẻ sử dụng màu xám tối bán trong suốt cao cấp (rgba(18, 22, 36, 0.8)).
   - Quy tắc tô màu chữ (Semantic Highlight): Chia đoạn văn bản thành các câu ngắn gọn xếp chồng. Các từ quan trọng hoặc kỹ thuật được tự động làm nổi bật trong các thẻ span có class riêng:
     * Xanh Mint (#4AE3B5): Cho ưu điểm, công nghệ vượt trội, số liệu ấn tượng.
     * Đỏ San Hô (#FF6B6B): Cho cảnh báo, hạn chế, nhược điểm hoặc vấn đề cần giải quyết.
     * Vàng Canary (#FFD166): Cho tiêu đề phụ, các từ khóa dẫn dắt hoặc câu hỏi.
     * Chữ thường dùng màu trắng hoặc bạc mờ (#B0B3B8).
   - Hoạt ảnh trình chiếu (Slide Transitions): Các thẻ slide trượt ngang mượt mà từ phải qua trái (x: '100%' về 0%) hoặc trượt dọc từ dưới lên khi chuyển cảnh. Chữ bên trong xuất hiện tuần tự (fade in up) cực kỳ chuyên nghiệp như slide trình chiếu cao cấp của Apple Keynote.

4. CHỦ ĐỀ TÌNH YÊU / TÂM SỰ / CẢM XÚC / CUỘC SỐNG (Love/Emotional/Life):
   - Nền: Màu mận chín sâu lắng hoặc tím thạch anh thẫm (#1c010a).
   - Viền Neon: Hot Pink rực cháy (#ff3366) hoặc đỏ quyến rũ (#ff2a2a).
   - Hạt trang trí lơ lửng ở nền: Hình trái tim đập nhịp nhàng, các hạt lấp lánh (sparkles) trôi nổi lãng mạn.

5. CHỦ ĐỀ KỲ BÍ / LỊCH SỬ / KINH DỊ / KHÁM PHÁ (Mystery/History/Horror):
   - Nền: Đen bụi than tối tăm huyền bí (#050505) kết hợp bụi khói lờ lững mờ ảo.
   - Viền Neon: Đỏ máu thẫm (#b30000) hoặc vàng đồng cổ kính rỉ sét (#c59b27).
   - Hạt trang trí lơ lửng ở nền: Biểu tượng rune cổ xưa, hoặc hạt bụi khói lơ lửng xoay chuyển.

6. CHỦ ĐỀ ĐỜI SỐNG / VLOGS / TIN TỨC / CHỦ ĐỀ KHÁC (Vlogs/News/General):
   - Nền: Tối nguyên bản Neubrutalism (#060709) kèm lưới ô vuông chấm tròn tương phản cao.
   - Viền Neon: Vàng Neon chói lọi (#e2ff3b) hoặc Cam Neon cá tính (#ff6b00).
   - Hạt trang trí lơ lửng ở nền: Ngôi sao 4 cánh Neubrutalism đặc trưng, chấm tròn to nhỏ.

7. CHỦ ĐỀ QUẢNG CÁO SẢN PHẨM / KHUYẾN MÃI / THƯƠNG MẠI ĐIỆN TỬ (Product Promo/E-commerce):
   - Phù hợp: Dùng để giới thiệu sản phẩm, bán hàng, review sản phẩm, ưu đãi giảm giá, hoặc kêu gọi hành động (Call to Action).
   - Nền: Gradient sang trọng, sáng rực rỡ để tôn vinh sản phẩm (ví dụ: Cam Đào sang Hường (#ff7eb3 sang #ff758c) hoặc Trắng Kem ngọc trai (#fdfbfb sang #ebedee)).
   - Bố cục & Typography: Ưu tiên không gian rộng để hiển thị rõ ảnh sản phẩm. Các từ khóa chốt sale (SALE, 50%, GIÁ SỐC, MUA NGAY) phải được làm cực kỳ to, sử dụng font béo (ExtraBold/Black) và bọc trong thẻ Badge nổi bật rực rỡ.
   - Viền Neon: Vàng Gold lấp lánh (#ffd700) hoặc Đỏ Ruby thu hút sự chú ý.
   - Hạt trang trí lơ lửng ở nền: Biểu tượng sale, hộp quà, ngôi sao vàng chớp nháy (sparkles) trôi lững lờ hoặc vụn pháo hoa confetti.
   - Hoạt ảnh: Ảnh sản phẩm nảy lên (Bounce In) cực mạnh hoặc trượt vào dứt khoát kết hợp zoom nhẹ để tạo cảm giác mua sắm hấp dẫn.

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
  // Tách văn bản theo các dòng bằng thẻ <br> hoặc xuống dòng \n
  var lines = text.split(/(?:<br\\s*\\/?>|\\n)/gi);
  return lines.map(function(line) {
    var trimmed = line.trim();
    if (!trimmed) return '';
    var wordsSpans = trimmed.split(' ').map(function(word) {
      if (!word.trim()) return '';
      return '<span class="word-wrapper" style="display:inline-block; overflow:hidden; vertical-align:bottom; margin-right:0.25em;"><span class="word" style="display:inline-block; transform:translateY(105%); opacity:0; will-change:transform, opacity;">' + word + '</span></span>';
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

  // 2. Tạo phần tử DOM động dựa trên cấu trúc Layout độc bản bạn thiết kế
  var sceneEl = document.createElement('div');
  sceneEl.id = sceneId;
  sceneEl.className = 'scene-card';
  sceneEl.style.display = 'none';
  
  var htmlContent = '';
  // Hiển thị hình ảnh ở bất cứ cảnh nào có scene.imageUrl (Bento grid xếp chồng dọc hoặc song song ngang tùy CSS)
  if (scene.imageUrl) {
    htmlContent += '<div class="scene-image-card">';
    htmlContent += '  <img class="scene-image" src="' + scene.imageUrl + '" />';
    htmlContent += '</div>';
    htmlContent += '<div class="scene-text-card">';
    htmlContent += '  <div class="scene-text highlight-text">' + splitTextToLineCards(scene.bodyText || scene.voiceText || '') + '</div>';
    htmlContent += '</div>';
  } else {
    // Không có ảnh thì thẻ chữ căn giữa to bản chiếm trọn không gian
    htmlContent += '<div class="scene-text-card full-size">';
    htmlContent += '  <div class="scene-text centered-text">' + splitTextToLineCards(scene.bodyText || scene.voiceText || '') + '</div>';
    htmlContent += '</div>';
  }
  sceneEl.innerHTML = htmlContent;
  
  document.getElementById('scene-container').appendChild(sceneEl);

  // 3. Tạo sub-timeline riêng cho cảnh này
  var tl = gsap.timeline();
  
  // Thiết lập hiển thị ngay lập tức trước khi chạy animation
  tl.set(sceneEl, { display: 'flex', visibility: 'visible', zIndex: 50 + i }, 0);
  if (bgEl) {
    tl.set(bgEl, { display: 'block', visibility: 'visible', zIndex: i + 1 }, 0);
  }
  
  // A. Entrance Animation cho toàn cảnh: Zoom nhẹ kết hợp Fade-In cực kỳ điện ảnh (Cinematic Crossfade Zoom)
  tl.fromTo(sceneEl, 
    { opacity: 0, scale: 1.03 },
    { opacity: 1, scale: 1, duration: 0.8, ease: "power3.out" }, 
    0
  );

  // B. Entrance cho ảnh nền (Background Crossfade)
  if (bgEl) {
    // SỬ DỤNG DURATION BẰNG CROSSFADE (0.6s) ĐỂ TRÁNH LỖI NHÁY NỀN (Flicker) KHI CHUYỂN CẢNH
    tl.fromTo(bgEl,
      { opacity: 0 },
      { opacity: 1, duration: CROSSFADE, ease: "none" },
      0
    );
  }

  // C. Zoom chậm ảnh B-roll (Ken Burns Effect) kết hợp tăng nhẹ độ sáng
  var imgEl = sceneEl.querySelector('.scene-image');
  if (imgEl) {
    tl.fromTo(imgEl, 
      { scale: 1.0, filter: 'brightness(0.95)' }, 
      { scale: 1.12, filter: 'brightness(1.05)', duration: duration, ease: "none" }, 
      0
    );
  }

  // D. Staggered entrance for B-roll image card
  var imgCard = sceneEl.querySelector('.scene-image-card');
  if (imgCard) {
    tl.fromTo(imgCard, 
      { opacity: 0, y: 35, scale: 0.96 },
      { opacity: 1, y: 0, scale: 1, duration: 0.8, ease: "power3.out" },
      0
    );
  }

  // E. Entrance animation for line cards (staggered)
  var lineCards = sceneEl.querySelectorAll('.scene-line-card');
  if (lineCards.length > 0) {
    tl.fromTo(lineCards, 
      { opacity: 0, y: 30, scale: 0.96 },
      { opacity: 1, y: 0, scale: 1, duration: 0.7, stagger: 0.15, ease: "power3.out" },
      0.1
    );
  }

  // F. Word stagger slide-up with spring bounce inside line cards
  var words = sceneEl.querySelectorAll('.word');
  if (words.length > 0) {
    tl.fromTo(words, 
      { y: '105%', opacity: 0, scale: 0.92 },
      { y: '0%', opacity: 1, scale: 1, duration: 0.45, stagger: 0.025, ease: "back.out(1.4)" },
      0.2
    );
  }

  // G. Tuyệt đối KHÔNG viết exit animation (opacity: 0) cho các cảnh trung gian ở đây.
  // Sự giao thoa (crossfade) sẽ được đảm bảo tự nhiên khi cảnh tiếp theo đè lên cảnh hiện tại.

  // 4. Thêm sub-timeline vào main timeline
  mainTl.add(tl, currentTime);

  // 5. Dọn dẹp ẩn cảnh sau khi hoàn thành để tối ưu hiệu suất render
  if (i < SCENES_DATA.length - 1) {
    mainTl.add(gsap.set(sceneEl, { display: 'none', visibility: 'hidden' }), currentTime + duration);
    if (bgEl) {
      mainTl.add(gsap.set(bgEl, { display: 'none', visibility: 'hidden' }), currentTime + duration);
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
 * Standalone AI Custom Promo HTML Template Generator: uses Gemini Flash to design 
 * a 100% custom commercial/e-commerce visual layout, styling, and bouncy GSAP timeline 
 * specifically optimized for conversion, product ads, and promotional videos.
 */
export async function generateAiPromoHtml(title: string, scenes: any[], customSettings: any, ratio: string = '9:16'): Promise<string> {
  const resolvedAI = getAIClient(genAI);
  if (!resolvedAI) {
    console.warn('[AI Promo HTML] AI not configured. Returning empty string.');
    return '';
  }

  const sampleScene = scenes[0] || { id: 1, type: 'hook', voiceText: 'Nội dung mẫu cảnh quảng bá' };
  
  // Tổng hợp tóm tắt toàn bộ kịch bản để AI phân tích sản phẩm sâu sắc
  const scriptSummary = scenes.map((s, idx) => `Cảnh ${idx + 1}: ${s.voiceText || s.bodyText || ''}`).join('\n');

  // ĐỊNH HƯỚNG BỐ CỤC THEO KHUNG HÌNH (DYNAMIC ASPECT RATIO RESPONSIVE RULES)
  let ratioLayoutRules = "";
  if (ratio === '16:9') {
    ratioLayoutRules = `
=== QUY TẮC BỐ CỤC KHUNG HÌNH NGANG (16:9 LANDSCAPE WIDESCREEN) ===
Bạn đang thiết kế cho màn hình ngang (16:9) chuẩn máy tính/TV/Youtube.
1. CONTAINER GỐC #root: Bắt buộc khai báo: <div id="root" data-composition-id="main" data-width="1920" data-height="1080" data-start="0" data-duration="{{ DURATION }}">
   - #root có CSS: 'background: linear-gradient(135deg, #1f1235 0%, #100b25 100%);' làm nền mặc định, thay đổi bằng GSAP theo từng cảnh.
2. ĐỊNH VỊ PHỦ ĐÈ TUYỆT ĐỐI (.scene-card):
   'position: absolute; inset: 0; width: 100%; height: 100%; display: flex; flex-direction: row; justify-content: center; align-items: center; gap: 50px; box-sizing: border-box; padding: 80px 100px;'
3. CHIA ĐÔI SONG SONG TRÁI-PHẢI PROMO (HORIZONTAL PROMO SPLIT):
   - Nếu cảnh CÓ hình ảnh (scene.imageUrl):
     * Khối ảnh '.scene-image-card' bên TRÁI, 46% width, 90% height. Ảnh có: 'width: 100%; height: 100%; object-fit: cover; border-radius: 30px; border: 3px solid rgba(255,255,255,0.2); box-shadow: 0 20px 40px rgba(0,0,0,0.3); will-change: transform, filter; transform-origin: center;'
     * Khối chữ '.scene-text-card' bên PHẢI, 46% width. CHỮ CỰC TO: font-size tối thiểu 48px, font-weight: 900, color: #ffffff.
   - KHÔNG CÓ hình ảnh: Khối chữ '.scene-text-card.full-size' chiếm 100% width, chữ khổng lồ font-size: 64px+.
`;
  } else if (ratio === '1:1') {
    ratioLayoutRules = `
=== QUY TẮC BỐ CỤC KHUNG HÌNH VUÔNG (1:1 SQUARE INSTAGRAM) ===
Bạn đang thiết kế cho màn hình vuông (1:1).
1. CONTAINER GỐC #root: Bắt buộc khai báo: <div id="root" data-composition-id="main" data-width="1080" data-height="1080" data-start="0" data-duration="{{ DURATION }}">
   - #root có CSS: 'background: linear-gradient(135deg, #1f1235 0%, #100b25 100%);' làm nền mặc định, thay đổi bằng GSAP theo từng cảnh.
2. ĐỊNH VỊ PHỦ ĐÈ TUYỆT ĐỐI (.scene-card):
   'position: absolute; inset: 0; width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: center; gap: 25px; box-sizing: border-box; padding: 80px 60px;'
3. BỐ CỤC XẾP CHỒNG DỌC PROMO (VERTICAL PROMO STACK):
   - CÓ hình ảnh: Ảnh ở trên 45% cao, chữ ở dưới 45% cao. Font-size tối thiểu 36px.
   - KHÔNG CÓ hình ảnh: Chữ chiếm 80% không gian, font-size: 56px+, font-weight: 900, color: #fff.
`;
  } else {
    // 9:16 vertical
    ratioLayoutRules = `
=== QUY TẮC BỐ CỤC KHUNG HÌNH DỌC (9:16 VERTICAL MOBILE TIKTOK/REELS) ===
Bạn đang thiết kế cho màn hình đứng (9:16) chuẩn di động.
1. CONTAINER GỐC #root: Bắt buộc khai báo: <div id="root" data-composition-id="main" data-width="1080" data-height="1920" data-start="0" data-duration="{{ DURATION }}">
   - #root BẮT BUỘC phải có CSS: 'background: linear-gradient(135deg, #15092b 0%, #0a0418 100%);' ban đầu, có thể đổi màu nền hoặc chuyển tiếp màu gradient bằng GSAP.
2. ĐỊNH VỊ PHỦ ĐÈ TUYỆT ĐỐI (.scene-card): Toàn bộ các thẻ cảnh '.scene-card' BẮT BUỘC phải sử dụng:
   'position: absolute; inset: 0; width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: flex-start; align-items: center; gap: 30px; box-sizing: border-box; padding: 130px 60px 240px 60px;'
   => LƯU Ý: Bắt buộc tuân thủ padding an toàn (top 130px, bottom 240px, sides 60px) để không bị chồng lấn bởi nút hay phụ đề hệ thống của TikTok/Reels.
3. BỐ CỤC CANVA PROMO VỚI LƯỚI AN TOÀN (FULL-BLEED VERTICAL STACK):
   - Nếu cảnh CÓ hình ảnh (scene.imageUrl):
     * Khối ảnh '.scene-image-card' chiếm TỐI ĐA 32% chiều cao (height: 32%). (Không được để ảnh quá to lấn chiếm chỗ của chữ). Ảnh '.scene-image' có: 'width: 100%; height: 100%; object-fit: cover; border-radius: 24px; border: 2px solid rgba(255,255,255,0.25); box-shadow: 0 15px 35px rgba(0,0,0,0.35); will-change: transform, filter; transform-origin: center;'.
     * Khối chữ '.scene-text-card' nằm phía dưới ảnh, chiều rộng 100%, ĐƯỢC ƯU TIÊN KHÔNG GIAN BẰNG CÁCH sử dụng 'flex: 1' hoặc 'height: 55%' để tự động chiếm toàn bộ phần không gian rộng lớn còn lại, đảm bảo văn bản dài không bao giờ bị cắt cụt. CHỮ RÕ RÀNG: font-size tối thiểu 46px cho chữ chính, font-weight: 900, color: #ffffff, text-shadow nhẹ.
   - Nếu cảnh KHÔNG CÓ hình ảnh: Khối chữ '.scene-text-card.full-size' chiếm toàn bộ không gian trung tâm (height: 80%). CHỮ KHỔNG LỒ: font-size: clamp(52px, 8vw, 84px), font-weight: 900, color: #ffffff.
`;
  }

  const prompt = `
Bạn là giám đốc nghệ thuật kiêm nhà thiết kế chuyển động và lập trình viên frontend cao cấp (creative director & senior motion designer) chuyên thiết kế các video quảng cáo.

=== CẢNH BÁO CỰC KỲ QUAN TRỌNG VỀ FONT CHỮ TRONG HYPERFRAMES (BẮT BUỘC TUÂN THỦ 100%) ===
1. TUYỆT ĐỐI KHÔNG ĐƯỢC phép sử dụng biến CSS để khai báo font-family. Bạn BẮT BUỘC phải viết trực tiếp tên font chữ dưới dạng chuỗi literal trong thuộc tính CSS (ví dụ: 'font-family: "montserrat", sans-serif;' hoặc 'font-family: "plus jakarta sans", sans-serif;').
2. TUYỆT ĐỐI CẤM các font chữ mặc định, gây nhàm chán sau: 'inter', 'roboto', 'open sans', 'lato', 'poppins', 'outfit', 'nunito', 'playfair display', 'eb garamond', 'syne'.
3. CHỈ ĐƯỢC PHÉP sử dụng các font chất lượng cao hỗ trợ Tiếng Việt cực tốt sau:
   - Sans-serif: 'montserrat', 'plus jakarta sans', 'lexend', 'space grotesk', 'be vietnam pro', 'archivo', 'oswald', 'bebas neue'.
   - Serif: 'lora', 'merriweather', 'fraunces', 'crimson pro', 'dm serif display', 'newsreader'.
   - Monospace: 'jetbrains mono', 'space mono', 'source code pro', 'fira code'.
   Đối với video Promo/Quảng cáo, nên ưu tiên dùng 'montserrat', 'archivo', 'bebas neue' hoặc 'plus jakarta sans' để tạo cảm giác cực kỳ dày dặn, năng động, thời thượng hoặc chuyên nghiệp.
4. BẮT BUỘC HỖ TRỢ TIẾNG VIỆT UNICODE (KHÔNG LỖI DIACRITICS). Nhúng Google Fonts chuẩn Việt Hóa ở head:
   <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&family=Plus+Jakarta+Sans:wght@400;600;700;800&family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,700;0,9..144,900&display=swap" rel="stylesheet">

=== TIÊU CHUẨN THIẾT KẾ ĐỘC ĐÁO & TRÁNH "LAZY DEFAULTS" (BẮT BUỘC TUÂN THỦ) ===
1. TUYỆT ĐỐI KHÔNG dùng các thiết kế lười biếng (Lazy Defaults):
   - Không dùng viền TRANG TRÍ đơn độc (sọc neon dọc mép trái). Viền card container 1px mờ LÀ OK.
   - Không dùng gradient text DÀN TRẢI toàn bộ câu. Được dùng gradient cho từ khóa highlight quan trọng.
   - Không dùng nền #000 thuần túy (dùng #06080F, #090e1a, #0b021c...).
2. ÁP DỤNG THIẾT KẾ CHI TIẾT 3 CẤP ĐỘ DENSITY:
   - Cấp 1 (Background texture): Nền phải có chiều sâu bằng cách vẽ các quả cầu ánh sáng mờ ảo (ambient radial glow), lưới tọa độ mảnh trôi nổi chậm, hoặc chữ chìm siêu lớn làm hình bóng (ghost text) với độ mờ nhẹ (opacity: 0.12 - 0.25).
     * Ví dụ lưới tọa độ chấm bi (.bg-dots-grid) siêu mỏng: 'background-image: radial-gradient(rgba(255, 255, 255, 0.15) 1px, transparent 1px); background-size: 40px 40px;' hoặc lưới ô vuông: 'background-image: linear-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.08) 1px, transparent 1px); background-size: 80px 80px;'
     * Vệt sáng ambient glow bằng radial-gradient: 'background: radial-gradient(circle at 50% 50%, rgba(var(--accent-glow), 0.25) 0%, transparent 70%); filter: blur(40px);'
   - Cấp 2 (Structural borders & Containers): Sử dụng các đường viền dày hẳn từ 2.5px - 4px hoặc các khối bento vững chãi, bo góc mượt mà 32px - 48px. Để tránh lặp viền (repeating nested borders), hãy bọc kính Faux Glassmorphism cho container cha duy nhất (như \`.scene-text-card\`, \`.scene-image-card\` hoặc khung bento Grid ngoài cùng), còn các container con bên trong \`.scene-line-card\` phải trong suốt và không viền (\`border: none; background: transparent; shadow: none; padding: 0;\`).
    - Cấp 3 (High-Contrast Typography): Cỡ chữ cực lớn theo tỷ lệ video: Tiêu đề chính khổng lồ 72px - 120px, nội dung phụ đề rõ ràng 48px - 60px. (TUYỆT ĐỐI KHÔNG DÙNG CỠ CHỮ DƯỚI 40px VÌ KHÔNG THỂ ĐỌC TRÊN ĐIỆN THOẠI).
3. BỐ CỤC ĐA DẠNG:
   - Ưu tiên các bố cục lệch trục, bất đối xứng (asymmetric bento grid) hoặc chia vùng (split frame: one side image/stats, other side text card) để tạo cảm giác cực kỳ premium.

=== HIỆU ỨNG VÀ CHUYỂN CẢNH CAO CẤP (CINEMATIC OVERLAYS & TRANSITIONS) ===
1. LỚP PHỦ HẠT NHIỄU PHIM (FILM GRAIN NOISE OVERLAY):
   - Thêm lớp phủ hạt nhiễu (Film Grain) bằng SVG data URI để tạo chiều sâu điện ảnh.
   - HTML: <div id="grain-overlay" style="position: absolute; inset: 0; pointer-events: none; z-index: 100;"><div class="grain-texture"></div></div>
   - CSS: TĨNH (không animation, không @keyframes):
     #grain-overlay .grain-texture {
       position: absolute; top: -50%; left: -50%; width: 200%; height: 200%;
       background: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
       opacity: 0.12;
     }
2. LỚP PHỦ VIGNETTE CINEMATIC:
   - HTML: <div id="hf-vignette" style="position: absolute; inset: 0; pointer-events: none; z-index: 90;"></div>
   - CSS:
     #hf-vignette { background: radial-gradient(ellipse at center, transparent var(--vignette-size, 45%), var(--vignette-color, rgba(0, 0, 0, 0.65)) var(--vignette-edge, 100%)); }
3. BÓNG BẨY KIM LOẠI (SHIMMER SWEEP):
   - Tạo vệt sáng quét ngang qua các thẻ card, Badge hoặc nút CTA (.cta-button) để thu hút chú ý.
   - CSS:
     .shimmer-sweep-target { position: relative; display: inline-block; overflow: hidden; }
     .shimmer-sweep-target::after {
       content: ''; position: absolute; inset: 0; pointer-events: none;
       background: linear-gradient(120deg, transparent 0%, rgba(255, 255, 255, 0.4) var(--shimmer-pos, -20%), transparent 100%);
       mix-blend-mode: overlay;
     }
   - Dùng GSAP quét từ trái sang phải ở cảnh tương ứng:
     tl.fromTo(".shimmer-sweep-target", {"--shimmer-pos": "-20%"}, {"--shimmer-pos": "120%", duration: 1.2, ease: "power2.inOut"}, startTime);
4. CHUYỂN CẢNH LƯỚI ĐIỂM ẢNH (GRID PIXELATE WIPE TRANSITION):
   - Tạo chuyển cảnh ô vuông giữa các phân cảnh:
     - HTML: <div id="grid-pixelate-overlay" style="position: absolute; inset: 0; pointer-events: none; z-index: 999; display: grid;"></div>
     - CSS:
       #grid-pixelate-overlay { --grid-color: #0c0914; }
       #grid-pixelate-overlay .grid-cell { background: var(--grid-color); transform: scale(0); transform-origin: center center; }

=== HOẠT ẢNH CHỮ CHẠY ĐỘNG CAO CẤP (PREMIUM DYNAMIC CAPTIONS) ===
Hãy thiết kế 1 trong các bộ hoạt ảnh chữ phù hợp với sản phẩm/quảng cáo để tăng hiệu ứng kích thích thị giác:
1. GIẢI MÃ MA TRẬN (MATRIX DECODE) - Chủ đề Sản phẩm AI, Thiết bị thông minh.
2. LỖI KÊNH MÀU (GLITCH RGB) - Chủ đề Thời trang cá tính, Đồ uống thể thao, Đồ công nghệ.
3. ĐẬP MẠNH (KINETIC SLAM) - Đặt biệt khuyên dùng cho các cảnh chốt khuyến mãi, flash sale, deal hời.
4. THAY ĐỔI ĐỘ DÀY (WEIGHT SHIFT) - Phù hợp với thông số kỹ thuật sản phẩm sang trọng.

=== PREMIUM GRADIENT & FAUX GLASSMORPHISM ===
Hãy rũ bỏ hoàn toàn phong cách thiết kế màu đơn sắc thô sơ ("solid color-blocking"). Thay vào đó, áp dụng các tiêu chuẩn thiết kế UI/UX đỉnh cao sau:

1. NỀN GRADIENT SANG TRỌNG & RỰC RỠ:
   - Sử dụng các cặp màu gradient thời thượng, có độ tương phản cao, hòa trộn mượt mà cùng hiệu ứng nguồn sáng mờ ảo (radial overlay glow) ở giữa hoặc góc.
   - Mảng gradient gợi ý để đổi theo từng cảnh:
     * Cảnh 1 (Hook): linear-gradient(135deg, #FF416C 0%, #FF4B2B 100%) - Hồng Đỏ Neon quyến rũ kích thích.
     * Cảnh 2 (Product): linear-gradient(135deg, #1A2980 0%, #26D0CE 100%) - Xanh Dương Neon thời thượng.
     * Cảnh 3 (Feature): linear-gradient(135deg, #f857a6 0%, #ff5858 100%) - Hồng Cam trẻ trung.
     * Cảnh 4 (Detail): linear-gradient(135deg, #11998e 0%, #38ef7d 100%) - Xanh Mint sinh thái tươi mát.
     * Cảnh 5+ hoặc Cảnh cuối (CTA): linear-gradient(135deg, #7F00FF 0%, #E100FF 100%) - Tím Cyberpunk cuốn hút.
   - Có một lớp lưới tọa độ chấm bi cực mảnh (.bg-dots-grid) hoặc vệt sáng ảo diệu lững lờ trôi làm nền sinh động.
   - TUYỆT ĐỐI CẤM dùng nền đen xì nhàm chán hoặc nền màu đơn sắc buồn tẻ.

2. CÁC THẺ CARD MỜ ẢO & GIẢI QUYẾT LẶP VIỀN (FAUX GLASSMORPHIC CARDS & ANTI-REPETITIVE BORDERS):
   - Để hiển thị văn bản cực rõ nét mà vẫn cực kỳ cao cấp, bạn BẮT BUỘC chỉ thiết kế 1 viền và nền mờ Faux Glassmorphism cho container cha duy nhất là '.scene-text-card' (hoặc '.scene-image-card' cho khối ảnh, hoặc khung bento Grid bên ngoài).
   - LƯU Ý CỰC KỲ QUAN TRỌNG: HyperFrames BỊ CẤM DÙNG 'backdrop-filter: blur()' vì sẽ gây lỗi crash render trong Puppeteer.
   - Thay vào đó, lập trình Faux Glassmorphism (Kính giả lập siêu nhẹ) bằng CSS thuần túy trên container cha:
     * Nền bán trong suốt tinh khiết: 'background: linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%);' hoặc nền tối bán trong suốt 'background: linear-gradient(135deg, rgba(15, 9, 30, 0.85) 0%, rgba(25, 15, 50, 0.75) 100%);'
     * Viền mỏng như tơ phát sáng trắng ở mép trên: 'border: 1px solid rgba(255, 255, 255, 0.15);'
     * Bóng đổ mềm sâu rộng & viền trong phản chiếu: 'box-shadow: 0 12px 40px 0 rgba(0, 0, 0, 0.35), inset 0 1px 1px 0 rgba(255, 255, 255, 0.12);'
     * Bo góc sang trọng: 'border-radius: 40px;' hoặc '48px;'.
     * Đệm trong rộng rãi (bắt buộc để chữ không sát viền): 'padding: 80px 60px;' hoặc 'clamp(60px, 8vw, 100px);'.
   - Bên trong đó, từng dòng văn bản '.scene-line-card' BẮT BUỘC phải trong suốt và không viền ('border: none; background: transparent; box-shadow: none; padding: 0; margin-bottom: 20px;') để tránh hoàn toàn việc lặp lại viền thô kệch! Từng từ bên trong '.word' sẽ trượt lên từ mặt nạ mask mượt mà.

3. LƯỚI AN TOÀN VIỀN MÀN HÌNH (STRICT SAFETY GRID):
   - Đảm bảo an toàn 9:16 di động tuyệt đối. Toàn bộ nội dung hiển thị phải nằm gọn trong padding:
     'padding: 130px 60px 240px 60px;' cho màn hình đứng di động.
   - TUYỆT ĐỐI KHÔNG ĐỂ chữ hoặc ảnh lấn ra ngoài hay sát mép viền vật lý.

4. CỠ CHỮ CHUẨN HOÁ & THỐNG NHẤT (CLAMP TYPOGRAPHY):
   - Tự động co giãn cỡ chữ theo khung hình để tránh tràn viền khi tiêu đề dài.
   - Chữ chính/tiêu đề: 'font-size: clamp(56px, 7vw, 84px); font-weight: 900; line-height: 1.25; color: #ffffff;'
   - Chữ nội dung/phụ đề: 'font-size: clamp(42px, 5.5vw, 56px); font-weight: 700; line-height: 1.35; color: rgba(255, 255, 255, 0.9); text-align: left; display: flex; flex-direction: column; justify-content: center;'
   - Các từ khóa bán hàng quan trọng (SALE, 50%, MUA NGAY, GIÁ SỐC, FREE SHIP, QUÀ TẶNG, HOT, GIẢM GIÁ...) được tự động bọc trong thẻ Badge '.sale-badge' dạng viên thuốc nổi bật rực rỡ với màu nền chói (như vàng neon #FFF500, xanh mint #00FFCC) và màu chữ tối tương phản cao để tạo điểm nhấn chốt đơn cực mạnh!

5. SIÊU CẢNH CUỐI - CALL TO ACTION (CTA) HUB CHUYỂN ĐỔI CAO:
   - Cảnh cuối cùng là vũ khí chốt đơn của video! Hãy biến nó thành một **CTA Hub** mô phỏng 3D cực kỳ kích thích mua sắm:
     * Chữ tiêu đề khổng lồ kêu gọi hành động dứt khoát (ví dụ: "🛍️ SĂN DEAL NGAY!", "👉 BẤM ĐĂNG KÝ!").
     * Render một nút bấm giả lập nổi khối 3D (.cta-button) tuyệt đẹp với màu neon chói lọi (ví dụ: nền vàng tươi chữ đen cực đậm: 'background: linear-gradient(to bottom, #FFE500 0%, #FFB800 100%); color: #000; font-weight: 900; padding: 22px 48px; border-radius: 40px; box-shadow: 0 10px 25px rgba(255, 184, 0, 0.4), 0 4px 0 #D49B00; text-transform: uppercase; font-size: 32px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 12px; transform-style: preserve-3d;');
     * Thẻ mã giảm giá / coupon (.cta-coupon-card) mờ ảo tinh xảo kèm viền đứt nét phát sáng (ví dụ: "MÃ: GIAM50" hoặc "FREE SHIP TOÀN QUỐC").
     * Icon ngón tay/mũi tên hướng về nút bấm (.cta-pointer) trỏ nhẹ liên tục.
   - Dùng GSAP để tạo hiệu ứng pulsing co giãn nhịp tim (scale pulse loop) vô chậm/vô tận cho nút CTA này để hút trọn mắt người xem.

=== CẢNH BÁO CỰC KỲ QUAN TRỌNG VỀ FONT CHỮ TRONG HYPERFRAMES ===
1. TUYỆT ĐỐI KHÔNG ĐƯỢC phép sử dụng biến CSS để khai báo font-family. Bạn BẮT BUỘC phải viết trực tiếp tên font chữ dưới dạng chuỗi literal trong thuộc tính CSS (ví dụ: 'font-family: "montserrat", sans-serif;' hoặc 'font-family: "plus jakarta sans", sans-serif;').
2. CHỈ ĐƯỢC PHÉP sử dụng các font chất lượng cao hỗ trợ Tiếng Việt cực tốt sau:
   - Sans-serif: 'montserrat', 'plus jakarta sans', 'lexend', 'space grotesk', 'be vietnam pro', 'archivo', 'oswald', 'bebas neue'.
   - Serif: 'lora', 'merriweather', 'fraunces', 'crimson pro', 'dm serif display', 'newsreader'.
   - Monospace: 'jetbrains mono', 'space mono', 'source code pro', 'fira code'.
   Đối với video Promo/Quảng cáo, nên ưu tiên dùng 'montserrat', 'archivo', 'bebas neue' hoặc 'plus jakarta sans' để tạo cảm giác cực kỳ dày dặn, năng động, thời thượng hoặc chuyên nghiệp.
3. BẮT BUỘC HỖ TRỢ TIẾNG VIỆT UNICODE (KHÔNG LỖI DIACRITICS). Nhúng Google Fonts chuẩn Việt Hóa ở head:
   <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&family=Plus+Jakarta+Sans:wght@400;600;700;800&family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,700;0,9..144,900&display=swap" rel="stylesheet">

=== ĐỊNH NGHĨA CSS HỖ TRỢ CHO LOGO & BACKGROUND (BẮT BUỘC KHAI BÁO TRONG STYLE TAG) ===
- #bg-container: position: absolute; inset: 0; z-index: 1; overflow: hidden;
- .scene-bg-layer: position: absolute; inset: 0; opacity: 0; z-index: 1; will-change: opacity; transition: none;
- .logo-container: position: absolute; top: var(--v-logo-top, 60px); left: var(--v-logo-left, 60px); transform: var(--v-logo-transform, none); z-index: 100; display: flex; align-items: center; gap: 16px; background: rgba(0, 0, 0, 0.25); border: 1px solid rgba(255, 255, 255, 0.15); padding: 12px 32px; border-radius: 100px; box-shadow: 0 8px 32px rgba(0,0,0,0.3);
- .logo-img: height: 1.2em; width: auto; object-fit: contain;
- .logo-text: font-size: calc(var(--cqmin) * var(--v-logo-size, 38) / 720); font-weight: 900; letter-spacing: 0.15em; text-transform: uppercase; white-space: nowrap;

=== CẤU TRÚC HTML BẮT BUỘC KHAI BÁO ===
Thẻ body của bạn BẮT BUỘC phải bọc toàn bộ nội dung trong một container chính duy nhất có cấu trúc chính xác như sau:
<div id="root" data-composition-id="main" data-width="{{ WIDTH }}" data-height="{{ HEIGHT }}" data-start="0" data-duration="{{ DURATION }}">
  <!-- Container chứa các lớp nền chuyển màu mượt mà -->
  <div id="bg-container"></div>

  <!-- Grid nền hạt trang trí hoặc chấm lưới lung linh -->
  <div class="bg-glow-layer"></div>
  <div class="bg-dots-grid"></div>
  
  <!-- Logo nhỏ góc trên trái -->
  <div class="logo-container" style="display: {{ SHOW_LOGO }};">
    <img class="logo-img" src="{{ LOGO_IMAGE }}" style="display: {{ SHOW_LOGO_IMAGE }};" onerror="this.style.display='none'" />
    <span class="logo-text" style="color: {{ LOGO_COLOR }};">{{ LOGO_TEXT }}</span>
  </div>
  <!-- Thanh progress bar neon -->
  <div class="progress-bar-container"><div id="progressBar"></div></div>
  
  <!-- Container chứa các phân cảnh chạy động -->
  <div id="scene-container"></div>
</div>

=== KHUNG LẬP TRÌNH DỰNG DOM & GSAP TIMELINE ĐỘNG (BẮT BUỘC TUÂN THỦ 100%) ===
Bạn phải viết mã JavaScript ở cuối file sử dụng đúng cấu trúc sau (Lưu ý: Bắt buộc viết mã này bên trong khối code javascript):

var SCENES_DATA = JSON.parse('{{ SCENES_JSON }}');
var SCENE_DURATIONS = JSON.parse('{{ SCENE_DURATIONS_JSON }}');
var TOTAL_DURATION = parseFloat("{{ DURATION }}") || 15;

var mainTl = gsap.timeline({ paused: true });
window.__timelines = { "main": mainTl };
window._tl = mainTl;

var currentTime = 0;
var CROSSFADE = 0.6; 

// Hàm quét tự động làm nổi bật các từ khóa chốt sale bằng badge rực rỡ
function highlightSellingKeywords(text) {
  if (!text) return '';
  var keywords = [
    'SALE', '50%', '30%', '70%', 'GIÁ SỐC', 'MUA NGAY', 'CHỐT ĐƠN', 'HOT', 'TRENDING', 
    'KHUYẾN MÃI', 'QUÀ TẶNG', 'ƯU ĐÃI', 'GIÁ RẺ', 'MUA 1 TẶNG 1', 'FREE SHIP', 'FREESHIP',
    'GIẢM GIÁ', 'GIẢM ĐẾN', 'SỐ LƯỢNG CÓ HẠN', 'CLICK NGAY', 'ĐẶT HÀNG', 'ĐỘC QUYỀN'
  ];
  keywords.sort(function(a, b) { return b.length - a.length; });
  var resultText = text;
  keywords.forEach(function(kw) {
    var regex = new RegExp('(' + kw.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\\\$&') + ')', 'gi');
    resultText = resultText.replace(regex, function(match) {
      return '<span class="sale-badge">' + match + '</span>';
    });
  });
  return resultText;
}

function splitTextToLineCards(text, isCta = false) {
  if (!text) return '';
  var highlighted = highlightSellingKeywords(text);
  var lines = highlighted.split(/(?:<br\\s*\\/?>|\\n)/gi);
  return lines.map(function(line) {
    var trimmed = line.trim();
    if (!trimmed) return '';
    
    // Tách từng từ bọc trong word-mask để slide-up mượt
    var wordsSpans = trimmed.split(' ').map(function(word) {
      if (!word.trim()) return '';
      return '<span class="word-mask" style="display:inline-block; overflow:hidden; vertical-align:bottom; margin-right:0.22em;"><span class="word" style="display:inline-block; transform:translateY(110%); opacity:0; will-change: transform, opacity;">' + word + '</span></span>';
    }).join(' ');
    
    return '<div class="scene-line-card">' + wordsSpans + '</div>';
  }).join('');
}

document.getElementById('scene-container').innerHTML = '';
if (document.getElementById('bg-container')) {
  document.getElementById('bg-container').innerHTML = '';
}

// Gradient nền động - thiết kế palette riêng theo chủ đề kịch bản
// Gợi ý: tạo 7+ gradient khác nhau cho từng cảnh, lấy cảm hứng từ chủ đề đã chọn ở trên
var BG_GRADIENTS = [
  'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)'
];
// Mở rộng mảng BG_GRADIENTS với các palette màu độc đáo của riêng bạn

for (var i = 0; i < SCENES_DATA.length; i++) {
  var scene = SCENES_DATA[i];
  var duration = SCENE_DURATIONS[i] || 5;
  var sceneId = 'scene-' + i;
  var isLastScene = (i === SCENES_DATA.length - 1);

  // 1. Tạo lớp ảnh nền mờ ảo / gradient (Background Transition Layer)
  var bgEl = null;
  if (document.getElementById('bg-container')) {
    bgEl = document.createElement('div');
    bgEl.className = 'scene-bg-layer';
    bgEl.id = 'bg-' + i;
    bgEl.style.background = BG_GRADIENTS[i % BG_GRADIENTS.length];
    document.getElementById('bg-container').appendChild(bgEl);
  }

  // 2. Tạo phần tử DOM động cho Cảnh
  var sceneEl = document.createElement('div');
  sceneEl.id = sceneId;
  sceneEl.className = 'scene-card' + (isLastScene ? ' cta-scene' : '');
  sceneEl.style.display = 'none';
  
  var htmlContent = '';
  
  if (isLastScene) {
    // Siêu cảnh cuối CTA Hub chốt đơn cực mạnh
    htmlContent += '<div class="scene-text-card full-size cta-hub">';
    htmlContent += '  <div class="scene-text centered-text">' + splitTextToLineCards(scene.bodyText || scene.voiceText || '', true) + '</div>';
    
    // Nút CTA giả lập nổi 3D kèm mã giảm giá tinh tế
    htmlContent += '  <div class="cta-interactive-wrapper" style="display:flex; flex-direction:column; align-items:center; gap:20px; margin-top:35px; width:100%;">';
    htmlContent += '    <div class="cta-coupon-card">FREE SHIP + GIẢM 50%</div>';
    htmlContent += '    <button class="cta-button">🛒 SĂN DEAL NGAY</button>';
    htmlContent += '  </div>';
    htmlContent += '</div>';
  } else if (scene.imageUrl) {
    // Cảnh thường có ảnh: Ảnh mượt mà bo góc glass ở trên, text ở dưới
    htmlContent += '<div class="scene-image-card">';
    htmlContent += '  <img class="scene-image" src="' + scene.imageUrl + '" />';
    htmlContent += '</div>';
    htmlContent += '<div class="scene-text-card">';
    htmlContent += '  <div class="scene-text highlight-text">' + splitTextToLineCards(scene.bodyText || scene.voiceText || '') + '</div>';
    htmlContent += '</div>';
  } else {
    // Cảnh thường không ảnh: Text bento trôi nổi cực sang trọng
    htmlContent += '<div class="scene-text-card full-size">';
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
  
  // A. Entrance cho lớp nền (Background Crossfade) - Sử dụng đúng CROSSFADE (0.6s) để chuyển cảnh mịn màng, triệt tiêu nháy nền!
  if (bgEl) {
    tl.fromTo(bgEl,
      { opacity: 0 },
      { opacity: 1, duration: CROSSFADE, ease: "none" },
      0
    );
  }
  
  // B. Entrance Animation cực mượt mà với Elastic Ease của GSAP cho sceneEl
  tl.fromTo(sceneEl, 
    { opacity: 0, y: 50, scale: 0.92 },
    { opacity: 1, y: 0, scale: 1, duration: 0.75, ease: "back.out(1.4)" }, 
    0
  );

  // C. Ảnh sản phẩm bay nhẹ từ dưới lên (nếu có)
  var imgCard = sceneEl.querySelector('.scene-image-card');
  if (imgCard) {
    tl.fromTo(imgCard, 
      { opacity: 0, y: 70, scale: 0.88 },
      { opacity: 1, y: 0, scale: 1, duration: 0.8, ease: "back.out(1.3)" },
      0.05
    );
  }

  // D. Zoom nhẹ ảnh sản phẩm kiểu điện ảnh (Ken Burns)
  var imgEl = sceneEl.querySelector('.scene-image');
  if (imgEl) {
    tl.fromTo(imgEl, 
      { scale: 1.0 }, 
      { scale: 1.08, duration: duration, ease: "none" }, 
      0
    );
  }

  // E. Chữ trượt lên nảy nhẹ (Word Mask Slide Up with Spring)
  var words = sceneEl.querySelectorAll('.word');
  if (words.length > 0) {
    tl.fromTo(words, 
      { y: '110%', opacity: 0, scale: 0.92 },
      { y: '0%', opacity: 1, scale: 1, duration: 0.45, stagger: 0.03, ease: "back.out(1.4)" },
      0.2
    );
  }

  // F. Từ khóa bán hàng rực rỡ pop lên ấn tượng
  var saleBadges = sceneEl.querySelectorAll('.sale-badge');
  if (saleBadges.length > 0) {
    tl.fromTo(saleBadges,
      { scale: 0.5, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.55, stagger: 0.08, ease: "back.out(1.6)" },
      0.35
    );
  }

  // G. Xử lý hoạt ảnh looping và entrance đặc trưng cho CTA ở cảnh cuối
  if (isLastScene) {
    var ctaButton = sceneEl.querySelector('.cta-button');
    var ctaCoupon = sceneEl.querySelector('.cta-coupon-card');
    
    if (ctaCoupon) {
      tl.fromTo(ctaCoupon,
        { scale: 0.8, opacity: 0, y: 20 },
        { scale: 1, opacity: 1, y: 0, duration: 0.6, ease: "back.out(1.5)" },
        0.4
      );
    }
    
    if (ctaButton) {
      tl.fromTo(ctaButton,
        { scale: 0.7, opacity: 0, rotationX: -30 },
        { scale: 1, opacity: 1, rotationX: 0, duration: 0.8, ease: "back.out(1.7)" },
        0.5
      );
      
      // Tạo hiệu ứng đập co giãn vô hạn (Infinite Pulsing Pulse Loop) mô phỏng 3D
      tl.add(function() {
        var pulseCycles = Math.max(2, Math.floor((TOTAL_DURATION - currentTime) / 1.5));
        gsap.to(ctaButton, {
          scale: 1.06,
          boxShadow: "0 15px 35px rgba(255, 184, 0, 0.6), 0 4px 0 #D49B00",
          duration: 0.75,
          yoyo: true,
          repeat: pulseCycles,
          ease: "power1.inOut"
        });
      }, 1.2);
    }
  }

  // H. Tuyệt đối KHÔNG viết exit animation (opacity: 0) cho các cảnh trung gian ở đây.
  // Sự giao thoa (crossfade) sẽ được đảm bảo tự nhiên khi cảnh tiếp theo đè lên cảnh hiện tại.

  mainTl.add(tl, currentTime);

  if (i < SCENES_DATA.length - 1) {
    mainTl.add(gsap.set(sceneEl, { display: 'none', visibility: 'hidden' }), currentTime + duration + 0.3);
    if (bgEl) {
      mainTl.add(gsap.set(bgEl, { display: 'none', visibility: 'hidden' }), currentTime + duration + 0.3);
    }
    currentTime += duration - CROSSFADE;
  } else {
    currentTime += duration;
  }
}

if (document.getElementById('progressBar')) {
  mainTl.to("#progressBar", { width: "100%", duration: TOTAL_DURATION, ease: "none" }, 0);
}

mainTl.to("#root", { opacity: 0, duration: 0.5, ease: "power2.inOut" }, TOTAL_DURATION - 0.5);

window.__hf = {
  duration: TOTAL_DURATION,
  seek: function(t) { if (window._tl) window._tl.pause().seek(t); }
};

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
    
    // Catch-all: replace ANY var(--xxx) CSS variable reference in any context with safe fallback
    sanitizedHtml = sanitizedHtml.replace(/var\(--[a-zA-Z0-9_-]+\)/g, "'montserrat'");
    
    // Regex chuẩn hóa font-family với CSS variable
    sanitizedHtml = sanitizedHtml.replace(/font-family\s*:\s*[^;}]*var\([^)]+\)[^;}]*/gi, "font-family: 'montserrat', sans-serif");
    
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
    sanitizedHtml = sanitizeAiHtmlForJsonParse(sanitizedHtml);
    
    return sanitizedHtml;
  } catch (error) {
    console.error('[AI HTML] Error generating custom dynamic Promo HTML template:', error);
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
