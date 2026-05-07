# Hướng dẫn sử dụng Public API cho AutoReels

Để cho phép các hệ thống khác gọi API của AutoReels để tạo video, bạn cần sử dụng **API Key (API Token)**.

## 1. Thiết lập API Key

Mặc định, hệ thống đã được cấu hình để hỗ trợ API Key. Bạn có thể thiết lập hoặc thay đổi key này trong file `.env` ở thư mục gốc của server:

```env
API_TOKEN=your_secure_api_token_here
```

Nếu không thiết lập trong `.env`, key mặc định sẽ là `autoreels-default-token`.

## 2. Cách xác thực (Authentication)

Khi gọi API từ hệ thống bên ngoài, bạn cần đính kèm API Key vào Header của request theo một trong hai cách sau:

### Cách 1: Sử dụng Header `X-API-Key` (Khuyên dùng)
```http
X-API-Key: your_secure_api_token_here
```

### Cách 2: Sử dụng Header `Authorization`
```http
Authorization: Bearer your_secure_api_token_here
```

---

## 3. Quy trình tạo video qua API

Quy trình chuẩn gồm 2 bước:

### Bước 1: Tạo Script (Kịch bản)
Gửi nội dung kịch bản đến API để lấy `articleId`.

**Endpoint:** `POST /api/articles/manual-script`
**Headers:** `Content-Type: application/json`, `X-API-Key: <TOKEN>`

**Body (JSON):**
```json
{
  "title": "Tiêu đề video của bạn",
  "script": {
    "scenes": [
      {
        "id": 1,
        "type": "hook",
        "voiceText": "Chào mừng bạn đến với video được tạo tự động qua API.",
        "imageKeyword": "future technology",
        "imageUrl": "https://example.com/image.jpg"
      },
      {
        "id": 2,
        "type": "body",
        "voiceText": "Hệ thống này cho phép bạn tạo hàng loạt video một cách dễ dàng.",
        "imageKeyword": "automation concept"
      }
    ]
  }
}
```

**Kết quả:** Bạn sẽ nhận được JSON chứa `id` (ví dụ: `4987f2e1-abc...`).

### Bước 2: Kích hoạt tiến trình render Video
Sử dụng `id` nhận được ở Bước 1.

**Endpoint:** `POST /api/videos/generate`
**Headers:** `Content-Type: application/json`, `X-API-Key: <TOKEN>`

**Body (JSON):**
```json
{
  "articleId": "id-tu-buoc-1",
  "templateId": "modern", 
  "ttsProvider": "edge",
  "ttsVoiceId": "vi-VN-HoaiMyNeural",
  "bgmAssetId": "none",
  "bgmVolume": 0.15
}
```

---

## 4. Các endpoint hữu ích khác

- **Lấy danh sách giọng đọc:** `GET /api/voices`
- **Lấy danh sách nhạc nền:** `GET /api/videos/bgm-presets`
- **Kiểm tra tiến độ:** `GET /api/videos/progress/{videoId}` (Trả về Stream)
- **Lấy danh sách video đã xong:** `GET /api/videos?status=ready`
