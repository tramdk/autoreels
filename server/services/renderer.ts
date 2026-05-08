import { spawn, execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import prisma from '../lib/prisma';

export interface SceneItem {
  id: number;
  type: 'hook' | 'body' | 'outro';
  voiceText: string;
  imageKeyword: string;
  imageUrl?: string;
}

interface RenderOptions {
  videoId: string;
  scenes?: SceneItem[];
  hook?: string;
  body?: string;
  cta?: string;
  audioBuffer: Buffer;
  audioExt: string;
  audioDuration: number;
  sceneDurations?: number[];
  outputPath: string;
  templateId?: string;
  onProgress?: (percent: number) => void;
  bgmPath?: string;      // Path to background music file
  bgmVolume?: number;    // 0.0 - 1.0, default 0.15
}

const DEFAULTS = {
  logoText: 'AUTOREELS', logoColor: '#ffffff', logoTop: 100, logoLeft: 0, logoAlign: 'top-center', logoAnim: 'slide-down', logoSize: 60,
  hookColor: '#ffffff', hookAnim: 'rotate-in', hookSize: 120,
  bodyColor: 'rgba(255, 255, 255, 0.9)', bodyAnim: 'slide-up', bodySize: 48,
  dividerColor: '#00f2ff', dividerWidth: 200,
  mainTop: 600, mainLeft: 100, mainAlign: 'center', contentGap: 40,
  tagText: 'HOT NEWS', tagBg: '#fff000', tagColor: '#000000', tagTop: 1600, tagLeft: 0, tagAlign: 'bottom-center', tagAnim: 'slide-right', tagSize: 32,
  backgroundBrightness: 0.4, backgroundImage: '',
  cardBgColor: 'rgba(0,0,0,0)', cardBorderColor: 'rgba(255,255,255,0.1)',
  cardBorderTop: 0, cardBorderBottom: 0, cardBorderLeft: 0, cardBorderRight: 0, cardBorderRadius: 0,
  showLogo: true, showTag: true, showDatetime: true, showCard: true
};

function escapeHtml(unsafe: string) {
  return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

export function findFfmpegPath(): string {
  const searchPaths = [
    path.join(process.cwd(), 'node_modules', 'ffmpeg-static', 'ffmpeg'),
    path.join(process.cwd(), 'node_modules', 'ffmpeg-static', 'ffmpeg.exe'),
    path.join(process.cwd(), 'node_modules', 'ffmpeg-static', 'bin', 'win32', 'x64', 'ffmpeg.exe'),
  ];
  for (const p of searchPaths) {
    if (fs.existsSync(p)) return p;
  }
  return 'ffmpeg';
}

import ffprobeStatic from 'ffprobe-static';

export function getAudioDuration(filePath: string): number {
  try {
    const ffprobePath = ffprobeStatic.path;
    const cmd = `"${ffprobePath}" -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`;
    const output = execSync(cmd).toString().trim();
    return parseFloat(output) || 0;
  } catch (e) {
    console.error('[Renderer] getAudioDuration error:', e);
    return 0;
  }
}

// Simple sequential queue to prevent OOM on memory-constrained environments (like Render.com 512MB)
let renderLock: Promise<void> = Promise.resolve();

export async function renderWithHyperFrames(options: RenderOptions): Promise<void> {
  // Wrap in a queue: only one render at a time
  return new Promise((resolve, reject) => {
    renderLock = renderLock
      .then(async () => {
        try {
          await _internalRender(options);
          resolve();
        } catch (err) {
          reject(err);
        }
      })
      .catch((err) => {
        console.error('[Renderer Queue] Error in render task:', err);
        reject(err); // Still reject the original promise
      });
  });
}

async function _internalRender(options: RenderOptions): Promise<void> {
  const { videoId, audioBuffer, audioExt, audioDuration, outputPath, onProgress } = options;

  const scenes: SceneItem[] = options.scenes && options.scenes.length > 0
    ? options.scenes
    : ([
        { id: 1, type: 'hook',  voiceText: options.hook || '', imageKeyword: 'news' },
        { id: 2, type: 'body',  voiceText: options.body || '', imageKeyword: 'report' },
        { id: 3, type: 'outro', voiceText: options.cta  || '', imageKeyword: 'cta' },
      ] as SceneItem[]).filter(s => s.voiceText.trim() !== '');

  const workDir = path.join(process.cwd(), 'temp_renders', videoId);
  if (!fs.existsSync(workDir)) fs.mkdirSync(workDir, { recursive: true });

  const templateId = options.templateId || 'classic';
  let tpl: any = { ...DEFAULTS };
  try {
    const templateKey = `video_template_${templateId}`;
    let setting = await prisma.setting.findUnique({ where: { key: templateKey } });
    if (!setting) setting = await prisma.setting.findUnique({ where: { key: 'video_template' } });
    if (setting && setting.value) {
      const dbTpl = JSON.parse(setting.value);
      Object.keys(DEFAULTS).forEach(key => { if (dbTpl[key] !== undefined) tpl[key] = dbTpl[key]; });
    }
  } catch (e) { console.error('[Renderer] Error loading settings', e); }

  let templateDir = path.join(process.cwd(), 'app', 'templates', templateId);
  if (!fs.existsSync(templateDir)) templateDir = path.join(process.cwd(), 'app', 'video-template');
  
  const templatePath = path.join(templateDir, 'index.html');
  let rendered = fs.readFileSync(templatePath, 'utf-8');

  const now = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();
  const sanitisedScenes = scenes;

  const replacements: Record<string, string> = {
    'DATETIME': now,
    'LOGO_TEXT': escapeHtml(tpl.logoText),
    'LOGO_COLOR': tpl.logoColor,
    'LOGO_SIZE': String(tpl.logoSize),
    'LOGO_TOP': String(tpl.logoTop),
    'LOGO_LEFT': String(tpl.logoLeft),
    'LOGO_ALIGN': tpl.logoAlign || 'top-center',
    'HOOK_COLOR': tpl.hookColor,
    'HOOK_SIZE': String(tpl.hookSize),
    'BODY_COLOR': tpl.bodyColor,
    'BODY_SIZE': String(tpl.bodySize),
    'DIVIDER_COLOR': tpl.dividerColor,
    'MAIN_TOP': String(tpl.mainTop),
    'MAIN_LEFT': String(tpl.mainLeft),
    'MAIN_ALIGN': tpl.mainAlign || 'center',
    'CONTENT_GAP': String(tpl.contentGap),
    'TAG_TEXT': escapeHtml(tpl.tagText),
    'TAG_BG': tpl.tagBg,
    'TAG_COLOR': tpl.tagColor,
    'TAG_SIZE': String(tpl.tagSize),
    'TAG_TOP': String(tpl.tagTop),
    'TAG_LEFT': String(tpl.tagLeft),
    'TAG_ALIGN': tpl.tagAlign || 'bottom-center',
    'DURATION': String(options.audioDuration),
    'BG_IMAGE_URL': (scenes[0]?.imageUrl) || tpl.backgroundImage || '',
    'BG_IMAGE_DISPLAY': (scenes[0]?.imageUrl || tpl.backgroundImage) ? 'block' : 'none',
    'BG_BRIGHTNESS': String(tpl.backgroundBrightness),
    'CARD_BG_COLOR': tpl.cardBgColor || 'transparent',
    'CARD_BORDER_COLOR': tpl.cardBorderColor || 'transparent',
    'CARD_BORDER_TOP': String(tpl.cardBorderTop || 0),
    'CARD_BORDER_BOTTOM': String(tpl.cardBorderBottom || 0),
    'CARD_BORDER_LEFT': String(tpl.cardBorderLeft || 0),
    'CARD_BORDER_RIGHT': String(tpl.cardBorderRight || 0),
    'CARD_BORDER_RADIUS': String(tpl.cardBorderRadius || 0),
    'SHOW_LOGO': tpl.showLogo !== false ? 'block' : 'none',
    'SHOW_TAG': tpl.showTag !== false ? 'flex' : 'none',
    'SHOW_DATETIME': tpl.showDatetime !== false ? 'block' : 'none',
    'SHOW_CARD': tpl.showCard !== false ? 'flex' : 'none',
    'SCENES_JSON': JSON.stringify(sanitisedScenes),
    'SCENE_DURATIONS_JSON': JSON.stringify(options.sceneDurations || []),
  };

  Object.entries(replacements).forEach(([key, val]) => {
    rendered = rendered.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g'), val);
  });

  fs.writeFileSync(path.join(workDir, 'index.html'), rendered, 'utf-8');
  const audioPath = path.join(workDir, `audio.${audioExt}`);
  fs.writeFileSync(audioPath, audioBuffer);

  const actualFfmpegPath = findFfmpegPath();
  const ffmpegDir = actualFfmpegPath !== 'ffmpeg' ? path.dirname(actualFfmpegPath) : '';
  const env = { ...process.env, FFMPEG_PATH: actualFfmpegPath, PATH: ffmpegDir ? `${ffmpegDir}${path.delimiter}${process.env.PATH}` : process.env.PATH };

  let hyperframesBin = path.join(process.cwd(), 'node_modules', '.bin', 'hyperframes');
  if (process.platform === 'win32') hyperframesBin += '.cmd';

  return new Promise((resolve, reject) => {
    const tempVideoPath = path.join(workDir, 'no_audio.mp4');
    // Optimization: Limiting concurrency to 1 and disabling high-memory overhead features if possible
    const child = spawn(hyperframesBin, ['render', workDir, '-o', tempVideoPath, '-f', '30', '-q', 'standard'], { env, cwd: workDir, shell: true });
    
    child.stdout.on('data', (data) => {
      const match = data.toString().match(/Rendered frame (\d+)\/(\d+)/i);
      if (match && onProgress) onProgress(Math.round((parseInt(match[1]) / parseInt(match[2])) * 100));
    });

    child.on('close', (code) => {
      if (code !== 0) return reject(new Error(`HyperFrames failed with code ${code}`));
      try {
        let mergeCmd: string;
        // Optimization: Use '-threads 1' to keep memory spikes low on shared containers
        const threadOpt = '-threads 1';
        
        if (options.bgmPath && fs.existsSync(options.bgmPath)) {
          const bgmVol = Math.max(0, Math.min(1, options.bgmVolume ?? 0.15));
          console.log(`[Renderer] Mixing BGM at volume ${bgmVol}: ${options.bgmPath}`);
          // Added aresample to ensure sampling rates match before amix
          mergeCmd = `"${actualFfmpegPath}" -y ${threadOpt} -i "${tempVideoPath}" -i "${audioPath}" -stream_loop -1 -i "${options.bgmPath}" -filter_complex "[1:a]aresample=async=1[v_rs];[2:a]aresample=async=1,volume=${bgmVol}[bgm_rs];[v_rs][bgm_rs]amix=inputs=2:duration=first:dropout_transition=2[aout]" -map 0:v:0 -map "[aout]" -c:v copy -c:a aac -b:a 192k -shortest "${outputPath}"`;
        } else {
          mergeCmd = `"${actualFfmpegPath}" -y ${threadOpt} -i "${tempVideoPath}" -i "${audioPath}" -c:v copy -c:a aac -b:a 192k -map 0:v:0 -map 1:a:0 -shortest "${outputPath}"`;
        }
        
        console.log(`[Renderer] Executing merge: ${mergeCmd}`);
        
        // Verify input files exist
        if (!fs.existsSync(tempVideoPath)) throw new Error(`Input video missing: ${tempVideoPath}`);
        if (!fs.existsSync(audioPath)) throw new Error(`Input audio missing: ${audioPath}`);

        try {
          // Capture stderr for better error reporting
          const stderr = execSync(mergeCmd, { env, stdio: ['ignore', 'ignore', 'pipe'] });
        } catch (execErr: any) {
          const stderr = execErr.stderr?.toString() || execErr.message;
          console.error('[Renderer] FFMPEG Merge Error Stderr:', stderr);
          throw new Error(`FFMPEG merge failed: ${stderr}`);
        }

        try { fs.rmSync(workDir, { recursive: true, force: true }); } catch (_) {}
        resolve();
      } catch (err: any) { 
        console.error('[Renderer] Final Merge Error:', err.message);
        reject(err); 
      }
    });

  });
}

