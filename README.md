<div align="center">

# 🎬 AutoReels

**AI-Powered Automated Short-Form Video Studio**

_Scrape the news → Generate scripts → Synthesize voice → Render stunning videos — fully automated, end to end._

[![Node.js](https://img.shields.io/badge/Node.js-22+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)

</div>

---

## ✨ What is AutoReels?

AutoReels is a fully automated **AI media production pipeline**. It monitors news sources, uses large language models to write compelling short-form scripts, synthesizes professional voice-overs, and renders polished 1080×1920 portrait videos — all without human intervention.

Think of it as your **AI video production team** that runs 24/7.

---

## 🗺️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                       AutoReels Studio                      │
│                                                             │
│  📡 Sources (RSS/Web)                                       │
│        │                                                    │
│        ▼                                                    │
│  🤖 AI Script Generator (Gemini)                            │
│        │  hook → body → call-to-action                      │
│        ▼                                                    │
│  🎙️  TTS Engine (ElevenLabs / Edge / Gemini)               │
│        │  Cascading fallback system                         │
│        ▼                                                    │
│  🎨 Video Renderer (HyperFrames + GSAP)                     │
│        │  1080×1920 @ 30fps, animated overlays              │
│        ▼                                                    │
│  🎞️  FFMPEG Muxer (ffmpeg-static, zero dependencies)       │
│        │  audio + video → final .mp4                        │
│        ▼                                                    │
│  ☁️  Cloudinary CDN + Platform Publishing                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Features

| Feature | Description |
|---|---|
| **📡 Multi-Source Scraping** | Aggregate content from RSS feeds and web pages automatically |
| **🤖 AI Scriptwriting** | Gemini LLM generates hook, body, and call-to-action for each article |
| **🎙️ Cascading TTS** | ElevenLabs → Microsoft Edge → Gemini fallback chain for maximum uptime |
| **🎨 Animated Video Rendering** | GSAP-powered animations via HyperFrames headless browser renderer |
| **🎞️ Self-Contained FFMPEG** | Bundled `ffmpeg-static` binary — no system installation needed |
| **☁️ Cloudinary CDN** | Automatic image optimization and hosting for background assets |
| **📊 Studio Dashboard** | Full-featured React UI to manage sources, articles, videos, and settings |
| **🔐 JWT Authentication** | Secure session management with forced password change on first login |
| **⚙️ Visual Template Designer** | Customize fonts, colors, animations, and layout without touching code |

---

## 🧰 Tech Stack

### Backend
- **Runtime**: Node.js 22 + TypeScript 5.8 (ESM)
- **Framework**: Express.js
- **ORM**: Prisma 6 + SQLite
- **Video Rendering**: HyperFrames (headless Chromium) + GSAP 3
- **Video Encoding**: FFmpeg (bundled via `ffmpeg-static`)
- **Media Storage**: Cloudinary
- **AI**: Google Gemini (`@google/generative-ai`)
- **TTS**: ElevenLabs API, Microsoft Edge TTS (`msedge-tts`), Gemini TTS

### Frontend
- **Framework**: React 19 + Vite 6
- **Styling**: Tailwind CSS v4
- **Animation**: Motion (Framer Motion successor)
- **Icons**: Lucide React

---

## 📋 Prerequisites

- **Node.js** 18+
- **npm** or **pnpm**
- API keys (see [Environment Variables](#-environment-variables))

> **No FFmpeg installation required.** AutoReels bundles its own FFmpeg binary via `ffmpeg-static`.

---

## ⚡ Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/your-username/autoreels.git
cd autoreels

# 2. Install dependencies
npm install

# 3. Copy and configure environment variables
cp .env.example .env
# → Edit .env with your API keys

# 4. Set up the database
npx prisma migrate dev

# 5. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

> **Default credentials**: `admin` / `admin123` (you will be prompted to change on first login)

---

## 🔑 Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```env
# ─── Database ────────────────────────────────────────────────
DATABASE_URL="file:./dev.db"

# ─── Authentication ──────────────────────────────────────────
JWT_SECRET="your-super-secret-key-change-this"

# ─── AI Provider ─────────────────────────────────────────────
GEMINI_API_KEY="your-google-gemini-api-key"

# ─── Text-to-Speech ──────────────────────────────────────────
ELEVENLABS_API_KEY="your-elevenlabs-api-key"       # Optional — falls back to Edge TTS
ELEVENLABS_VOICE_ID="your-elevenlabs-voice-id"    # Optional

# ─── Media Storage ───────────────────────────────────────────
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-cloudinary-api-key"
CLOUDINARY_API_SECRET="your-cloudinary-api-secret"
```

> **TTS Fallback Chain**: ElevenLabs → Microsoft Edge → Gemini TTS. If ElevenLabs is not configured, the system automatically uses the next available provider.

---

## 🗂️ Project Structure

```
autoreels/
├── app/
│   └── video-template/         # HyperFrames HTML animation template
│       ├── index.html           # GSAP-animated video composition
│       └── hyperframes.json     # HyperFrames project config
├── server/
│   ├── routes/                  # Express API routes
│   │   ├── articles.ts
│   │   ├── sources.ts
│   │   └── videos.ts
│   ├── services/
│   │   ├── renderer.ts          # HyperFrames + FFmpeg pipeline
│   │   └── tts.ts               # Cascading TTS service
│   └── lib/
│       ├── ai.ts                # Gemini client
│       └── prisma.ts            # Prisma client
├── src/                         # React frontend (Vite)
│   ├── features/
│   │   ├── dashboard/
│   │   ├── articles/
│   │   ├── videos/
│   │   └── settings/
│   └── contexts/
├── prisma/
│   └── schema.prisma            # Database schema
├── design-system/               # Component & style guidelines
├── server.ts                    # Application entry point
└── vite.config.ts
```

---

## 🎬 Video Rendering Pipeline

The rendering pipeline is fully self-contained and requires no external tools:

```
1. AI generates script (hook + body + CTA)
   ↓
2. TTS converts script to audio (WAV/MP3)
   ↓
3. HTML template is generated with dynamic content injected
   ↓
4. HyperFrames renders the HTML at 30fps (headless Chromium)
   ↓
5. FFmpeg muxes audio + video → final MP4
   ↓
6. Video uploaded to Cloudinary CDN
```

### Template Customization

The video template supports full customization via the Studio UI:

| Parameter | Description |
|---|---|
| Logo text / color / size | Brand watermark styling |
| Hook text animation | `fade`, `slide-up`, `slide-down`, `zoom-in`, `rotate-in` |
| Body text animation | Same animation options |
| Background image | Upload custom backgrounds |
| Color palette | Per-element color customization |
| Layout positions | Pixel-precise element positioning |

---

## 📡 API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/login` | Login and receive JWT token |
| `GET` | `/api/sources` | List all content sources |
| `POST` | `/api/sources` | Add a new RSS/web source |
| `POST` | `/api/sources/:id/scrape` | Manually trigger a scrape |
| `GET` | `/api/articles` | List articles with pagination |
| `POST` | `/api/articles/:id/summarize` | Generate AI script for article |
| `POST` | `/api/videos/generate` | Start video generation pipeline |
| `GET` | `/api/videos` | List all generated videos |
| `GET` | `/api/settings` | Get current template settings |
| `PUT` | `/api/settings` | Update template settings |

---

## 🔧 Available Scripts

```bash
npm run dev      # Start development server (TSX hot reload)
npm run build    # Build frontend for production (Vite)
npm run start    # Run production server (Node.js)
npm run lint     # TypeScript type checking
npm run clean    # Remove dist/ folder
```

---

## 🗃️ Data Models

```
User          → Authentication and session management
Source        → RSS feeds or web pages to monitor
Article       → Scraped content with AI-generated scripts
Video         → Rendered videos with publishing metadata
Setting       → Key-value store for template configuration
```

---

## 🚢 Production Deployment

### Environment
AutoReels is designed to run in any Node.js environment — bare metal, VPS, Docker, or PaaS:

```bash
# Build the frontend
npm run build

# Run the production server
npm start
```

### Docker (Recommended)
```dockerfile
FROM node:22-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN npx prisma generate
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

> **No `apt-get install ffmpeg` needed** — the `ffmpeg-static` package bundles the correct FFmpeg binary for your target platform automatically.

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

Built with ❤️ by the AutoReels team · Powered by Gemini, HyperFrames & GSAP

</div>
