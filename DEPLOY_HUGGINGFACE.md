# 🚀 Hướng dẫn Deploy AutoReels lên Hugging Face Spaces

Tài liệu này tổng hợp quy trình deploy và các giải pháp kỹ thuật để chạy hệ thống AutoReels (Render video AI) trên Hugging Face Spaces với **16GB RAM miễn phí**.

---

## 📋 1. Chuẩn bị

1.  **Tài khoản Hugging Face**: Tạo một Space mới, chọn SDK là **Docker** (Blank).
2.  **GitHub Repository**: Code của bạn phải được đẩy lên GitHub.
3.  **HF Access Token**: Tạo Token (quyền Write) tại [HF Settings](https://huggingface.co/settings/tokens).

---

## 🛠 2. Quy trình Deploy

### Bước 1: Thiết lập đồng bộ GitHub -> Hugging Face
Tạo file `.github/workflows/sync_to_hf.yml` (đã có trong code) và thêm Secret `HF_TOKEN` vào GitHub Repository Settings. Mỗi khi bạn `git push` lên GitHub, code sẽ tự động đồng bộ sang Hugging Face.

### Bước 2: Quản lý file nặng (Ảnh/Nhạc) - "Tuyệt chiêu Assets Branch"
Hugging Face cấm đẩy các file binary (JPG, MP3) trực tiếp qua Git.
*   **Giải pháp**: Chúng ta tạo một nhánh riêng tên là `assets` trên GitHub để chứa các file này. Nhánh `main` sẽ không chứa chúng.
*   **Thực thi**: Dockerfile sẽ dùng lệnh `wget` để tải ảnh/nhạc từ nhánh `assets` về lúc build ứng dụng.

### Bước 3: Cấu hình Dockerfile
Sử dụng bản **`node:20` (Full)** để đảm bảo có đầy đủ thư viện cho Chromium (Puppeteer) và FFmpeg. 

### Bước 4: Cấu hình Secrets trên Hugging Face
Vào **Settings > Variables and secrets** của Space và thêm:
*   `DATABASE_URL`: Link Postgres (Neon.tech).
*   `GEMINI_API_KEY`: API Key của Google Gemini.
*   `JWT_SECRET`: Chuỗi bảo mật bất kỳ.
*   `APP_URL`: Link của Space (dạng `https://user-space.hf.space`).

---

## ❌ Các vấn đề đã gặp & Cách giải quyết

| Vấn đề | Nguyên nhân | Giải pháp |
| :--- | :--- | :--- |
| **Out of Memory (OOM)** | Render Free chỉ có 512MB RAM, không đủ chạy trình duyệt ngầm. | Chuyển sang **Hugging Face Spaces (16GB RAM)**. |
| **Binary Push Rejected** | Hugging Face cấm file binary > 10MB hoặc file `.mp3`, `.jpg` trực tiếp. | Đưa binary vào `.gitignore`, đẩy lên nhánh GitHub `assets` riêng, và dùng `wget` tải về trong Dockerfile. |
| **Git History Error** | File nặng (`dev.db`) vẫn nằm trong lịch sử Git dù đã xóa ở commit mới. | Dùng `git filter-branch` để xóa vĩnh viễn file nặng khỏi toàn bộ lịch sử commit. |
| **Wget Exit Code: 5** | Docker `node:slim` thiếu chứng chỉ SSL để tải file từ GitHub. | Nâng cấp lên image `node:20` đầy đủ và thêm `ca-certificates` + `--no-check-certificate`. |
| **Prisma Not Found** | Chạy `prisma generate` khi chưa copy file schema vào Docker. | Điều chỉnh thứ tự lệnh `COPY prisma ./prisma/` lên trước lệnh generate. |
| **Module Not Found** | App không tìm thấy file build trong `dist/`. | Sử dụng `npx tsx server.ts` để chạy trực tiếp (vì 16GB RAM cho phép chạy TS trực tiếp mượt mà). |

---

## 🚀 Cách chạy thủ công (nếu cần)

Nếu bạn muốn "làm sạch" dự án và đẩy lại từ đầu:
```bash
# Xóa file nặng khỏi lịch sử
git filter-branch --force --index-filter "git rm --cached --ignore-unmatch prisma/dev.db" --prune-empty --tag-name-filter cat -- --all

# Đồng bộ lên GitHub
git push origin main --force
```

---

## 🎯 Kết quả
Sau khi hoàn tất, bạn sẽ có một hệ thống sản xuất video AI cực mạnh, không bao giờ lo sập server và hoàn toàn tự động hóa từ khâu lấy tin tức đến lúc ra video thành phẩm.

**Chúc bạn thành công với AutoReels!** 🎬
