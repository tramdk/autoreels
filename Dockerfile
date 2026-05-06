# Sử dụng Node.js bản đầy đủ để có sẵn các thư viện hệ thống
FROM node:20

# Cài đặt FFmpeg và Chromium
RUN apt-get update && apt-get install -y \
    ffmpeg \
    chromium \
    wget \
    fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf \
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
RUN mkdir -p public/bgm app/templates/bold app/templates/cinematic app/templates/classic app/video-template && \
    wget --no-check-certificate -O public/bgm/kich-tinh.mp3 https://raw.githubusercontent.com/tramdk/autoreels/assets/public/bgm/kich-tinh.mp3 && \
    wget --no-check-certificate -O public/bgm/nhe-nhang.mp3 https://raw.githubusercontent.com/tramdk/autoreels/assets/public/bgm/nhe-nhang.mp3 && \
    wget --no-check-certificate -O app/templates/bold/bg.jpg https://raw.githubusercontent.com/tramdk/autoreels/assets/app/templates/bold/bg.jpg && \
    wget --no-check-certificate -O app/templates/cinematic/bg.jpg https://raw.githubusercontent.com/tramdk/autoreels/assets/app/templates/cinematic/bg.jpg && \
    wget --no-check-certificate -O app/templates/classic/bg.jpg https://raw.githubusercontent.com/tramdk/autoreels/assets/app/templates/classic/bg.jpg && \
    wget --no-check-certificate -O app/video-template/bg.jpg https://raw.githubusercontent.com/tramdk/autoreels/assets/app/video-template/bg.jpg

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
