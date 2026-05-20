import { spawn, execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import prisma from '../lib/prisma';
import fetch from 'node-fetch';

export interface SceneItem {
  id: number;
  type: 'hook' | 'body' | 'outro';
  voiceText: string;
  bodyText?: string; // New field for visual text
  textColor?: string; // Optional per-scene text color
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
  ratio?: string;      // "9:16", "16:9", "1:1", "4:3"
  settings?: any;      // Custom template overrides
  customHtml?: string; // AI generated dynamic custom HTML template
  onProgress?: (percent: number) => void;
  bgmPath?: string;      // Path to background music file
  bgmVolume?: number;    // 0.0 - 1.0, default 0.15
  backgroundImage?: string;
  width?: number;
  height?: number;
}

const DEFAULTS = {
  logoText: 'AUTOREELS', logoColor: '#EC4899', logoTop: 10, logoLeft: 0, logoAlign: 'center', logoPlacement: 'top', logoAnim: 'slide-down', logoSize: 48,
  hookColor: '#ffffff', hookAnim: 'rotate-in', hookSize: 96,
  bodyColor: 'rgba(255, 255, 255, 0.95)', bodyAnim: 'slide-up', bodySize: 44,
  dividerColor: '#EC4899', dividerWidth: 160,
  mainTop: 0, mainLeft: 0, mainAlign: 'center', mainPlacement: 'center', contentGap: 40,
  tagText: 'HOT TREND', tagBg: '#2563EB', tagColor: '#ffffff', tagTop: -15, tagLeft: 0, tagAlign: 'center', tagPlacement: 'bottom', tagAnim: 'slide-right', tagSize: 28,
  backgroundBrightness: 0.45, backgroundImage: '',
  cardBgColor: 'rgba(0,0,0,0)', cardBorderColor: 'rgba(255,255,255,0.1)',
  cardBorderTop: 0, cardBorderBottom: 0, cardBorderLeft: 0, cardBorderRight: 0, cardBorderRadius: 0,
  showLogo: true, showTag: true, showDatetime: true, showCard: true,
  fontFamily: 'Inter', lineHeight: 1.1, showProgressBar: true,
  logoImage: ''
};

function escapeHtml(unsafe: string) {
  return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function getAlignItems(align: string) { return align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center'; }
function getJustifyContent(align: string) { return align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center'; }

function getTopPos(val: number, placement: string) {
  const offset = val || 0;
  // Add a 4% safe area buffer for Top/Bottom edges
  const base = placement === 'center' ? 50 : placement === 'bottom' ? 96 : 4;
  return `calc(${base}% + ${offset}%)`;
}

function getLeftPos(val: number, align: string) {
  const offset = val || 0;
  // Add a 4% safe area buffer for Left/Right edges
  const base = align === 'center' ? 50 : align === 'right' ? 96 : 4;
  return `calc(${base}% + ${offset}%)`;
}

function getTransform(align: string, placement: string, extra: string = '') {
  let tx = '0';
  let ty = '0';

  if (align === 'center') tx = '-50%';
  else if (align === 'right') tx = '-100%';

  if (placement === 'center') ty = '-50%';
  else if (placement === 'bottom') ty = '-100%';

  return `translate(${tx}, ${ty}) ${extra}`.trim();
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

let gsapCache: string | null = null;

async function getEmbeddedGsap() {
  if (gsapCache) return gsapCache;
  try {
    const gsapPath = path.join(process.cwd(), 'node_modules', 'gsap', 'dist', 'gsap.min.js');
    if (fs.existsSync(gsapPath)) {
      console.log('[Renderer] Loading GSAP from node_modules for inlining...');
      gsapCache = fs.readFileSync(gsapPath, 'utf-8');
      return gsapCache;
    }

    console.log('[Renderer] GSAP not found in node_modules, fetching from CDN for inlining...');
    const res = await fetch('https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js');
    if (!res.ok) throw new Error(`Failed to fetch GSAP: ${res.statusText}`);
    gsapCache = await res.text();
    return gsapCache;
  } catch (err) {
    console.error('[Renderer] Could not get GSAP for inlining, will fallback to CDN link:', err);
    return null;
  }
}

export async function renderWithHyperFrames(options: RenderOptions): Promise<void> {
  const { videoId, templateId: rawTemplateId, outputPath, audioBuffer, audioExt, audioDuration } = options;
  const templateId = rawTemplateId || 'classic';

  return new Promise((resolve, reject) => {
    renderLock = renderLock
      .then(async () => {
        try {
          const workDir = path.join(process.cwd(), 'render_cache', videoId);
          if (!fs.existsSync(workDir)) fs.mkdirSync(workDir, { recursive: true });

          let templateContent = "";
          let templateLogName = "";
          
          if (options.customHtml) {
            console.log(`[Renderer] START: VideoId=${videoId}, Using dynamic Custom HTML generated by AI!`);
            templateContent = options.customHtml;
            templateLogName = "AI-Dynamic-CustomHTML";
          } else {
            let templateDir = path.join(process.cwd(), 'app', 'templates', templateId);
            if (!fs.existsSync(templateDir)) templateDir = path.join(process.cwd(), 'app', 'video-template');
            console.log(`[Renderer] START: VideoId=${videoId}, TemplateId=${templateId}`);
            const templatePath = path.join(templateDir, 'index.html');
            templateContent = fs.readFileSync(templatePath, 'utf-8');
            templateLogName = templatePath;
          }

          // 2. Process Replacements (including GSAP inlining)
          console.log(`[Renderer] Template Source: ${templateLogName} (Size: ${templateContent.length} bytes)`);

          let rendered = templateContent;
          console.log(`[Renderer] Template loaded from: ${templateLogName} (Length: ${rendered.length})`);

          // Inline GSAP to make it offline-ready and avoid CDN load failures
          const embeddedGsap = await getEmbeddedGsap();
          if (embeddedGsap) {
            // More robust regex to catch various script tag formats
            const gsapScriptTag = /<script\s+[^>]*src=["'][^"']*gsap\.min\.js["'][^>]*><\/script>/i;
            const originalLength = rendered.length;
            const safeGsap = embeddedGsap.replace(/<\/script>/g, '<\\/script>');

            if (gsapScriptTag.test(rendered)) {
              rendered = rendered.replace(gsapScriptTag, () => `<script>${safeGsap}</script>`);
              console.log(`[Renderer] SUCCESS: Inlined GSAP into template (Added ${rendered.length - originalLength} bytes)`);
            } else {
              console.warn('[Renderer] WARNING: GSAP script tag not found in template. Prepending to <head> instead.');
              rendered = rendered.replace('<head>', `<head><script>${safeGsap}</script>`);
            }
          }

          await _internalRender(options, rendered);
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

async function _internalRender(options: RenderOptions, templateHtml: string): Promise<void> {
  const { videoId, audioBuffer, audioExt, audioDuration, outputPath, onProgress, ratio = '9:16' } = options;

  let width = 1080;
  let height = 1920;

  if (ratio === '16:9') { width = 1920; height = 1080; }
  else if (ratio === '1:1') { width = 1080; height = 1080; }
  else if (ratio === '4:3') { width = 1440; height = 1080; }

  const scenes: SceneItem[] = options.scenes && options.scenes.length > 0
    ? options.scenes
    : ([
      { id: 1, type: 'hook', voiceText: options.hook || '', imageKeyword: 'news' },
      { id: 2, type: 'body', voiceText: options.body || '', imageKeyword: 'report' },
      { id: 3, type: 'outro', voiceText: options.cta || '', imageKeyword: 'cta' },
    ] as SceneItem[]).filter(s => s.voiceText.trim() !== '');

  const workDir = path.join(process.cwd(), 'render_cache', videoId);
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

  console.log(`[Renderer] DATA CHECK: Scenes Count=${scenes.length}, AudioDuration=${options.audioDuration}`);
  console.log(`[Renderer] RAW SCENES: ${JSON.stringify(scenes.map(s => ({ id: s.id, type: s.type, text: s.voiceText?.substring(0, 20) })))}`);
  console.log(`[Renderer] DURATIONS: ${JSON.stringify(options.sceneDurations)}`);

  let totalDuration = options.audioDuration || tpl.duration || 15;
  let finalDurations = options.sceneDurations || [];

  if (finalDurations.length === 0 && scenes.length > 0) {
    const avg = totalDuration / scenes.length;
    finalDurations = scenes.map(() => avg);
  }
  const durationsJson = JSON.stringify(finalDurations);

  console.log(`[Renderer] INJECTION PREP: TotalDuration=${totalDuration}, SceneCount=${scenes.length}, Durations=${durationsJson}`);

  // Apply custom overrides from options.settings (passed from Studio/Popup)
  if (options.settings) {
    console.log(`[Renderer] Applying custom setting overrides...`);
    Object.keys(DEFAULTS).forEach(key => {
      if (options.settings[key] !== undefined) tpl[key] = options.settings[key];
    });
  }

  const d = new Date();
  const today = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;

  const replacements: Record<string, any> = {
    'WIDTH': width,
    'HEIGHT': height,
    'DURATION': String(totalDuration),
    '__SCENES_DATA_INJECTED__': JSON.stringify(scenes.map(s => ({ ...s, bodyText: s.bodyText || s.voiceText || '' }))).replace(/\\/g, '\\\\').replace(/'/g, "\\'"),
    'SCENES_JSON': JSON.stringify(scenes.map(s => ({ ...s, bodyText: s.bodyText || s.voiceText || '' }))).replace(/\\/g, '\\\\').replace(/'/g, "\\'"),
    '__SCENE_DURATIONS_INJECTED__': durationsJson,
    'SCENE_DURATIONS_JSON': durationsJson,

    // Legacy Raw values for compatibility
    'LOGO_TOP': String(tpl.logoTop || 10),
    'LOGO_LEFT': String(tpl.logoLeft || 0),
    'LOGO_SIZE': String(tpl.logoSize || 60),
    'TAG_TOP': String(tpl.tagTop || -15),
    'TAG_LEFT': String(tpl.tagLeft || 0),
    'TAG_SIZE': String(tpl.tagSize || 32),
    'HOOK_SIZE': String(tpl.hookSize || 120),
    'BODY_SIZE': String(tpl.bodySize || 48),
    'MAIN_TOP': String(tpl.mainTop || 0),
    'MAIN_LEFT': String(tpl.mainLeft || 0),
    'CONTENT_GAP': String(tpl.contentGap || 40),

    'BG_BRIGHTNESS': tpl.backgroundBrightness ?? 0.4,
    'BG_GRADIENT_START': tpl.bgGradientStart || 'rgba(0,0,0,0.4)',
    'BG_GRADIENT_END': tpl.bgGradientEnd || 'rgba(0,0,0,0.8)',
    'BG_IMAGE_URL': (scenes[0]?.imageUrl) || tpl.backgroundImage || options.backgroundImage || '',
    'BG_IMAGE_URL_JS': JSON.stringify((scenes[0]?.imageUrl) || tpl.backgroundImage || options.backgroundImage || ''),
    'LOGO_TEXT': tpl.logoText || '',
    'LOGO_TEXT_JS': JSON.stringify(tpl.logoText || ''),
    'DATETIME': tpl.datetime || today,
    'DATETIME_JS': JSON.stringify(tpl.datetime || today),
    'LOGO_COLOR': tpl.logoColor || '#ffffff',
    'SHOW_LOGO': tpl.showLogo !== false ? 'flex' : 'none',
    'HOOK_COLOR': tpl.hookColor || '#ffffff',
    'BODY_COLOR': tpl.bodyColor || '#ffffff',
    'TAG_TEXT': tpl.tagText || '',
    'TAG_BG': tpl.tagBg || '#fff000',
    'TAG_COLOR': tpl.tagColor || '#000000',
    'SHOW_TAG': tpl.showTag !== false ? 'flex' : 'none',
    'SHOW_DATETIME': tpl.showDatetime !== false ? 'block' : 'none',
    'ACCENT_COLOR': tpl.accentColor || tpl.logoColor || '#ffffff',
    'SECONDARY_COLOR': tpl.secondaryColor || tpl.dividerColor || '#ffffff',
    'DIVIDER_COLOR': tpl.dividerColor || '#ffffff',

    'LOGO_CSS_TOP': getTopPos(tpl.logoTop ?? 10, tpl.logoPlacement || 'top'),
    'LOGO_CSS_LEFT': getLeftPos(tpl.logoLeft || 0, tpl.logoAlign || 'center'),
    'LOGO_CSS_TRANSFORM': getTransform(tpl.logoAlign || 'center', tpl.logoPlacement || 'top'),
    'TAG_CSS_TOP': getTopPos(tpl.tagTop ?? -15, tpl.tagPlacement || 'bottom'),
    'TAG_CSS_LEFT': getLeftPos(tpl.tagLeft || 0, tpl.tagAlign || 'center'),
    'TAG_CSS_TRANSFORM': getTransform(tpl.tagAlign || 'center', tpl.tagPlacement || 'bottom'),
    'MAIN_CSS_TOP': getTopPos(tpl.mainTop ?? 0, tpl.mainPlacement || 'center'),
    'MAIN_CSS_LEFT': getLeftPos(tpl.mainLeft || 0, tpl.mainAlign || 'center'),
    'MAIN_CSS_TRANSFORM': getTransform(tpl.mainAlign || 'center', tpl.mainPlacement || 'center'),
    'MAIN_CSS_ALIGN': getAlignItems(tpl.mainAlign || 'center'),
    'MAIN_CSS_TEXT_ALIGN': tpl.mainAlign || 'center',
    'FONT_FAMILY': (tpl.fontFamily || 'Inter')
      .toLowerCase()
      .replace(/playfair display/g, 'playfair-display')
      .replace(/jetbrains mono/g, 'jetbrains-mono')
      .replace(/archivo black/g, 'archivo-black')
      .replace(/open sans/g, 'open-sans')
      .replace(/ibm plex mono/g, 'ibm-plex-mono'),
    'LINE_HEIGHT': String(tpl.lineHeight || 1.1),
    'SHOW_PROGRESS_BAR': tpl.showProgressBar !== false ? 'block' : 'none',
    'LOGO_IMAGE': tpl.logoImage || '',
    'SHOW_LOGO_IMAGE': tpl.logoImage ? 'inline-block' : 'none',
  };
  // Fix Background Image URL for local rendering
  let bgUrl = replacements['BG_IMAGE_URL'];
  if (bgUrl && bgUrl.startsWith('/assets/')) {
    const absPath = path.join(process.cwd(), 'app', 'templates', bgUrl);
    replacements['BG_IMAGE_URL'] = `file:///${absPath.replace(/\\/g, '/')}`;
    replacements['BG_IMAGE_URL_JS'] = JSON.stringify(replacements['BG_IMAGE_URL']);
  }

  // Fix Logo Image URL for local rendering
  let logoUrl = replacements['LOGO_IMAGE'];
  if (logoUrl && logoUrl.startsWith('/assets/')) {
    const absPath = path.join(process.cwd(), 'app', 'templates', logoUrl);
    replacements['LOGO_IMAGE'] = `file:///${absPath.replace(/\\/g, '/')}`;
  }

  let rendered = templateHtml;

  // Process all replacements (robust regex matches standard {{KEY}} and formatted split versions)
  Object.entries(replacements).forEach(([key, val]) => {
    const stringVal = String(val ?? '');
    const regex = new RegExp(`\\{\\s*[\\r\\n]*\\s*\\{\\s*[\\r\\n]*\\s*${key}\\s*[\\r\\n]*\\s*\\}\\s*[\\r\\n]*\\s*\\}`, 'g');
    rendered = rendered.replace(regex, () => stringVal);
  });

  // Define HyperFrames control script BEFORE use
  const dVal = options.audioDuration || 5;
  const durVal = String(Math.ceil(dVal));
  const hfScript = `
  <script>
    window.__hf = window.__hf || {};
    window.__hf.active = true;
    (function() {
      var fallbackDur = ${dVal};
      var d = window.duration || fallbackDur;
      var rootEl = document.getElementById('root');
      if (rootEl && rootEl.getAttribute('data-duration')) {
        var attrDur = parseFloat(rootEl.getAttribute('data-duration'));
        if (!isNaN(attrDur)) d = attrDur;
      }
      window.duration = d;
      window.remotion_duration = d;
      window.remotion_totalFrames = Math.ceil(d * 24);
      window.__hf.duration = d;
      window.__hf.getDuration = function() { return d; };
      window.__hf.seek = function(t) { 
        if (window._tl && typeof window._tl.seek === 'function') {
          window._tl.seek(t); 
        }
      };
      if (!window._tl) { window._tl = { seek: function() {} }; }
    })();
  </script>
  `;

  // Inject Google Fonts dynamic stylesheet to ensure perfect Unicode font loading for the chosen fontFamily
  const selectedFont = tpl.fontFamily || 'Inter';
  let fontLoaderScript = '';
  // Avoid loading system fonts via Google Fonts API
  const localFonts = ['arial', 'helvetica', 'sans-serif', 'serif', 'monospace', 'courier', 'segoe ui'];
  if (!localFonts.includes(selectedFont.toLowerCase().trim())) {
    const fontLinkName = selectedFont.trim().replace(/\s+/g, '+');
    fontLoaderScript = `\n  <link rel="preconnect" href="https://fonts.googleapis.com">\n  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n  <link href="https://fonts.googleapis.com/css2?family=${fontLinkName}:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">`;
  }

  // Inject both Google Font link and seeker script into <head> so it's available immediately
  rendered = rendered.replace('<head>', `<head>${fontLoaderScript}\n${hfScript}`);

  // FINAL VERIFICATION: Check if our unique placeholders were replaced
  if (rendered.includes('__SCENE_DURATIONS_INJECTED__')) {
    console.error('[Renderer] ERROR: __SCENE_DURATIONS_INJECTED__ placeholder was NOT replaced!');
  } else {
    const durStart = rendered.indexOf('let rawDurations = ') + 19;

  }

  // The data has been replaced and hfScript injected above.
  // Now proceed to write the file and start the rendering process.

  const indexPath = path.join(workDir, 'index.html');
  fs.writeFileSync(indexPath, rendered, 'utf-8');


  const audioPath = path.join(workDir, `audio.${audioExt}`);
  fs.writeFileSync(audioPath, audioBuffer);

  const actualFfmpegPath = findFfmpegPath();
  const ffmpegDir = actualFfmpegPath !== 'ffmpeg' ? path.dirname(actualFfmpegPath) : '';
  const env = { ...process.env, FFMPEG_PATH: actualFfmpegPath, PATH: ffmpegDir ? `${ffmpegDir}${path.delimiter}${process.env.PATH}` : process.env.PATH };

  let hyperframesBin = path.join(process.cwd(), 'node_modules', '.bin', 'hyperframes');
  if (process.platform === 'win32') hyperframesBin += '.cmd';

  // Use resolved absolute path for stability on Windows
  const absoluteWorkDir = path.resolve(workDir);

  return new Promise(async (resolve, reject) => {
    // 15-minute safety timeout for the entire subprocess
    const RENDER_TIMEOUT = 15 * 60 * 1000;
    const timeoutHandle = setTimeout(() => {
      console.error(`[Renderer] TIMEOUT: Rendering exceeded ${RENDER_TIMEOUT/1000}s. Killing process.`);
      child.kill('SIGKILL');
      reject(new Error(`Rendering timed out after ${RENDER_TIMEOUT/1000} seconds`));
    }, RENDER_TIMEOUT);

    // Brief delay to ensure file I/O is flushed (reduced from 1s → 200ms)
    await new Promise(r => setTimeout(r, 200));

    const tempVideoPath = path.join(workDir, 'no_audio.mp4');
    let hyperError = '';

    const child = spawn(hyperframesBin, [
      'render', absoluteWorkDir,
      '-o', tempVideoPath,
      '-f', '24',              // 24fps: 20% fewer frames vs 30fps, negligible quality loss for text
      '-q', 'high',             // High quality: avoid artifacts that look like flickering
      '--max-workers', '2'     // Limit concurrent Chrome tabs to prevent CPU saturation
    ], {
      env: { ...env, PUPPETEER_HEADLESS: 'old' },
      cwd: process.cwd(),
      shell: process.platform === 'win32' // Still need shell for .cmd on Windows
    });

    child.stdout.on('data', (data) => {
      const output = data.toString();
      const match = output.match(/Rendered frame (\d+)\/(\d+)/i);
      if (match && onProgress) onProgress(Math.round((parseInt(match[1]) / parseInt(match[2])) * 100));
    });

    child.stderr.on('data', (data) => {
      hyperError += data.toString();
      console.error(`[HyperFrames Error] ${data}`);
    });

    child.on('close', (code) => {
      clearTimeout(timeoutHandle);
      if (code !== 0) return reject(new Error(`HyperFrames failed with code ${code}. Error: ${hyperError}`));
      try {
        let mergeCmd: string;
        // Optimization: Use '-threads 1' to keep memory spikes low on shared containers
        const threadOpt = '-threads 1';

        if (options.bgmPath && fs.existsSync(options.bgmPath)) {
          const bgmVol = Math.max(0, Math.min(1, options.bgmVolume ?? 0.15));
          console.log(`[Renderer] Mixing BGM at volume ${bgmVol}: ${options.bgmPath}`);
          mergeCmd = `"${actualFfmpegPath}" -y ${threadOpt} -i "${tempVideoPath}" -i "${audioPath}" -stream_loop -1 -i "${options.bgmPath}" -filter_complex "[1:a]aresample=async=1[v_rs];[2:a]aresample=async=1,volume=${bgmVol}[bgm_rs];[v_rs][bgm_rs]amix=inputs=2:duration=first:dropout_transition=2[aout]" -map 0:v:0 -map "[aout]" -c:v copy -c:a aac -b:a 128k -shortest "${outputPath}"`;
        } else {
          mergeCmd = `"${actualFfmpegPath}" -y ${threadOpt} -i "${tempVideoPath}" -i "${audioPath}" -c:v copy -c:a aac -b:a 128k -map 0:v:0 -map 1:a:0 -shortest "${outputPath}"`;
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

        console.log(`[Renderer] Render successful for ${videoId}. Output: ${outputPath}`);
        // Only cleanup on success if you want, but for debugging let's keep it
        // try { fs.rmSync(workDir, { recursive: true, force: true }); } catch (_) {}
        resolve();
      } catch (err: any) {
        console.error('[Renderer] Final Merge Error:', err.message);
        // Keep workDir on error for inspection
        console.log(`[Renderer] FAILURE: Inspect work directory at: ${workDir}`);
        reject(err);
      }
    });

  });
}

