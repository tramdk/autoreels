# AutoReels — Agent Guide

## Dev commands
| Command | What it does |
|---------|-------------|
| `npm run dev` | Starts dev server (Vite HMR + Express backend + background workers) on port 3003 |
| `npm run lint` | TypeScript type-check only (`tsc --noEmit`) |
| `npm run build` | `vite build && tsc` |
| `npm start` | Production-like start via `npx tsx server.ts` |
| `npx prisma db seed` | Seeds admin user, RSS sources, TTS voices. **Does not auto-run on startup** |

## Architecture
- **Server entry**: `server.ts` — creates Express app, starts 4 background workers: `cleanup`, `recoveryService`, `videoWorker`, `eventBusWorker`
- **DB**: PostgreSQL via Prisma (v6). Provider in `schema.prisma` is `postgresql`, URL from `DATABASE_URL` env var. Schema models: User, Source, Article, VideoTask, Video, Setting, Asset, Voice, Account
- **Renderer**: `server/services/renderer.ts` — builds HyperFrames HTML composition, spawns `hyperframes render` (headless Chromium via Playwright, 30fps, high quality, max 2 workers), then FFmpeg-muxes master audio (TTS + optional BGM via `amix`)
- **TTS**: cascading fallback: ElevenLabs → LucyLab → OhFree → Edge → Gemini. Config per-provider keys in `.env`
- **AI templates**: `aiTemplateService.ts` uses Gemini to generate per-task HTML/GSAP animation. Has font sanitizer with ALLOWED_FONTS whitelist (~35 entries)
- **Event bus**: Redis Streams (Upstash). Listens on `reels_stream` for `REEL_REQUESTED` events
- **Frontend**: React 19 + Vite 6 + Tailwind v4, served by Vite in dev, from `dist/` in production

## Settings / font pipeline
- Font-family is stored in DB via `POST /api/settings` key `video_template_fontFamily`
- `renderer.ts` reads it into `tpl.fontFamily`, maps to `{{ FONT_FAMILY }}` replacement
- Default: `'Be Vietnam Pro'`
- All templates must have `font-family: {{ FONT_FAMILY }}, 'Inter', sans-serif;` — never bare `{{ FONT_FAMILY }};`
- Each template's `<head>` needs a dynamic Google Fonts loader script (strip quotes, build URL with `&display=swap`). Hardcoded `<link>` is optional fast-path for common fonts
- `renderer.ts` also has a dynamic font downloader for 6 "premium" fonts (Be Vietnam Pro, Plus Jakarta Sans, Lexend, Lora, Fraunces, Space Grotesk) — downloads TTF to `os.tmpdir()/fonts/` when rendering

## Template quirks
- Templates live in `app/templates/{name}/index.html`. 9 templates: bold, cinematic, classic, cyberpunk, glassmorphism, minimal, modern, y2k, and `app/video-template/index.html` (Lumina)
- Each template receives `{{ FONT_FAMILY }}`, `{{ HOOK_COLOR }}`, `{{ SCENES_JSON }}`, etc. from `renderer.ts`
- Background flicker fix: use `{ visibility:'hidden', zIndex:-1 }` with `+0.3s` buffer in GSAP cleanup. Never `display: none` for per-scene backgrounds
- `renderer.ts` `FONT_FAMILY` mapping must return quoted names for multi-word fonts (e.g. `"'Be Vietnam Pro'"`)

## Important gotchas
- No test framework is configured — there are no tests
- `.env` is gitignored. Copy `.env.example` to `.env` and fill in secrets
- `npx prisma migrate dev` requires a running PostgreSQL. `npx prisma db push --accept-data-loss` is used in Dockerfile instead
- Database changes: edit `schema.prisma`, run `npx prisma generate`, then `npx prisma db push` (dev) or `migrate dev` (staged)
- `render_cache/`, `temp_renders/`, binary assets (`*.jpg`, `*.png`, `*.mp3`) are gitignored — downloaded via wget during Docker build from an assets branch
- HyperFrames binary is at `node_modules/.bin/hyperframes` (`.cmd` suffix on Windows)
- FFmpeg uses `ffmpeg-static` and `ffprobe-static` — no system FFmpeg needed
- Vite HMR is disabled when `DISABLE_HMR=true` (AI Studio default). File watcher ignores `render_cache/`, `temp_renders/`, `dev.db*`
- The `@/*` path alias maps to project root. Import example: `import { x } from '@/server/config'`
- Only `GEMINI_API_KEY` is exposed via Vite `define` as `process.env.GEMINI_API_KEY`; all other env vars are server-only

## Docker / Deployment
- Dockerfile installs fonts (Inter, Playfair Display) via `wget` and `fc-cache`
- Hugging Face deployment uses an "assets branch" technique — see `DEPLOY_HUGGINGFACE.md`
- GitHub Actions: `.github/workflows/sync_to_hf.yml` syncs to Hugging Face Spaces
