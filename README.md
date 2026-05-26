---
title: AutoReels
emoji: 🎥
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
---

<div align="center">

# 🎬 AutoReels

**Distributed AI-Powered Automated Short-Form Video Studio**

_Scrape the news → Generate scripts → Synthesize voice (Multi-engine fallback) → AI-designed bespoke layouts → Headless browser rendering → FFMPEG Muxing → TikTok Publishing._

[![Node.js](https://img.shields.io/badge/Node.js-22+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://neon.tech)
[![Redis](https://img.shields.io/badge/Redis-Upstash-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://upstash.com)

</div>

---

## ✨ What is AutoReels?

AutoReels is an enterprise-grade, fully automated **AI media production pipeline**. It monitors content feeds, leverages Gemini LLMs to write high-converting portrait short-form scripts, generates professional audio using a cascading multi-provider TTS pipeline, dynamically designs custom HTML layouts via generative AI, and renders full 1080×1920 portrait videos.

It includes a robust **Event Bus Worker** powered by **Upstash Redis Streams** for distributed task management, enabling seamless integration with external managers, and supports automated publishing to social media channels like **TikTok**.

---

## 🗺️ Architecture Overview

```
                        ┌─────────────────────────────────────────────────────────────┐
                        │                   External Fanpage Manager                 │
                        └──────────────────────────────┬──────────────────────────────┘
                                                       │  REEL_REQUESTED (Redis Stream)
                                                       ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                  AutoReels Service                                  │
│                                                                                     │
│  1. Event Bus Worker (Redis Stream Consumer) ──► Creates local VideoTask in Postgres│
│                                                                                     │
│  2. Video Task Worker (Local queue) ──► Triggers Pipeline                           │
│        │                                                                            │
│        ├──► Script Cleaner: strips brackets, parses scenes                          │
│        ├──► AI Layout Generator (Gemini): designs custom HTML/CSS (Bento style)     │
│        ├──► TTS Generator: ElevenLabs ──► LucyLab ──► OhFree ──► Edge ──► Gemini    │
│        └──► HyperFrames Renderer: spawns headless browser to capture GSAP frames     │
│                                                                                     │
│  3. Media Processing (FFmpeg Muxer): mixes Master Audio + BGM + Video frames        │
│                                                                                     │
│  4. Storage & Notifications ──► Cloudinary CDN + TikTok API / REEL_COMPLETED Event   │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Key Features

*   **📡 Multi-Source Scraping**: Monitor RSS feeds and webpage content to extract stories automatically.
*   **🤖 AI Scriptwriting**: Gemini LLM drafts high-impact hooks, bodies, and call-to-actions.
*   **🎨 Bespoke AI-Designed Templates**: Instead of static preset layouts, a generative HTML engine (Gemini 2.0 Flash) designs unique CSS styles, custom Bento grids, and fluid GSAP timelines tailored to the specific tone of each script.
*   **🎙️ Resilient Cascading TTS**: Cascades through multiple TTS engines to guarantee maximum uptime:
    *   **ElevenLabs API** (Premium human-like voices)
    *   **LucyLab / ViVibe API**
    *   **OhFree TTS** (Autonomous segment-chunking and anti-bot TLS fingerprinting)
    *   **Microsoft Edge TTS** (`msedge-tts` fallback)
    *   **Gemini TTS** (`gemini-2.5-flash-preview-tts` final fallback)
*   **⚡ Distributed Queue (Event Bus)**: Driven by Upstash Redis Streams for handling video generation workloads asynchronously with automatic failure recovery and progress reporting.
*   **📱 Automatic Social Publishing**: Integrated with the **TikTok Creator API** for direct publishing.
*   **🎞️ Portable FFmpeg Pipeline**: Employs self-contained `ffmpeg-static` and `ffprobe-static` binaries (no system installations required).
*   **☁️ Cloud CDN Persistence**: Encodes and uploads final outputs directly to Cloudinary.
*   **🔐 Secure Admin UI**: Interactive dashboard built with React 19 to customize settings, check queue logs, review scraped items, and manage platform assets.
*   **🔌 Public API Gateway**: Authorized via `X-API-Key` or Bearer tokens. Supports remote programmatic video orchestration (described in [API_GUIDE.md](file:///c:/Users/T/.gemini/antigravity/scratch/autoreels/API_GUIDE.md)).

---

## 🧰 Tech Stack

### Backend
*   **Runtime**: Node.js 22 + TypeScript 5.8 (ESM)
*   **Framework**: Express.js
*   **Database ORM**: Prisma 6 + PostgreSQL (Neon Serverless Postgres)
*   **Task Broker**: Upstash Redis (Redis Streams for queue and coordination)
*   **Rendering engine**: HyperFrames (headless Chromium/Puppeteer) + GSAP 3
*   **FFmpeg Wrapper**: Fluent-FFmpeg (statically bound)
*   **Cloud Storage**: Cloudinary
*   **AI Integration**: Google Gemini (`@google/generative-ai`)

### Frontend
*   **Framework**: React 19 + Vite 6
*   **Styling**: Tailwind CSS v4
*   **Animation**: Motion (Framer Motion)
*   **State / Routing**: React Router v7

---

## 📋 Prerequisites

*   **Node.js 22** or higher
*   **npm** (or **pnpm** / **yarn**)
*   An active **PostgreSQL** Database (e.g. Neon.tech)
*   An active **Redis** Instance (e.g. Upstash Redis)

---

## ⚡ Quick Start

### 1. Clone & Install
```bash
git clone https://github.com/your-username/autoreels.git
cd autoreels
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env` and fill out the details:
```bash
cp .env.example .env
```
Refer to the [Environment Variables](#-environment-variables) section below for required credentials.

### 3. Database Migration
Apply Prisma schema migrations to your PostgreSQL instance:
```bash
npx prisma migrate dev
```

### 4. Run Locally
```bash
# Starts development server (hot-reloads both backend TS and frontend React)
npm run dev
```
Navigate to `http://localhost:3003`. Default login: `admin` / `admin123` (requires password change on first login).

---

## 🔑 Environment Variables

Make sure the following variables are defined in your `.env` file:

```env
# ─── DATABASE & PORT ─────────────────────────────────────────
PORT=3003
DATABASE_URL="postgresql://user:pass@host/dbname?sslmode=require"

# ─── REDIS / EVENT BUS ───────────────────────────────────────
REDIS_URL="rediss://default:token@worthy-chigger.upstash.io:6379"
EVENT_BUS_URL="https://tramdk-event-bus-svc.hf.space"

# ─── AUTHENTICATION & SECURITY ───────────────────────────────
JWT_SECRET="your-super-secret-key"
API_TOKEN="your-secure-public-api-token"

# ─── AI PROVIDER ─────────────────────────────────────────────
GEMINI_API_KEY="AIzaSy..."

# ─── TEXT-TO-SPEECH PROVIDERS ────────────────────────────────
ELEVENLABS_API_KEY="your-elevenlabs-key"
ELEVENLABS_VOICE_ID="f966mdF5njWREvreUG07"

LUCYLAB_API_KEY="your-lucylab-key"
LUCYLAB_VOICE_ID="mhsL3CPLxmLYdSTKp3GANj"

OHFREE_VOICE_ID="524"

# ─── MEDIA PERSISTENCE (CLOUDINARY) ──────────────────────────
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"

# ─── SOCIAL PUBLISHING (TIKTOK) ──────────────────────────────
TIKTOK_CLIENT_KEY="your-tiktok-key"
TIKTOK_CLIENT_SECRET="your-tiktok-secret"
```

---

## 🗂️ Project Structure

```
autoreels/
├── app/
│   └── video-template/         # Legacy static HyperFrames templates
├── server/
│   ├── config/                 # Environment validation and settings
│   ├── controllers/            # Request handlers (bulk rendering, video tracking)
│   ├── lib/                    # Initialization (Gemini client, Prisma client)
│   ├── middleware/             # Route-level authentication and error handling
│   ├── routes/                 # Express API endpoints
│   └── services/               # Core Orchestrators
│       ├── EventBusClient.ts   # Outbound webhook dispatcher
│       ├── eventBusWorker.ts   # Redis stream event reader
│       ├── videoWorker.ts      # Persistent task worker loop
│       ├── aiTemplateService.ts# Custom HTML & style designer using Gemini Flash
│       ├── renderer.ts         # HyperFrames driver + FFmpeg layout compositor
│       ├── tts.ts              # Resilient TTS fallback router
│       ├── storage.ts          # Cloudinary wrapper
│       └── tiktok.ts           # TikTok OAuth & Publisher
├── src/                         # React features (Vite bundle)
│   ├── features/                # Dashboard, Queue status, articles, settings
│   └── contexts/                # Authentication, theme state
├── prisma/
│   └── schema.prisma            # Postgres database structure
├── DEPLOY_HUGGINGFACE.md        # HF Docker Spaces build cheatsheet
└── API_GUIDE.md                 # Public JSON API specs
```

---

## 📊 Database Schema Summary

Key Prisma models utilized in the workflow:

*   **User**: Handles dashboard access, roles (`admin`, `user`), and password updates.
*   **VideoTask**: The stateful task manager representing queue items. Tracks compilation lifecycle: `pending` ──► `processing` ──► `completed` / `error`.
*   **Article**: Represents feed items matched with script JSON payloads.
*   **Video**: Holds reference links to final MP4s hosted on Cloudinary, publish tracking IDs, and target platforms.
*   **Voice**: Managed records of active TTS options.
*   **Account**: TikTok OAuth credentials and refresh timestamps.

---

## 🚢 Production Deployment

### Docker (Recommended)
AutoReels runs as a single self-contained Docker node. Headless Chromium is automatically driven by Puppeteer inside the container:

```dockerfile
FROM node:22-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN npx prisma generate
RUN npm run build
EXPOSE 3003
CMD ["npm", "start"]
```

### Hugging Face Spaces Deployment
Because Hugging Face prohibits uploading binary files (images, audio assets) directly via Git (and rejects push sizes >10MB), refer to [DEPLOY_HUGGINGFACE.md](file:///c:/Users/T/.gemini/antigravity/scratch/autoreels/DEPLOY_HUGGINGFACE.md) for the "Assets Branch" technique. It explains how to store your static media in a separate branch on GitHub and pull them dynamically via `wget` inside the container build phase.

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for details.

---

<div align="center">

Built with ❤️ by the AutoReels team · Powered by Gemini, HyperFrames & GSAP

</div>
