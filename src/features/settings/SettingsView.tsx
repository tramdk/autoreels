import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue } from 'motion/react';
import { Settings, Volume2, Palette, ArrowUp, ArrowDown, Save, Image as ImageIcon, Trash2, Sliders, Type, GripVertical, Move, Sparkles } from 'lucide-react';
import { api } from '../../services/api';
import { toast } from 'react-hot-toast';

interface TemplateSettings {
  logoText: string;
  logoColor: string;
  logoTop: number;
  logoLeft: number;
  logoAnim: string;
  logoSize: number;
  hookColor: string;
  hookAnim: string;
  hookSize: number;
  bodyColor: string;
  bodyAnim: string;
  bodySize: number;
  dividerColor: string;
  dividerWidth: number;
  mainTop: number;
  mainLeft: number;
  contentGap: number;
  tagText: string;
  tagBg: string;
  tagColor: string;
  tagTop: number;
  tagLeft: number;
  tagAnim: string;
  tagSize: number;
  backgroundBrightness: number;
  backgroundImage: string;
}

const ANIMATIONS = [
  { value: 'fade', label: 'Simple Fade' },
  { value: 'slide-up', label: 'Slide Up' },
  { value: 'slide-down', label: 'Slide Down' },
  { value: 'slide-left', label: 'Slide Left' },
  { value: 'slide-right', label: 'Slide Right' },
  { value: 'zoom-in', label: 'Zoom In' },
  { value: 'rotate-in', label: 'Rotate In' },
];

const SCALE = 320 / 1080;

const DEFAULTS = {
  logoSize: 60,
  hookSize: 120,
  bodySize: 48,
  tagSize: 32,
  dividerWidth: 200,
  mainTop: 600,
  mainLeft: 80,
  contentGap: 40
};

const TabBtn: React.FC<{ active: boolean, onClick: () => void, icon: any, label: string }> = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${active ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>
    {icon} <span>{label}</span>
  </button>
);

const SizeSlider: React.FC<{ label: string, value: number, min: number, max: number, onChange: (v: number) => void }> = ({ label, value, min, max, onChange }) => (
  <div className="space-y-2">
    <div className="flex justify-between items-center px-1">
      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</span>
      <span className="text-[10px] font-mono text-blue-400">{Math.round(value)}px</span>
    </div>
    <input type="range" min={min} max={max} value={value || min} onChange={e => onChange(parseInt(e.target.value))} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500" />
  </div>
);

const AnimGroup: React.FC<{ label: string, value: string, onChange: (v: string) => void }> = ({ label, value, onChange }) => (
  <div className="space-y-3">
    <label className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">{label} Animation</label>
    <select value={value} onChange={e => onChange(e.target.value)} className="w-full bg-slate-900 border border-white/5 rounded-2xl px-5 py-4 text-white font-bold outline-none focus:border-blue-500/50 appearance-none cursor-pointer">
      {ANIMATIONS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
    </select>
  </div>
);

const ColorInput: React.FC<{ label: string, value: string, onChange: (val: string) => void }> = ({ label, value, onChange }) => (
  <div className="bg-slate-900/50 p-4 rounded-2xl border border-white/5 flex items-center gap-4 hover:border-white/20 transition-all">
    <div className="relative w-10 h-10 shrink-0">
      <input type="color" value={value} onChange={e => onChange(e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
      <div className="w-full h-full rounded-lg border border-white/20 shadow-inner" style={{ backgroundColor: value }}></div>
    </div>
    <div className="flex flex-col min-w-0">
      <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter mb-0.5">{label}</span>
      <input type="text" value={value} onChange={e => onChange(e.target.value)} className="bg-transparent text-xs font-mono text-white/70 outline-none w-full" />
    </div>
  </div>
);

export const SettingsView: React.FC = () => {
  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;700;900&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js';
    script.async = true;
    document.head.appendChild(script);

    return () => { 
      document.head.removeChild(link); 
      if (script.parentNode) document.head.removeChild(script);
    };
  }, []);

  const [ttsPriority, setTtsPriority] = useState<string[]>(['elevenlabs', 'edge', 'gemini']);
  const [template, setTemplate] = useState<TemplateSettings>({
    logoText: 'AUTOREELS',
    logoColor: '#00f2ff',
    logoTop: 100,
    logoLeft: 0,
    logoAnim: 'slide-down',
    logoSize: DEFAULTS.logoSize,
    hookColor: '#ffffff',
    hookAnim: 'rotate-in',
    hookSize: DEFAULTS.hookSize,
    bodyColor: 'rgba(255, 255, 255, 0.9)',
    bodyAnim: 'slide-up',
    bodySize: DEFAULTS.bodySize,
    dividerColor: '#00f2ff',
    dividerWidth: DEFAULTS.dividerWidth,
    mainTop: DEFAULTS.mainTop,
    mainLeft: DEFAULTS.mainLeft,
    contentGap: DEFAULTS.contentGap,
    tagText: 'HOT NEWS',
    tagBg: '#fff000',
    tagColor: '#000000',
    tagTop: 1600,
    tagLeft: 80,
    tagAnim: 'slide-right',
    tagSize: DEFAULTS.tagSize,
    backgroundBrightness: 0.4,
    backgroundImage: ''
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'layout' | 'style' | 'audio' | 'background'>('layout');
  
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await api.getSettings();
      if (data.tts_priority) setTtsPriority(data.tts_priority.split(','));
      if (data.video_template) {
        const dbTpl = JSON.parse(data.video_template);
        setTemplate(prev => ({ ...prev, ...dbTpl }));
      }
    } catch (error: any) {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const saveSetting = async (key: string, value: any) => {
    try {
      await api.updateSetting(key, value);
      toast.success('Settings updated');
    } catch (error: any) {
      toast.error('Failed to save');
    }
  };

  const movePriority = (index: number, direction: 'up' | 'down') => {
    const newPriority = [...ttsPriority];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newPriority.length) return;
    [newPriority[index], newPriority[targetIndex]] = [newPriority[targetIndex], newPriority[index]];
    setTtsPriority(newPriority);
  };

  const handleDragEnd = (e: any, info: any, element: string) => {
    const deltaY = info.offset.y / SCALE;
    const deltaX = info.offset.x / SCALE;

    setTemplate(prev => {
      const updated = { ...prev };
      if (element === 'logo') { updated.logoTop += deltaY; updated.logoLeft += deltaX; }
      if (element === 'main') { updated.mainTop += deltaY; updated.mainLeft += deltaX; }
      if (element === 'tag') { updated.tagTop += deltaY; updated.tagLeft += deltaX; }
      return updated;
    });
  };

  const playPreview = () => {
    if (!previewRef.current) return;
    // @ts-ignore
    const gsap = window.gsap;
    if (!gsap) {
      toast.error('GSAP is loading, please wait...');
      return;
    }

    const tl = gsap.timeline();

    const applyAnim = (selector: string, type: string, delay: number) => {
      const el = previewRef.current?.querySelector(selector);
      if (!el) return;
      gsap.set(el, { opacity: 1, x: 0, y: 0, scale: 1, rotate: 0 }); // Reset

      switch(type) {
        case 'fade': tl.from(el, { opacity: 0, duration: 1 }, delay); break;
        case 'slide-up': tl.from(el, { y: 50, opacity: 0, duration: 1 }, delay); break;
        case 'slide-down': tl.from(el, { y: -50, opacity: 0, duration: 1 }, delay); break;
        case 'slide-left': tl.from(el, { x: 50, opacity: 0, duration: 1 }, delay); break;
        case 'slide-right': tl.from(el, { x: -50, opacity: 0, duration: 1 }, delay); break;
        case 'zoom-in': tl.from(el, { scale: 0, opacity: 0, duration: 1 }, delay); break;
        case 'rotate-in': tl.from(el, { rotate: -15, scale: 0.8, opacity: 0, duration: 1.2, ease: 'back.out(1.7)' }, delay); break;
      }
    };

    tl.from('.main-stack-el', { opacity: 0, y: 30, duration: 1 }, 0.2);
    applyAnim('.logo-el', template.logoAnim, 0.4);
    applyAnim('.hook-el', template.hookAnim, 0.6);
    
    const divEl = previewRef.current.querySelector('.divider-el-inner');
    if (divEl) {
      tl.fromTo(divEl, { opacity: 0, width: 0 }, { opacity: 1, width: (template.dividerWidth || DEFAULTS.dividerWidth) * SCALE, duration: 0.8 }, 1.0);
    }

    applyAnim('.body-el', template.bodyAnim, 1.4);
    applyAnim('.tag-el', template.tagAnim, 1.6);
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
      <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
      <p className="text-slate-400 font-medium">Syncing studio...</p>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-10 max-w-7xl mx-auto pb-24 px-4">
      <header className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-5xl font-black tracking-tighter text-white">STUDIO <span className="text-blue-500">ENGINE</span></h1>
          <p className="text-slate-400 font-medium">Design, Animate and Automate your video production</p>
        </div>
        <div className="flex items-center gap-4 bg-white/5 p-1.5 rounded-2xl border border-white/5">
           <TabBtn active={activeTab === 'layout'} onClick={() => setActiveTab('layout')} icon={<Move className="w-4 h-4"/>} label="Layout"/>
           <TabBtn active={activeTab === 'style'} onClick={() => setActiveTab('style')} icon={<Palette className="w-4 h-4"/>} label="Style"/>
           <TabBtn active={activeTab === 'background'} onClick={() => setActiveTab('background')} icon={<ImageIcon className="w-4 h-4"/>} label="Background"/>
           <TabBtn active={activeTab === 'audio'} onClick={() => setActiveTab('audio')} icon={<Volume2 className="w-4 h-4"/>} label="Voice"/>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        
        {/* Editor Controls */}
        <div className="xl:col-span-8">
          <AnimatePresence mode="wait">
            {activeTab === 'background' && (
              <motion.div key="background" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-8">
                <div className="glass rounded-[48px] border border-white/5 p-10">
                  <div className="flex items-center justify-between mb-10">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-blue-500/10 text-blue-400 rounded-2xl border border-blue-500/20">
                        <ImageIcon className="w-6 h-6" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-black text-white tracking-tight">Background Studio</h2>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Atmosphere and Visual Depth</p>
                      </div>
                    </div>
                    <button onClick={() => saveSetting('video_template', template)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-black px-8 py-4 rounded-3xl transition-all shadow-lg shadow-blue-500/20 active:scale-95">
                      <Save className="w-5 h-5" /> SAVE BACKGROUND
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="space-y-8">
                       <div className="space-y-4">
                          <label className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">Brightness Control</label>
                          <div className="bg-slate-900/50 p-8 rounded-[32px] border border-white/5">
                             <div className="flex justify-between mb-4">
                               <span className="text-sm font-bold text-white">Overlay Opacity</span>
                               <span className="text-sm font-mono text-blue-400">{Math.round(template.backgroundBrightness * 100)}%</span>
                             </div>
                             <input 
                               type="range" 
                               min="0" max="1" step="0.05" 
                               value={template.backgroundBrightness} 
                               onChange={e => setTemplate({...template, backgroundBrightness: parseFloat(e.target.value)})}
                               className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                             />
                          </div>
                       </div>
                    </div>

                    <div className="space-y-6">
                      <label className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">Upload Wallpaper</label>
                      <div className="relative group cursor-pointer">
                        <input 
                          type="file" 
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              toast.loading('Uploading to cloud...', { id: 'upload' });
                              try {
                                const res = await api.uploadBackground(file);
                                setTemplate({ ...template, backgroundImage: res.url });
                                toast.success('Wallpaper updated!', { id: 'upload' });
                              } catch (err) {
                                toast.error('Upload failed', { id: 'upload' });
                              }
                            }
                          }}
                          className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer"
                        />
                        <div className="aspect-video rounded-[32px] border-2 border-dashed border-white/10 group-hover:border-blue-500/50 bg-slate-900/50 flex flex-col items-center justify-center gap-4 transition-all overflow-hidden">
                           {template.backgroundImage ? (
                             <img src={template.backgroundImage} className="w-full h-full object-cover" alt="Preview" />
                           ) : (
                             <>
                               <div className="p-4 bg-white/5 rounded-2xl text-slate-400"><ImageIcon className="w-8 h-8" /></div>
                               <span className="text-sm font-bold text-slate-500">Drop your 4K image here</span>
                             </>
                           )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'layout' && (
              <motion.div key="layout" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-8">
                <div className="glass rounded-[48px] border border-white/5 p-10">
                  <div className="flex items-center justify-between mb-10">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-blue-500/10 text-blue-400 rounded-2xl border border-blue-500/20">
                        <Move className="w-6 h-6" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-black text-white tracking-tight">Stack Architecture</h2>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Drag the main block to position elements</p>
                      </div>
                    </div>
                    <button
                      onClick={() => saveSetting('video_template', template)}
                      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-black px-8 py-4 rounded-3xl transition-all active:scale-95"
                    >
                      <Save className="w-5 h-5" /> APPLY CHANGES
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <AnimGroup label="Brand Logo" value={template.logoAnim} onChange={v => setTemplate({...template, logoAnim: v})} />
                    <AnimGroup label="Viral Hook" value={template.hookAnim} onChange={v => setTemplate({...template, hookAnim: v})} />
                    <AnimGroup label="Body Text" value={template.bodyAnim} onChange={v => setTemplate({...template, bodyAnim: v})} />
                    <AnimGroup label="Breaking Tag" value={template.tagAnim} onChange={v => setTemplate({...template, tagAnim: v})} />
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'style' && (
              <motion.div key="style" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-8">
                <div className="glass rounded-[48px] border border-white/5 p-10">
                  <div className="flex items-center justify-between mb-10">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-green-500/10 text-green-400 rounded-2xl border border-green-500/20">
                        <Palette className="w-6 h-6" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-black text-white tracking-tight">Visual Identity</h2>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Colors, Sizes and Spacing</p>
                      </div>
                    </div>
                    <button onClick={() => saveSetting('video_template', template)} className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white font-black px-8 py-4 rounded-3xl transition-all active:scale-95">
                      <Save className="w-5 h-5" /> SAVE STYLES
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="space-y-10">
                      <div className="space-y-6">
                        <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">Texts</h3>
                        <div className="space-y-4">
                          <input type="text" value={template.logoText} onChange={e => setTemplate({...template, logoText: e.target.value})} placeholder="LOGO TEXT" className="w-full bg-slate-900/50 border border-white/5 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:border-green-500/50" />
                          <input type="text" value={template.tagText} onChange={e => setTemplate({...template, tagText: e.target.value})} placeholder="TAG TEXT" className="w-full bg-slate-900/50 border border-white/5 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:border-green-500/50" />
                        </div>
                      </div>

                      <div className="space-y-6">
                         <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">Typography & Spacing</h3>
                         <div className="space-y-6 bg-slate-900/30 p-6 rounded-[32px] border border-white/5">
                            <SizeSlider label="Content Spacing" value={template.contentGap} min={0} max={200} onChange={v => setTemplate({...template, contentGap: v})} />
                            <SizeSlider label="Hook Size" value={template.hookSize} min={40} max={400} onChange={v => setTemplate({...template, hookSize: v})} />
                            <SizeSlider label="Body Size" value={template.bodySize} min={20} max={200} onChange={v => setTemplate({...template, bodySize: v})} />
                            <SizeSlider label="Divider Width" value={template.dividerWidth} min={50} max={1000} onChange={v => setTemplate({...template, dividerWidth: v})} />
                            <SizeSlider label="Logo Size" value={template.logoSize} min={20} max={300} onChange={v => setTemplate({...template, logoSize: v})} />
                         </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 h-fit">
                       <ColorInput label="LOGO" value={template.logoColor} onChange={val => setTemplate({...template, logoColor: val})} />
                       <ColorInput label="ACCENT" value={template.dividerColor} onChange={val => setTemplate({...template, dividerColor: val})} />
                       <ColorInput label="TAG BG" value={template.tagBg} onChange={val => setTemplate({...template, tagBg: val})} />
                       <ColorInput label="TAG TEXT" value={template.tagColor} onChange={val => setTemplate({...template, tagColor: val})} />
                       <ColorInput label="HOOK" value={template.hookColor} onChange={val => setTemplate({...template, hookColor: val})} />
                       <ColorInput label="BODY" value={template.bodyColor} onChange={val => setTemplate({...template, bodyColor: val})} />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'audio' && (
              <motion.div key="audio" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-8">
                 <div className="glass rounded-[48px] border border-white/5 p-10">
                    <div className="flex items-center justify-between mb-10">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-purple-500/10 text-purple-400 rounded-2xl border border-purple-500/20">
                          <Volume2 className="w-6 h-6" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-black text-white tracking-tight">Voice Over Engine</h2>
                          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Configure TTS Priority</p>
                        </div>
                      </div>
                      <button onClick={() => saveSetting('tts_priority', ttsPriority.join(','))} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-black px-8 py-4 rounded-3xl transition-all active:scale-95">
                        <Save className="w-5 h-5" /> SAVE PRIORITY
                      </button>
                    </div>

                    <div className="space-y-4">
                      {ttsPriority.map((provider, index) => (
                        <div key={provider} className="flex items-center justify-between p-6 bg-slate-900/50 border border-white/5 rounded-[32px] group">
                          <div className="flex items-center gap-5">
                            <span className="text-2xl font-black text-white/10">{index + 1}</span>
                            <span className="text-lg font-bold text-white capitalize">{provider}</span>
                          </div>
                          <div className="flex gap-2">
                             <button onClick={() => movePriority(index, 'up')} disabled={index === 0} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-white disabled:opacity-0 transition-all"><ArrowUp className="w-5 h-5"/></button>
                             <button onClick={() => movePriority(index, 'down')} disabled={index === ttsPriority.length - 1} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-white disabled:opacity-0 transition-all"><ArrowDown className="w-5 h-5"/></button>
                          </div>
                        </div>
                      ))}
                    </div>
                 </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Column: Visual Preview & Editor */}
        <div className="xl:col-span-4 sticky top-8">
          <div className="flex flex-col items-center">
            <div className="w-full flex items-center justify-between mb-6 px-6 py-3 bg-white/5 rounded-full border border-white/5">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                <span className="text-[10px] font-black uppercase tracking-tighter text-slate-400">Production Studio Preview</span>
              </div>
              <button 
                onClick={playPreview}
                className="flex items-center gap-2 px-3 py-1 bg-blue-500/20 hover:bg-blue-500 text-blue-400 hover:text-white rounded-full transition-all text-[10px] font-black uppercase"
              >
                <Sparkles className="w-3 h-3" /> Play
              </button>
            </div>
            
            <div 
              ref={previewRef}
              className="relative w-[320px] aspect-[9/16] rounded-[3.5rem] border-[10px] border-slate-900 shadow-2xl shadow-black overflow-hidden bg-black select-none"
            >
               {/* BG Layer */}
               <div className="absolute inset-0">
                  {template.backgroundImage ? (
                    <img src={template.backgroundImage} className="w-full h-full object-cover" style={{ filter: `brightness(${template.backgroundBrightness})` }} alt="" />
                  ) : (
                    <div className="w-full h-full bg-slate-900 flex items-center justify-center text-white/5"><ImageIcon className="w-16 h-16" /></div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80"></div>
               </div>

               {/* Draggable Elements */}
               <div className="absolute inset-0 z-10 pointer-events-none">
                  {/* Logo */}
                  <motion.div 
                    drag 
                    dragMomentum={false} 
                    dragSnapToOrigin={true}
                    onDragEnd={(e, info) => handleDragEnd(e, info, 'logo')}
                    className="absolute pointer-events-auto cursor-move group logo-el"
                    style={{ top: (template.logoTop || 0) * SCALE, left: (template.logoLeft || 0) * SCALE }}
                  >
                    <div className="border-2 border-transparent group-hover:border-blue-500/50 rounded-lg">
                      <span className="font-black tracking-[6px] text-center uppercase" style={{ fontFamily: 'Anton', color: template.logoColor, fontSize: (template.logoSize || DEFAULTS.logoSize) * SCALE, textShadow: `0 0 20px ${template.logoColor}66` }}>{template.logoText || 'LOGO'}</span>
                    </div>
                  </motion.div>

                  {/* MAIN STACK GROUP */}
                  <motion.div 
                    drag 
                    dragMomentum={false} 
                    dragSnapToOrigin={true}
                    onDragEnd={(e, info) => handleDragEnd(e, info, 'main')}
                    className="absolute pointer-events-auto cursor-move group main-stack-el"
                    style={{ top: (template.mainTop || DEFAULTS.mainTop) * SCALE, left: (template.mainLeft || DEFAULTS.mainLeft) * SCALE, width: 920 * SCALE }}
                  >
                    <div className="border-2 border-transparent group-hover:border-blue-500/50 rounded-lg flex flex-col" style={{ gap: (template.contentGap || DEFAULTS.contentGap) * SCALE }}>
                       <h3 className="font-black uppercase tracking-tight hook-el" style={{ fontFamily: 'Anton', color: template.hookColor, fontSize: (template.hookSize || DEFAULTS.hookSize) * SCALE, lineHeight: 1.15 }}>THE FUTURE OF VIDEO</h3>
                       
                       <div className="h-1.5 rounded-full divider-el-inner" style={{ width: (template.dividerWidth || DEFAULTS.dividerWidth) * SCALE, backgroundColor: template.dividerColor }}></div>

                       <p className="font-medium body-el" style={{ color: template.bodyColor, fontSize: (template.bodySize || DEFAULTS.bodySize) * SCALE, lineHeight: 1.5 }}>Your automated content starts here. Drag me around!</p>
                    </div>
                  </motion.div>

                  {/* Tag */}
                  <motion.div 
                    drag 
                    dragMomentum={false} 
                    dragSnapToOrigin={true}
                    onDragEnd={(e, info) => handleDragEnd(e, info, 'tag')}
                    className="absolute pointer-events-auto cursor-move group tag-el"
                    style={{ top: (template.tagTop || 0) * SCALE, left: (template.tagLeft || 0) * SCALE }}
                  >
                    <div className="border-2 border-transparent group-hover:border-blue-500/50 rounded-lg">
                       <div className="inline-block px-4 py-1 rounded-sm transform skew-x-[-15deg] font-black" style={{ backgroundColor: template.tagBg, color: template.tagColor, fontSize: (template.tagSize || DEFAULTS.tagSize) * SCALE }}>{template.tagText || 'HOT NEWS'}</div>
                    </div>
                  </motion.div>
               </div>

               {/* Overlay Guide */}
               <div className="absolute inset-0 pointer-events-none border border-white/5 rounded-[3rem]"></div>
            </div>

            <p className="mt-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center px-8">Tip: Grab elements directly on the phone to move them. Changes are synced instantly to the template.</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
