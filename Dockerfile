# Sử dụng Node.js bản stable
FROM node:20-slim

# Cài đặt các thư viện hệ thống cần thiết cho FFmpeg và Chromium (Puppeteer)
RUN apt-get update && apt-get install -y \
    ffmpeg \
    chromium \
    wget \
    fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Thiết lập thư mục làm việc
WORKDIR /app

# Copy package files và cài đặt dependencies
COPY package*.json ./
RUN npm install

# Copy toàn bộ mã nguồn
COPY . .

# Tải các file binary từ GitHub vì Hugging Face cấm đẩy trực tiếp
RUN mkdir -p public/bgm app/templates/bold && \
    wget -O public/bgm/kich-tinh.mp3 https://raw.githubusercontent.com/tramdk/autoreels/main/public/bgm/kich-tinh.mp3 && \
    wget -O public/bgm/nhe-nhang.mp3 https://raw.githubusercontent.com/tramdk/autoreels/main/public/bgm/nhe-nhang.mp3 && \
    wget -O app/templates/bold/bg.jpg https://raw.githubusercontent.com/tramdk/autoreels/main/app/templates/bold/bg.jpg

# Build dự án (Vite cho frontend + TSC cho backend)
RUN npm run build

# Hugging Face Spaces chạy với User ID 1000
RUN mkdir -p /app/temp_renders && chmod -R 777 /app/temp_renders
USER 1000

# Biến môi trường mặc định cho cổng của Hugging Face
ENV PORT=7860
ENV NODE_ENV=production

# Chạy server
CMD ["node", "dist/server.js"]
