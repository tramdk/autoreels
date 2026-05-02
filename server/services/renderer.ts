import { spawn, execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import prisma from '../lib/prisma';

interface RenderOptions {
  videoId: string;
  hook: string;
  body: string;
  cta: string;
  audioBuffer: Buffer;
  audioExt: string;
  audioDuration: number;
  outputPath: string;
  onProgress?: (percent: number) => void;
}

const DEFAULTS = {
  logoText: 'AUTOREELS', logoColor: '#00f2ff', logoTop: 100, logoLeft: 0, logoAnim: 'slide-down', logoSize: 60,
  hookColor: '#ffffff', hookAnim: 'rotate-in', hookSize: 120,
  bodyColor: 'rgba(255, 255, 255, 0.9)', bodyAnim: 'slide-up', bodySize: 48,
  dividerColor: '#00f2ff', dividerWidth: 200,
  mainTop: 600, mainLeft: 80, contentGap: 40,
  tagText: 'HOT NEWS', tagBg: '#fff000', tagColor: '#000000', tagTop: 1600, tagLeft: 80, tagAnim: 'slide-right', tagSize: 32,
  backgroundBrightness: 0.4, backgroundImage: ''
};

function escapeHtml(unsafe: string) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function findFfmpegPath(): string {
  // Try common locations in node_modules
  const searchPaths = [
    path.join(process.cwd(), 'node_modules', 'ffmpeg-static', 'ffmpeg'),
    path.join(process.cwd(), 'node_modules', 'ffmpeg-static', 'ffmpeg.exe'),
    path.join(process.cwd(), 'node_modules', 'ffmpeg-static', 'bin', 'win32', 'x64', 'ffmpeg.exe'),
  ];

  for (const p of searchPaths) {
    if (fs.existsSync(p)) return p;
  }

  // Final fallback
  return 'ffmpeg';
}

export async function renderWithHyperFrames(options: RenderOptions): Promise<void> {
  const { videoId, hook, body, cta, audioBuffer, audioExt, audioDuration, outputPath, onProgress } = options;
  
  const workDir = path.join(process.cwd(), 'temp_renders', videoId);
  if (!fs.existsSync(workDir)) fs.mkdirSync(workDir, { recursive: true });

  // 1. Load Template Settings
  let tpl: any = { ...DEFAULTS };
  try {
    const setting = await prisma.setting.findUnique({ where: { key: 'video_template' } });
    if (setting && setting.value) {
      const dbTpl = JSON.parse(setting.value);
      Object.keys(DEFAULTS).forEach(key => {
        if (dbTpl[key] !== undefined) tpl[key] = dbTpl[key];
      });
    }
  } catch (e) {
    console.error('[Renderer] Error loading settings, using defaults');
  }

  // 2. Prepare HTML
  const templateDir = path.join(process.cwd(), 'app', 'video-template');
  const templatePath = path.join(templateDir, 'index.html');
  let rendered = fs.readFileSync(templatePath, 'utf-8');

  const now = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();

  const replacements: Record<string, string> = {
    'DATETIME': now,
    'LOGO_TEXT': escapeHtml(tpl.logoText),
    'LOGO_COLOR': tpl.logoColor,
    'LOGO_SIZE': String(tpl.logoSize),
    'LOGO_TOP': String(tpl.logoTop),
    'LOGO_LEFT': String(tpl.logoLeft),
    'LOGO_ANIM': tpl.logoAnim || DEFAULTS.logoAnim,
    'HOOK_TEXT': escapeHtml(hook),
    'HOOK_COLOR': tpl.hookColor,
    'HOOK_SIZE': String(tpl.hookSize),
    'HOOK_ANIM': tpl.hookAnim || DEFAULTS.hookAnim,
    'BODY_TEXT': escapeHtml(body),
    'BODY_COLOR': tpl.bodyColor,
    'BODY_SIZE': String(tpl.bodySize),
    'BODY_ANIM': tpl.bodyAnim || DEFAULTS.bodyAnim,
    'DIVIDER_COLOR': tpl.dividerColor,
    'DIVIDER_WIDTH': String(tpl.dividerWidth),
    'MAIN_TOP': String(tpl.mainTop),
    'MAIN_LEFT': String(tpl.mainLeft),
    'CONTENT_GAP': String(tpl.contentGap),
    'TAG_TEXT': escapeHtml(tpl.tagText),
    'TAG_BG': tpl.tagBg,
    'TAG_COLOR': tpl.tagColor,
    'TAG_SIZE': String(tpl.tagSize),
    'TAG_TOP': String(tpl.tagTop),
    'TAG_LEFT': String(tpl.tagLeft),
    'TAG_ANIM': tpl.tagAnim || DEFAULTS.tagAnim,
    'DURATION': String(audioDuration + 1),
    'BG_IMAGE_URL': tpl.backgroundImage || '',
    'BG_IMAGE_DISPLAY': tpl.backgroundImage ? 'block' : 'none',
    'BG_BRIGHTNESS': String(tpl.backgroundBrightness)
  };

  Object.entries(replacements).forEach(([key, val]) => {
    const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
    rendered = rendered.replace(regex, val);
  });

  fs.writeFileSync(path.join(workDir, 'index.html'), rendered, 'utf-8');

  // 3. Save Audio
  const audioPath = path.join(workDir, `audio.${audioExt}`);
  fs.writeFileSync(audioPath, audioBuffer);

  // 4. (Removed Assets Copy)

  // 5. Setup Paths manually
  const actualFfmpegPath = findFfmpegPath();
  const ffmpegDir = actualFfmpegPath !== 'ffmpeg' ? path.dirname(actualFfmpegPath) : '';
  
  const env = { 
    ...process.env, 
    FFMPEG_PATH: actualFfmpegPath,
    PATH: ffmpegDir ? `${ffmpegDir}${path.delimiter}${process.env.PATH}` : process.env.PATH
  };

  // 6. Run HyperFrames
  let hyperframesBin = path.join(process.cwd(), 'node_modules', '.bin', 'hyperframes');
  if (process.platform === 'win32') hyperframesBin += '.cmd';

  console.log(`[HyperFrames] Rendering starting... Path: ${actualFfmpegPath}`);

  return new Promise((resolve, reject) => {
    const tempVideoPath = path.join(workDir, 'no_audio.mp4');
    
    const child = spawn(
      hyperframesBin,
      ['render', workDir, '-o', tempVideoPath, '-f', '30', '-q', 'standard'],
      { env, cwd: workDir, shell: true }
    );

    child.stdout.on('data', (data) => {
      const line = data.toString();
      const match = line.match(/Rendered frame (\d+)\/(\d+)/i);
      if (match && onProgress) {
        const percent = Math.round((parseInt(match[1]) / parseInt(match[2])) * 100);
        onProgress(percent);
      }
    });

    child.stderr.on('data', (data) => {
      console.error(`[HyperFrames] ${data.toString()}`);
    });

    child.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`HyperFrames failed with code ${code}`));
      }

      // 7. Merge Audio with FFMPEG
      console.log(`[FFMPEG] Merging audio...`);
      try {
        const mergeCmd = `"${actualFfmpegPath}" -y -i "${tempVideoPath}" -i "${audioPath}" -c:v copy -c:a aac -map 0:v:0 -map 1:a:0 -shortest "${outputPath}"`;
        execSync(mergeCmd, { stdio: 'inherit', env });
        
        // Clean up
        try { fs.rmSync(workDir, { recursive: true, force: true }); } catch (_) {}
        resolve();
      } catch (err: any) {
        reject(new Error(`FFMPEG merge failed: ${err.message}`));
      }
    });
  });
}
