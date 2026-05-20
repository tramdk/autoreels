import { genAI, getAIClient } from '../lib/ai';

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
     * Hai khối này nằm cân đối cạnh nhau theo chiều ngang. Ảnh '.scene-image' phải có 'width: 100%; height: 100%; object-fit: cover; border-radius: 16px;'.
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
     * Khối ảnh '.scene-image-card' nằm ở trên, chiếm khoảng 43% chiều cao, chiều rộng 100% full viền bo góc. Ảnh '.scene-image' phải có 'width: 100%; height: 100%; object-fit: cover; border-radius: 16px;'.
     * Khối chữ '.scene-text-card' nằm ở dưới, chiếm khoảng 43% chiều cao, chiều rộng 100%, bên trong hiển thị phụ đề.
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
1. TUYỆT ĐỐI KHÔNG ĐƯỢC phép sử dụng biến CSS để khai báo font-family (ví dụ: CẤM VIẾT 'font-family: var(--font-family)' hay 'font-family: var(...)'). Bạn BẮT BUỘC phải viết trực tiếp tên font chữ dưới dạng chuỗi literal trong thuộc tính CSS (ví dụ: 'font-family: "montserrat", sans-serif;' hoặc 'font-family: "inter", sans-serif;').
2. CHỈ ĐƯỢC PHÉP sử dụng các font nằm trong danh sách được ánh xạ chính thức của HyperFrames dưới đây:
   - 'inter' (chữ thường, sans-serif)
   - 'montserrat' (chữ thường, sans-serif)
   - 'jetbrains mono' (chữ thường, monospace)
   - 'playfair display' (chữ thường, serif)
   - 'outfit' (chữ thường, sans-serif)
   - 'nunito' (chữ thường, sans-serif)
   - 'eb garamond' (chữ thường, serif)
3. Hãy áp dụng font chữ phù hợp chính xác theo phong cách chủ đề dưới đây (nhập Google Fonts ở head tương ứng):
   - Finance/Business & Vlogs/News/General: Sử dụng font 'montserrat' hoặc 'inter'.
   - Tech/AI/Future: Sử dụng font 'jetbrains mono'.
   - YourClassVN Slideshow: Sử dụng font 'montserrat' hoặc 'inter' cực kỳ sạch đẹp, sắc nét.
   - Love/Emotional/Life: Sử dụng font 'outfit' hoặc 'nunito'.
   - Mystery/History/Horror: Sử dụng font 'playfair display' hoặc 'eb garamond'.
4. BẮT BUỘC HỖ TRỢ TIẾNG VIỆT UNICODE (KHÔNG LỖI DIACRITICS):
   - Bạn BẮT BUỘC phải nhập liên kết Google Fonts ở thẻ <head> chứa đúng các bộ font được hỗ trợ tiếng Việt có dấu hoàn hảo.
   - Khi nhúng thẻ <link> Google Fonts, hãy chỉ chọn các phông chữ chuẩn Việt Hóa từ danh sách trên (như 'Montserrat', 'Inter', 'Nunito', 'Outfit', 'JetBrains Mono', 'Playfair Display') và thêm đầy đủ các font-weight để hiển thị dày/mỏng sắc nét không bị vỡ chữ (ví dụ: wght@400;600;700;800;900).
   - Ví dụ nhúng tối ưu:
     <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&family=Inter:wght@400;600;700;900&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
   - Tuyệt đối cấm sử dụng các phông chữ custom lạ không có trên Google Fonts hoặc không hỗ trợ tiếng Việt có dấu (như một số font slab hay display serif thô sơ), tránh việc các ký tự tiếng Việt có dấu (như á, ớ, ợ, đ, ư, ơ...) bị lỗi hiển thị phông chữ hệ thống (tofu/mixed fonts).

${ratioLayoutRules}

=== CẢNH BÁO BẮT BUỘC KHÁC VỀ THẺ CHỮ & BỐ CỤC CHUNG ===
1. Bạn TUYỆT ĐỐI KHÔNG ĐƯỢC phép hardcode bất kỳ thẻ HTML nào đại diện cho cảnh (ví dụ: cấm viết trực tiếp các thẻ như <div class="scene" id="scene1">...</div> hay hardcode bất kỳ nội dung chữ nào của kịch bản vào HTML body).
2. Thẻ body của bạn BẮT BUỘC phải bọc toàn bộ nội dung trong một container chính duy nhất có cấu trúc chính xác như sau:
   <div id="root" data-composition-id="main" data-width="{{ WIDTH }}" data-height="{{ HEIGHT }}" data-start="0" data-duration="{{ DURATION }}">
   (Thiếu các thuộc tính data- này, HyperFrames render engine sẽ hoàn toàn bị mù, dẫn đến lỗi timeout "window.__hf not ready" và render thất bại!).
3. Bên trong container #root trên, bạn chỉ đặt các phần tử tĩnh như logo, ngày giờ, progress-bar rỗng, và một container rỗng duy nhất để đổ cảnh: <div id="scene-container"></div>.
4. Bạn BẮT BUỘC phải viết mã JavaScript ở cuối file sử dụng đúng khung cấu trúc vòng lặp dưới đây để sinh DOM động và dựng timeline GSAP seekable hoàn mỹ.

=== YÊU CẦU THIẾT KẾ ĐẸP MẮT & TƯƠNG PHẢN ĐỘC ĐÁO ===
1. THIẾT KẾ CARD VIỀN CHO MỖI DÒNG/PHÂN CẢNH (AULAQ BENTO CARD STYLE):
   - Đúng theo phong cách Aulaq.ai cao cấp (mỗi lần xuống dòng hay mỗi phân cảnh là một thẻ viền riêng biệt):
   - Mọi dòng văn bản trong phân cảnh (tách bởi thẻ <br> hoặc \n) BẮT BUỘC phải được bọc trong một container dòng riêng biệt gọi là '.scene-line-card'.
   - Lớp '.scene-line-card' BẮT BUỘC phải được bạn khai báo CSS tỉ mỉ với viền và nền như sau:
     * Viền mỏng neon tinh tế phát sáng: 'border: 1.5px solid var(--accent-neon);' (ví dụ: xanh ngọc, cam, hồng tùy theo theme màu của chủ đề).
     * Nền tối bán trong suốt: 'background: rgba(10, 12, 22, 0.75);' để đảm bảo chữ trắng hiển thị siêu tương phản và dễ đọc.
     * Làm mờ hậu cảnh: 'backdrop-filter: blur(12px);'
     * Bo góc mềm mại: 'border-radius: 12px;' hoặc '16px;'.
     * Đệm trong: 'padding: 12px 20px;'.
     * Đổ bóng nhẹ & hào quang neon: 'box-shadow: 0 8px 24px rgba(0,0,0,0.3), 0 0 10px var(--accent-neon-dim, rgba(0,245,255,0.15));'.
     * Định dạng hiển thị: 'display: block; margin: 0 auto 12px auto; width: fit-content; max-width: 90%; text-align: center; box-sizing: border-box; transition: transform 0.3s ease;'.
   - Khi đó, container ngoài '.scene-text-card' đóng vai trò là một container bố cục sạch sẽ, KHÔNG có background/border thô ráp bên ngoài nữa để tránh bị trùng lặp viền (hoặc chỉ có background trong suốt không viền).
   - Tuyệt đối CẤM sử dụng màu nền solid chói sáng (như vàng neon hay xanh neon nguyên khối) để làm nền thẻ, vì chữ trắng trên nền sáng sẽ cực kỳ nhạt nhòa, không thể đọc nổi.
   - Các màu Neon rực rỡ (xanh ngọc, cam, vàng, hồng) chỉ dùng để sơn viền card mỏng mảnh, hiệu ứng bóng mờ (box-shadow) và highlight chữ quan trọng.
2. KHẮC PHỤC CHỮ TRÀN, AN TOÀN VIỀN MÀN HÌNH & TIÊU ĐỀ QUÁ DÀI (SCREEN BORDER & TYPOGRAPHY SAFETY):
   - TUYỆT ĐỐI CẤM đặt padding-left/right bằng 0 hoặc margin bằng 0 ở bất cứ cấp container chính nào. Toàn bộ thiết kế (Bento Grid, so sánh, slide text, card chứa) bắt buộc phải nằm cách viền màn hình vật lý tối thiểu 60px ở cả bên trái và bên phải (sử dụng padding: 160px 60px; hoặc 120px 60px;). Điều này cực kỳ quan trọng để ngăn chặn nội dung bị đè lên bởi giao diện ứng dụng (TikTok/Reels/Shorts UI overlays).
   - Khi văn bản kịch bản hoặc tiêu đề Hook quá dài (trên 15 từ hoặc trên 80 ký tự):
     * Bạn phải tự động hạ cỡ chữ xuống mức an toàn bằng responsive typography (sử dụng 'font-size: clamp(24px, 3.5vw, 42px);' thay vì 60px).
     * Bắt buộc khai báo 'overflow: hidden; max-height: 100%;' cho các thẻ card chứa chữ và sử dụng line-height hợp lý 'line-height: 1.25' để ngăn chặn hoàn toàn việc chữ bị đè, tràn ra khỏi thẻ card hoặc lọt ra ngoài viền màn hình.
   - Thẻ Subtitle '.scene-text' phải bọc trong các thẻ block có thuộc tính: 'white-space: normal; word-wrap: break-word; overflow-wrap: break-word; word-break: keep-all; text-align: center; display: block; width: 100%; font-size: 38px; line-height: 1.35;'
   - Từng từ bọc trong '.word-wrapper' có style 'display: inline-block; vertical-align: middle; margin-right: 0.22em;' và lớp chữ '.word' bên trong dùng 'display: inline-block;'.
3. AUDIO-REACTIVE EQUALIZER: Bên trong mỗi '.scene-text-card', tích hợp một cụm cột sóng equalizer âm thanh 5 thanh đứng '.equalizer-bar' tự động co giãn chiều cao nhịp nhàng bằng keyframes để tăng độ sống động.
4. LOGO PILL BADGE & PROGRESSBAR NEON: Thiết kế logo pill chữ đậm cách điệu ở góc trên bằng CSS. Thanh tiến trình chạy suốt thời lượng video ở đáy màn hình viền đen dày ruột neon rực rỡ.

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
      return '<span class="word-wrapper" style="display:inline-block; overflow:hidden; vertical-align:bottom; margin-right:0.22em;"><span class="word" style="display:inline-block; transform:translateY(105%); opacity:0; will-change:transform, opacity;">' + word + '</span></span>';
    }).join(' ');
    return '<div class="scene-line-card">' + wordsSpans + '</div>';
  }).join('');
}

// Xóa sạch container trước khi nạp
document.getElementById('scene-container').innerHTML = '';

for (var i = 0; i < SCENES_DATA.length; i++) {
  var scene = SCENES_DATA[i];
  var duration = SCENE_DURATIONS[i] || 5;
  var sceneId = 'scene-' + i;

  // 1. Tạo phần tử DOM động dựa trên cấu trúc Layout độc bản bạn thiết kế
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
    htmlContent += '  <div class="equalizer-container">';
    htmlContent += '    <div class="equalizer-bar bar-1"></div>';
    htmlContent += '    <div class="equalizer-bar bar-2"></div>';
    htmlContent += '    <div class="equalizer-bar bar-3"></div>';
    htmlContent += '    <div class="equalizer-bar bar-4"></div>';
    htmlContent += '    <div class="equalizer-bar bar-5"></div>';
    htmlContent += '  </div>';
    htmlContent += '</div>';
  } else {
    // Không có ảnh thì thẻ chữ căn giữa to bản chiếm trọn không gian
    htmlContent += '<div class="scene-text-card full-size">';
    htmlContent += '  <div class="scene-text centered-text">' + splitTextToLineCards(scene.bodyText || scene.voiceText || '') + '</div>';
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
  
  // 3. Entrance Animation: Trượt ngang slide mượt mà từ phải sang trái hoặc từ dưới lên tùy chủ đề
  var rotationAngle = i % 2 === 0 ? 1.5 : -1.5;
  tl.set(sceneEl, { display: 'flex', visibility: 'visible', zIndex: 50 + i }, 0);
  
  // Hiệu ứng di chuyển Keynote Slide mượt mà không đẩy ép nhau nhờ position absolute
  tl.fromTo(sceneEl, 
    { opacity: 0, x: '100%', rotation: rotationAngle },
    { opacity: 1, x: '0%', rotation: 0, duration: 0.8, ease: "power2.out" }, 
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

  // Entrance animation for line cards (staggered)
  var lineCards = sceneEl.querySelectorAll('.scene-line-card');
  if (lineCards.length > 0) {
    tl.fromTo(lineCards, 
      { opacity: 0, y: 25, scale: 0.95 },
      { opacity: 1, y: 0, scale: 1, duration: 0.5, stagger: 0.1, ease: "power2.out" },
      0.1
    );
  }

  // Word stagger slide-up inside line cards
  var words = sceneEl.querySelectorAll('.word');
  if (words.length > 0) {
    tl.to(words, {
      y: '0%',
      opacity: 1,
      duration: 0.5,
      stagger: 0.025,
      ease: "power2.out"
    }, 0.2);
  }

  // 4. Exit Animation: Slide trượt qua bên trái để nhường chỗ cho cảnh sau
  if (i < SCENES_DATA.length - 1) {
    tl.to(sceneEl, { 
      opacity: 0,
      x: '-100%',
      rotation: -rotationAngle,
      duration: CROSSFADE,
      ease: "power2.in"
    }, duration - CROSSFADE);
  }

  // 5. Thêm sub-timeline vào main timeline
  mainTl.add(tl, currentTime);

  // 6. Dọn dẹp ẩn cảnh triệt để bằng cách tắt hoàn toàn display và visibility sau khi kết thúc để tránh che chắn các nút khác
  if (i < SCENES_DATA.length - 1) {
    mainTl.add(gsap.set(sceneEl, { display: 'none', visibility: 'hidden' }), currentTime + duration);
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
    
    // 1. Phục hồi và xử lý chuỗi trực tiếp (Plain String Purge - Tránh lỗi thoát regex)
    sanitizedHtml = sanitizedHtml.split('var(--font-family)').join("'montserrat'");
    sanitizedHtml = sanitizedHtml.split('var(--primary-font)').join("'montserrat'");
    sanitizedHtml = sanitizedHtml.split('var(--body-font)').join("'inter'");
    sanitizedHtml = sanitizedHtml.split('var(--title-font)').join("'montserrat'");
    sanitizedHtml = sanitizedHtml.split('var(--font-family-title)').join("'montserrat'");
    sanitizedHtml = sanitizedHtml.split('var(--font-family-body)').join("'inter'");
    
    // 2. Regex chuẩn hóa với single backslash đúng cú pháp JS Regex literal
    sanitizedHtml = sanitizedHtml.replace(/font-family\s*:\s*var\([^)]+\)/gi, "font-family: 'montserrat', sans-serif");
    sanitizedHtml = sanitizedHtml.replace(/font-family\s*:\s*[^;}]+var\([^)]+\)[^;}]*/gi, "font-family: 'montserrat', sans-serif");
    
    // 3. Chuẩn hóa triệt để bất kỳ phông chữ nào không nằm trong danh sách hỗ trợ của HyperFrames (Anti-Plus-Jakarta-Sans)
    const ALLOWED_FONTS = [
      'inter', 'montserrat', 'jetbrains mono', 'playfair display', 'outfit', 'nunito', 'eb garamond',
      'archivo black', 'arial black', 'arial', 'bebas neue', 'courier new', 'courier', 'din alternate',
      'futura', 'garamond', 'helvetica bold', 'helvetica neue', 'helvetica', 'ibm plex mono', 'lato',
      'league gothic', 'noto sans japanese', 'noto sans jp', 'open sans', 'oswald', 'poppins', 'roboto',
      'segoe ui', 'source code pro', 'space mono', 'plus jakarta sans', 'plus-jakarta-sans'
    ];
    
    sanitizedHtml = sanitizedHtml.replace(/font-family\s*:\s*([^;}]+)/gi, (match, fontVal) => {
      const fontValLower = fontVal.toLowerCase();
      // Kiểm tra xem có chứa bất kỳ phông chữ hợp lệ nào không
      const hasAllowed = ALLOWED_FONTS.some(font => fontValLower.includes(font));
      if (hasAllowed) {
        return match;
      }
      // Nếu chứa phông lạ (như 'plus jakarta sans'), tự động quy về phông an toàn
      return "font-family: 'montserrat', sans-serif";
    });
    
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
   - "Inter" cho tin tức mạnh mẽ, giật gân, kịch tính, công nghệ.
   - "Outfit" hoặc "Plus Jakarta Sans" cho hiện đại, tối giản, sang trọng, khoa học.
   - "Playfair Display" cho chiều sâu nghệ thuật, lịch sử cổ điển.
   - "Montserrat" cho truyền cảm hứng, thể thao, năng động, quảng cáo bán hàng, tin tức nhanh.
   - "Nunito" cho tình yêu, cảm xúc nhẹ nhàng, đời sống thường nhật.
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
- "fontFamily": Tên font chữ được chọn (BẮT BUỘC chỉ được chọn một trong các phông chữ hỗ trợ tiếng Việt có dấu tốt nhất sau: "Inter", "Montserrat", "Outfit", "Nunito", "Playfair Display", "Plus Jakarta Sans", "JetBrains Mono"). Tuyệt đối KHÔNG chọn Anton hay Georgia vì sẽ bị lỗi hiển thị ký tự tiếng Việt có dấu.
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
