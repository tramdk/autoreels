import React, { useState, useEffect, useMemo, useRef } from 'react';
import { RefreshCw, Play, Pause } from 'lucide-react';
import { api } from '../../../services/api';

interface LivePreviewProps {
  templateId: string;
  templateData: any;
  loading: boolean;
  ratio?: string;
}

// Ported from server/services/renderer.ts for 1:1 parity
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

function getAlignItems(align: string) { return align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center'; }
function getJustifyContent(align: string) { return align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center'; }

export const LivePreview: React.FC<LivePreviewProps> = ({ templateId, templateData, loading, ratio = '9:16' }) => {
  const [rawHtml, setRawHtml] = useState<string>('');
  const [loadingHtml, setLoadingHtml] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchHtml = async () => {
      setLoadingHtml(true);
      try {
        const html = await api.getRawTemplateHtml(templateId);
        if (isMounted) setRawHtml(html);
      } catch (err) {
        console.error('Failed to fetch raw template:', err);
      } finally {
        if (isMounted) setLoadingHtml(false);
      }
    };
    fetchHtml();
    return () => { isMounted = false; };
  }, [templateId]);

  const togglePlay = () => {
    const nextState = !isPlaying;
    setIsPlaying(nextState);
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type: 'GSAP_CONTROL', command: nextState ? 'play' : 'pause' }, '*');
    }
  };

  const getRenderedHtml = () => {
    if (!rawHtml || !templateData) return '';
    let html = rawHtml;
    const tpl = { ...(templateData.settings || {}), ...templateData };
    
    let w = 1080, h = 1920;
    if (ratio === '16:9') { w = 1920; h = 1080; }
    else if (ratio === '1:1') { w = 1080; h = 1080; }
    else if (ratio === '4:3') { w = 1440; h = 1080; }

    const d = new Date();
    const now = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
    const scenes = templateData.scenes || [
      { id: 1, type: 'hook', voiceText: templateData.title || "The Future of AI Content", bodyText: templateData.title || "The Future of AI Content" },
      { id: 2, type: 'body', voiceText: templateData.content || "Automate your production with style.", bodyText: templateData.content || "Automate your production with style." }
    ];

    const replacements: any = {
      'WIDTH': String(w),
      'HEIGHT': String(h),
      'LOGO_TEXT': tpl.logoText || 'AUTOREELS',
      'LOGO_TEXT_JS': JSON.stringify(tpl.logoText || 'AUTOREELS'),
      'DATETIME': now,
      'DATETIME_JS': JSON.stringify(now),
      'LOGO_SIZE': tpl.logoSize || 48,
      'LOGO_COLOR': tpl.logoColor || '#ffffff',
      'ACCENT_COLOR': tpl.accentColor || tpl.logoColor || '#00f2ff',
      'SECONDARY_COLOR': tpl.secondaryColor || tpl.dividerColor || '#ffffff',
      'LOGO_TOP': tpl.logoTop ?? 10,
      'LOGO_LEFT': tpl.logoLeft || 0,
      'HOOK_SIZE': tpl.hookSize || 96,
      'HOOK_COLOR': tpl.hookColor || '#ffffff',
      'BODY_SIZE': tpl.bodySize || 44,
      'BODY_COLOR': tpl.bodyColor || '#ffffff',
      'DIVIDER_COLOR': tpl.dividerColor || '#00f2ff',
      'MAIN_TOP': tpl.mainTop ?? 0,
      'MAIN_LEFT': tpl.mainLeft || 0,
      'CONTENT_GAP': tpl.contentGap || 40,
      'TAG_TEXT': tpl.tagText || 'HOT NEWS',
      'TAG_BG': tpl.tagBg || '#2563EB',
      'TAG_COLOR': tpl.tagColor || '#ffffff',
      'TAG_SIZE': tpl.tagSize || 28,
      'TAG_TOP': tpl.tagTop ?? -15,
      'TAG_LEFT': tpl.tagLeft || 0,
      'DURATION': '15',
      'BG_IMAGE_URL': templateData.backgroundImage || tpl.backgroundImage || '',
      'BG_IMAGE_URL_JS': JSON.stringify(templateData.backgroundImage || tpl.backgroundImage || ''),
      'BG_IMAGE_DISPLAY': (templateData.backgroundImage || tpl.backgroundImage) ? 'block' : 'none',
      'BG_BRIGHTNESS': tpl.backgroundBrightness || 0.45,
      'BG_GRADIENT_START': tpl.bgGradientStart || 'rgba(0,0,0,0.4)',
      'BG_GRADIENT_END': tpl.bgGradientEnd || 'rgba(0,0,0,0.8)',
      'SHOW_LOGO': tpl.showLogo !== false ? 'block' : 'none',
      'SHOW_TAG': tpl.showTag !== false ? 'flex' : 'none',
      'SHOW_DATETIME': tpl.showDatetime !== false ? 'flex' : 'none',
      'SHOW_CARD': tpl.showCard !== false ? 'flex' : 'none',
      'SCENES_JSON': JSON.stringify(scenes.map((s: any) => ({ ...s, bodyText: s.bodyText || s.voiceText || '' }))),
      'SCENE_DURATIONS_JSON': JSON.stringify([]),
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
    };

    Object.keys(replacements).forEach(key => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      const val = replacements[key];
      html = html.replace(regex, () => (val === undefined || val === null) ? '' : String(val));
    });

    html = html.replace(/(src|href)=["']\/([^"']+)["']/g, `$1="${window.location.origin}/$2"`);
    html = html.replace(/url\(["']?\/([^"'\)]+)["']?\)/g, `url("${window.location.origin}/$1")`);

    const extraContent = `
      <style>
        #main-content {
          display: flex !important;
          flex-direction: column !important;
          top: ${replacements['MAIN_CSS_TOP']} !important;
          left: ${replacements['MAIN_CSS_LEFT']} !important;
          transform: ${replacements['MAIN_CSS_TRANSFORM']} !important;
          align-items: ${replacements['MAIN_CSS_ALIGN']} !important;
          text-align: ${replacements['MAIN_CSS_TEXT_ALIGN']} !important;
          gap: ${replacements['CONTENT_GAP']}px !important;
        }
        #main-content .scene-box {
          display: flex !important;
          flex-direction: column !important;
          align-items: ${replacements['MAIN_CSS_ALIGN']} !important;
          text-align: ${replacements['MAIN_CSS_TEXT_ALIGN']} !important;
        }
      </style>
      <script>
        (function() {
          var check = setInterval(function() {
            if (window._tl) {
              window._tl.seek(1);
              window._tl.pause();
              clearInterval(check);
            }
          }, 100);
          
          window.addEventListener('message', function(event) {
            if (event.data.type === 'GSAP_CONTROL' && window._tl) {
              if (event.data.command === 'play') window._tl.play();
              else if (event.data.command === 'pause') window._tl.pause();
            }
          });
        })();
      </script>
    `;

    if (html.includes('</head>')) {
      html = html.replace('</head>', `${extraContent}</head>`);
    } else {
      html += extraContent;
    }
    
    return html;
  };

  const renderedHtml = getRenderedHtml();

  const [scale, setScale] = useState(1);
  // Remove state-based baseWidth/Height, calculate from ratio prop
  const currentW = ratio === '16:9' ? 1920 : ratio === '1:1' ? 1080 : ratio === '4:3' ? 1440 : 1080;
  const currentH = ratio === '16:9' ? 1080 : ratio === '1:1' ? 1080 : ratio === '4:3' ? 1080 : 1920;

  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        setScale(containerWidth / currentW);
      }
    };

    updateScale();
    const timer = setTimeout(updateScale, 100);
    window.addEventListener('resize', updateScale);
    return () => {
      window.removeEventListener('resize', updateScale);
      clearTimeout(timer);
    };
  }, [ratio, renderedHtml, currentW]);

  return (
    <div className="w-full lg:flex-1 bg-black/40 flex flex-col items-center justify-center p-8 lg:p-12 relative overflow-hidden shrink-0 min-h-[400px] lg:min-h-0">
      <div className="flex flex-col items-center gap-2 mb-10 z-10">
        <div className="text-[10px] font-black uppercase text-slate-500 tracking-[0.5em] flex items-center gap-4">
          <div className="w-8 h-[1px] bg-slate-800"></div>
          1:1 Professional Preview
          <div className="w-8 h-[1px] bg-slate-800"></div>
        </div>
        
        <button 
          onClick={togglePlay}
          className="flex items-center gap-2 px-6 py-2 bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded-full transition-all group mt-2"
        >
          {isPlaying ? (
            <><Pause className="w-4 h-4 text-primary fill-primary" /> <span className="text-[9px] font-black text-primary uppercase tracking-widest">Pause</span></>
          ) : (
            <><Play className="w-4 h-4 text-primary fill-primary" /> <span className="text-[9px] font-black text-primary uppercase tracking-widest">Play Preview</span></>
          )}
        </button>
      </div>

      <div className="z-10 transition-all duration-700 w-full flex justify-center">
        {(loading || loadingHtml) && (
          <div className="absolute inset-0 z-[60] flex items-center justify-center bg-slate-950/40 backdrop-blur-sm rounded-3xl">
            <RefreshCw className="w-8 h-8 text-primary animate-spin" />
          </div>
        )}
        
        {renderedHtml ? (
          <div 
            ref={containerRef}
            className="relative rounded-3xl border-8 border-slate-800 shadow-2xl overflow-hidden bg-slate-950 select-none pointer-events-none"
            style={{ 
              width: ratio === '16:9' ? '450px' : ratio === '1:1' ? '300px' : ratio === '4:3' ? '360px' : '220px',
              aspectRatio: ratio.replace(':', '/'),
            }}
          >
            <div 
              style={{
                width: currentW,
                height: currentH,
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
                pointerEvents: 'none'
              }}
            >
              <div className="absolute top-4 left-4 z-[100] bg-black/80 text-[8px] font-mono p-2 rounded border border-white/20 text-white pointer-events-none uppercase">
                Layout: {templateData?.settings?.mainPlacement || 'center'} | Offset: {templateData?.settings?.mainTop || 0}%
              </div>
              <iframe 
                key={renderedHtml.length + JSON.stringify(templateData?.settings || {})}
                ref={iframeRef}
                srcDoc={renderedHtml}
                className="w-full h-full border-none pointer-events-none overflow-hidden"
                title="Template Preview"
                scrolling="no"
                style={{ width: '100%', height: '100%', background: 'transparent' }}
              />
            </div>
          </div>
        ) : (
          <div className="text-slate-500 font-bold uppercase text-[10px] tracking-widest animate-pulse">Initializing 1:1 Preview...</div>
        )}
      </div>
    </div>
  );
};
