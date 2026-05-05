import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, Volume2, Palette, ArrowUp, ArrowDown, Save, Image as ImageIcon, Sliders, Type, Move, Sparkles } from 'lucide-react';
import { api } from '../../services/api';
import { toast } from 'react-hot-toast';
import { AssetPicker } from '../../components/ui/AssetPicker';

interface TemplateSettings {
  logoText: string;
  logoColor: string;
  logoTop: number;
  logoLeft: number;
  logoAlign?: string;
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
  mainAlign?: string;
  contentGap: number;
  tagText: string;
  tagBg: string;
  tagColor: string;
  tagTop: number;
  tagLeft: number;
  tagAlign?: string;
  tagAnim: string;
  tagSize: number;
  backgroundBrightness: number;
  backgroundImage: string;
  cardBgColor: string;
  cardBorderColor: string;
  cardBorderTop: number;
  cardBorderBottom: number;
  cardBorderLeft: number;
  cardBorderRight: number;
  cardBorderRadius: number;
  showLogo: boolean;
  showTag: boolean;
  showDatetime: boolean;
  showCard: boolean;
  ttsPriority?: string[];
  ttsVoices?: Record<string, string>;
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

const ALIGN_PRESETS = [
  { value: 'top-left', label: 'Top Left', top: 100, left: -400 },
  { value: 'top-center', label: 'Top Center', top: 100, left: 0 },
  { value: 'top-right', label: 'Top Right', top: 100, left: 400 },
  { value: 'center-left', label: 'Center Left', top: 960, left: -400 },
  { value: 'center', label: 'Center', top: 960, left: 0 },
  { value: 'center-right', label: 'Center Right', top: 960, left: 400 },
  { value: 'bottom-left', label: 'Bottom Left', top: 1700, left: -400 },
  { value: 'bottom-center', label: 'Bottom Center', top: 1700, left: 0 },
  { value: 'bottom-right', label: 'Bottom Right', top: 1700, left: 400 },
];

const AlignmentPresets: React.FC<{ onSelect: (top: number, left: number, align: string) => void }> = ({ onSelect }) => (
  <div className="grid grid-cols-3 gap-1 bg-white/5 p-1 rounded-xl w-24 h-24 shrink-0 border border-white/5">
    {ALIGN_PRESETS.map(opt => (
      <button 
        key={opt.value} 
        onClick={() => onSelect(opt.top, opt.left, opt.value)}
        title={opt.label}
        className="w-full h-full rounded-md border bg-slate-800/40 border-white/5 hover:bg-pink-600/40 hover:border-pink-500/50 transition-all"
      />
    ))}
  </div>
);

const SizeSlider: React.FC<{ label: string, value: number, min: number, max: number, onChange: (v: number) => void }> = ({ label, value, min, max, onChange }) => (
  <div className="space-y-2">
    <div className="flex justify-between items-center px-1">
      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{label}</span>
      <span className="text-[9px] font-mono text-pink-400">{Math.round(value)}px</span>
    </div>
    <input type="range" min={min} max={max} value={value || min} onChange={e => onChange(parseInt(e.target.value))} className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-pink-500" />
  </div>
);

const AnimGroup: React.FC<{ label: string, value: string, onChange: (v: string) => void }> = ({ label, value, onChange }) => (
  <div className="space-y-2">
    <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest px-1">{label} Animation</label>
    <select value={value} onChange={e => onChange(e.target.value)} className="w-full bg-[#0f172a] border border-white/5 rounded-xl px-4 py-3 text-xs text-white font-bold outline-none focus:border-pink-500/50 appearance-none cursor-pointer">
      {ANIMATIONS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
    </select>
  </div>
);

const ColorInput: React.FC<{ label: string, value: string, onChange: (val: string) => void }> = ({ label, value, onChange }) => {
  let hex = '#ffffff';
  let alpha = 1;

  if (value.startsWith('rgba')) {
    const match = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (match) {
      const r = parseInt(match[1]);
      const g = parseInt(match[2]);
      const b = parseInt(match[3]);
      alpha = match[4] !== undefined ? parseFloat(match[4]) : 1;
      hex = '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
    }
  } else if (value.startsWith('#')) {
    hex = value.substring(0, 7);
  }

  const handleHexChange = (newHex: string) => {
    if (alpha === 1) onChange(newHex);
    else {
      const r = parseInt(newHex.slice(1, 3), 16);
      const g = parseInt(newHex.slice(3, 5), 16);
      const b = parseInt(newHex.slice(5, 7), 16);
      onChange(`rgba(${r}, ${g}, ${b}, ${alpha})`);
    }
  };

  const handleAlphaChange = (newAlpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    if (newAlpha === 1) onChange(hex);
    else onChange(`rgba(${r}, ${g}, ${b}, ${newAlpha})`);
  };

  return (
    <div className="bg-[#0f172a] p-3 rounded-xl border border-white/5 flex flex-col gap-2 hover:border-white/10 transition-all">
      <div className="flex items-center gap-3">
        <div className="relative w-8 h-8 shrink-0">
          <input type="color" value={hex} onChange={e => handleHexChange(e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
          <div className="w-full h-full rounded-md border border-white/10 shadow-inner" style={{ backgroundColor: value }}></div>
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-[8px] font-black text-slate-500 uppercase tracking-tighter">{label}</span>
          <input type="text" value={value} onChange={e => onChange(e.target.value)} className="bg-transparent text-[10px] font-mono text-white/40 outline-none w-full" />
        </div>
      </div>
      <div className="flex items-center gap-2 px-1">
         <input type="range" min="0" max="1" step="0.05" value={alpha} onChange={e => handleAlphaChange(parseFloat(e.target.value))} className="flex-1 h-0.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-pink-500" />
         <span className="text-[8px] font-mono text-pink-500 w-5 text-right">{Math.round(alpha * 100)}</span>
      </div>
    </div>
  );
};

export const SettingsView: React.FC = () => {
  const [template, setTemplate] = useState<TemplateSettings>({
    logoText: 'TDK NEWS',
    logoColor: '#ffffff',
    logoTop: 200,
    logoLeft: 0,
    logoAnim: 'fade',
    logoSize: DEFAULTS.logoSize,
    hookColor: '#ffffff',
    hookAnim: 'slide-up',
    hookSize: DEFAULTS.hookSize,
    bodyColor: '#ffffff',
    bodyAnim: 'fade',
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
    tagLeft: 0,
    tagAnim: 'slide-right',
    tagSize: DEFAULTS.tagSize,
    backgroundBrightness: 0.4,
    backgroundImage: '',
    cardBgColor: 'rgba(0,0,0,0)',
    cardBorderColor: 'rgba(255,255,255,0.1)',
    cardBorderTop: 0,
    cardBorderBottom: 0,
    cardBorderLeft: 0,
    cardBorderRight: 0,
    cardBorderRadius: 0,
    showLogo: true,
    showTag: true,
    showDatetime: true,
    showCard: true,
    ttsPriority: ['lucylab', 'ohfree', 'elevenlabs', 'edge', 'gemini'],
    ttsVoices: {}
  });

  const [showAssetPicker, setShowAssetPicker] = useState<{ active: boolean; type: 'background' | 'scene'; index?: number }>({ active: false, type: 'background' });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'layout' | 'style' | 'audio' | 'background'>('layout');
  const [editingTemplateId, setEditingTemplateId] = useState('classic');
  const [ttsPriority, setTtsPriority] = useState<string[]>(['lucylab', 'ohfree', 'elevenlabs', 'edge', 'gemini']);
  const previewRef = useRef<HTMLDivElement>(null);

  const templates = [
    { id: 'classic', name: 'Classic' },
    { id: 'modern', name: 'Modern' },
    { id: 'cinematic', name: 'Cinematic' },
    { id: 'bold', name: 'Bold' }
  ];

  useEffect(() => {
    loadSettings();
  }, [editingTemplateId]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const tplKey = `video_template_${editingTemplateId}`;
      const res = await api.getSettings() as any;
      
      const tplVal = res[tplKey];
      const globalTtsVal = res['tts_priority'];
      const defaultPriority = ['lucylab', 'ohfree', 'elevenlabs', 'edge', 'gemini'];

      let currentPriority = defaultPriority;

      if (tplVal) {
        const val = typeof tplVal === 'string' ? JSON.parse(tplVal) : tplVal;
        setTemplate(prev => ({ ...prev, ...val }));
        
        if (val.ttsPriority && Array.isArray(val.ttsPriority) && val.ttsPriority.length > 0) {
          currentPriority = val.ttsPriority;
        } else if (globalTtsVal) {
          currentPriority = globalTtsVal.split(',').map((p: string) => p.trim());
        }
      } else if (globalTtsVal) {
        currentPriority = globalTtsVal.split(',').map((p: string) => p.trim());
      }

      // Ensure all available providers are in the list
      const merged = [...currentPriority];
      defaultPriority.forEach(p => {
        if (!merged.includes(p)) merged.push(p);
      });
      
      setTtsPriority(merged);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const saveCurrentTemplate = async () => {
    const tplKey = `video_template_${editingTemplateId}`;
    try {
      await api.updateSetting(tplKey, { ...template, ttsPriority });
      toast.success(`${editingTemplateId} saved!`);
    } catch (err) {
      toast.error('Save failed');
    }
  };

  const handleDragEnd = (event: any, info: any, type: string) => {
    const { x, y } = info.offset;
    const dx = x / SCALE;
    const dy = y / SCALE;

    if (type === 'logo') {
      setTemplate(prev => ({
        ...prev,
        logoTop: (prev.logoTop || 0) + dy,
        logoLeft: (prev.logoLeft || 0) + dx
      }));
    } else if (type === 'tag') {
      setTemplate(prev => ({
        ...prev,
        tagTop: (prev.tagTop || 0) + dy,
        tagLeft: (prev.tagLeft || 0) + dx
      }));
    } else if (type === 'main') {
      setTemplate(prev => ({
        ...prev,
        mainTop: (prev.mainTop || 0) + dy,
        mainLeft: (prev.mainLeft || 0) + dx
      }));
    }
  };

  const movePriority = (index: number, direction: 'up' | 'down') => {
    const newPriority = [...ttsPriority];
    if (direction === 'up' && index > 0) {
      [newPriority[index], newPriority[index - 1]] = [newPriority[index - 1], newPriority[index]];
    } else if (direction === 'down' && index < newPriority.length - 1) {
      [newPriority[index], newPriority[index + 1]] = [newPriority[index + 1], newPriority[index]];
    }
    setTtsPriority(newPriority);
  };

  const playPreview = () => {
    const items = ['.logo-el', '.hook-el', '.body-el', '.tag-el', '.divider-el-inner'];
    items.forEach(selector => {
      const el = previewRef.current?.querySelector(selector);
      if (el) {
        el.animate([{ opacity: 0, transform: 'translateY(20px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 600, easing: 'ease-out' });
      }
    });
  };

  if (loading) return (
    <div className="w-full h-full flex items-center justify-center bg-[#020617]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-pink-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Initialising Studio...</span>
      </div>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col w-full h-full bg-[#020617] text-slate-300 overflow-hidden">
      {/* Header Bar */}
      <header className="h-14 border-b border-white/5 flex items-center justify-between px-6 bg-[#0f172a]/60 backdrop-blur-xl z-50 shrink-0">
        <div className="flex items-center gap-5">
          <div className="flex flex-col">
            <h1 className="text-lg font-black tracking-tighter text-white leading-none">STUDIO <span className="text-pink-500">ENGINE</span></h1>
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Creative Suite</span>
          </div>
          <div className="h-6 w-[1px] bg-white/10 hidden md:block"></div>
          <div className="hidden lg:flex items-center gap-1 bg-white/5 p-1 rounded-lg">
             {templates.map(tpl => (
               <button key={tpl.id} onClick={() => setEditingTemplateId(tpl.id)} className={`px-3 py-1 rounded-md text-[9px] font-black uppercase transition-all ${editingTemplateId === tpl.id ? 'bg-pink-600 text-white shadow-lg shadow-pink-500/20' : 'text-slate-500 hover:text-slate-300'}`}>{tpl.name}</button>
             ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg">
             {[
               { id: 'layout', label: 'Layout', icon: <Move className="w-3 h-3"/> },
               { id: 'style', label: 'Style', icon: <Palette className="w-3 h-3"/> },
               { id: 'background', label: 'BG', icon: <ImageIcon className="w-3 h-3"/> },
               { id: 'audio', label: 'Audio', icon: <Volume2 className="w-3 h-3"/> }
             ].map(tab => (
               <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-2 px-3 py-1 rounded-md text-[9px] font-black uppercase transition-all ${activeTab === tab.id ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'}`}>{tab.icon} <span className="hidden sm:inline">{tab.label}</span></button>
             ))}
          </div>
          <button onClick={saveCurrentTemplate} className="bg-pink-600 hover:bg-pink-500 text-white text-[9px] font-black uppercase px-5 py-2 rounded-lg transition-all flex items-center gap-2 shadow-lg shadow-pink-500/10"><Save className="w-3 h-3" /> <span className="hidden sm:inline">Save Changes</span></button>
        </div>
      </header>

      <main className="flex-1 flex flex-col xl:flex-row overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 md:p-8 border-r border-white/5 bg-[#020617] custom-scrollbar">
          <div className="w-full pb-20">
            <AnimatePresence mode="wait">
              {activeTab === 'style' && (
                <motion.div key="style" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-[#1e293b]/10 border border-white/5 rounded-2xl p-6 space-y-6">
                       <div className="flex items-center gap-2 mb-2"><Type className="w-3.5 h-3.5 text-pink-500"/><h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Brand Identity</h3></div>
                       <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-1"><span className="text-[8px] font-bold text-slate-600 uppercase ml-1">Logo Text</span><input type="text" value={template.logoText} onChange={e => setTemplate({...template, logoText: e.target.value})} className="w-full bg-[#0f172a] border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white font-bold outline-none focus:border-pink-500/50" /></div>
                             <div className="space-y-1"><span className="text-[8px] font-bold text-slate-600 uppercase ml-1">Badge Text</span><input type="text" value={template.tagText} onChange={e => setTemplate({...template, tagText: e.target.value})} className="w-full bg-[#0f172a] border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white font-bold outline-none focus:border-pink-500/50" /></div>
                          </div>
                          <div className="grid grid-cols-2 gap-4"><ColorInput label="Logo" value={template.logoColor} onChange={val => setTemplate({...template, logoColor: val})} /><ColorInput label="Accent" value={template.dividerColor} onChange={val => setTemplate({...template, dividerColor: val})} /></div>
                          <div className="grid grid-cols-2 gap-4"><ColorInput label="Badge BG" value={template.tagBg} onChange={val => setTemplate({...template, tagBg: val})} /><ColorInput label="Badge Text" value={template.tagColor} onChange={val => setTemplate({...template, tagColor: val})} /></div>
                       </div>
                    </div>

                    <div className="bg-[#1e293b]/10 border border-white/5 rounded-2xl p-6 space-y-6">
                       <div className="flex items-center gap-2 mb-2"><Sparkles className="w-3.5 h-3.5 text-pink-500"/><h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Typography</h3></div>
                       <div className="space-y-6">
                          <div className="grid grid-cols-2 gap-4"><ColorInput label="Hook Color" value={template.hookColor} onChange={val => setTemplate({...template, hookColor: val})} /><ColorInput label="Body Color" value={template.bodyColor} onChange={val => setTemplate({...template, bodyColor: val})} /></div>
                          <div className="space-y-5"><SizeSlider label="Hook Size" value={template.hookSize} min={40} max={400} onChange={v => setTemplate({...template, hookSize: v})} /><SizeSlider label="Body Size" value={template.bodySize} min={20} max={200} onChange={v => setTemplate({...template, bodySize: v})} /><SizeSlider label="Logo Size" value={template.logoSize} min={20} max={300} onChange={v => setTemplate({...template, logoSize: v})} /></div>
                       </div>
                    </div>
                  </div>

                  <div className="bg-[#1e293b]/10 border border-white/5 rounded-2xl p-6 space-y-6">
                    <div className="flex items-center gap-2 mb-2"><Sliders className="w-3.5 h-3.5 text-pink-500"/><h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Container & Frame</h3></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                       <div className="space-y-4"><ColorInput label="Card BG" value={template.cardBgColor} onChange={val => setTemplate({...template, cardBgColor: val})} /><ColorInput label="Border" value={template.cardBorderColor} onChange={val => setTemplate({...template, cardBorderColor: val})} /></div>
                       <div className="space-y-6 lg:col-span-2"><SizeSlider label="Corner Radius" value={template.cardBorderRadius} min={0} max={200} onChange={v => setTemplate({...template, cardBorderRadius: v})} /><SizeSlider label="Content Gap" value={template.contentGap} min={0} max={200} onChange={v => setTemplate({...template, contentGap: v})} /></div>
                       <div className="grid grid-cols-2 gap-3">
                          {[{ id: 'cardBorderTop', label: 'Top' }, { id: 'cardBorderBottom', label: 'Bot' }, { id: 'cardBorderLeft', label: 'Left' }, { id: 'cardBorderRight', label: 'Right' }].map(b => (
                            <div key={b.id} className="bg-[#0f172a] p-3 rounded-xl border border-white/5 flex flex-col items-center justify-center">
                               <span className="text-[8px] font-black text-slate-500 uppercase mb-1">{b.label}</span>
                               <input type="number" value={(template as any)[b.id]} onChange={e => setTemplate({...template, [b.id]: parseInt(e.target.value)})} className="w-full bg-transparent text-xs text-white font-mono text-center outline-none" />
                            </div>
                          ))}
                       </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'layout' && (
                <motion.div key="layout" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                  <div className="bg-[#1e293b]/10 border border-white/5 rounded-2xl p-8 space-y-12">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <AnimGroup label="Brand Logo" value={template.logoAnim} onChange={v => setTemplate({...template, logoAnim: v})} />
                      <AnimGroup label="Viral Hook" value={template.hookAnim} onChange={v => setTemplate({...template, hookAnim: v})} />
                      <AnimGroup label="Body Text" value={template.bodyAnim} onChange={v => setTemplate({...template, bodyAnim: v})} />
                      <AnimGroup label="Breaking Tag" value={template.tagAnim} onChange={v => setTemplate({...template, tagAnim: v})} />
                    </div>

                    <div className="pt-10 border-t border-white/5 space-y-12">
                      <div className="flex flex-col md:flex-row gap-8 items-start">
                        <div className="space-y-2 shrink-0">
                          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Logo Snap Presets</h3>
                          <AlignmentPresets onSelect={(top, left, align) => setTemplate({...template, logoTop: top, logoLeft: left, logoAlign: align})} />
                        </div>
                        <div className="flex-1 w-full space-y-8">
                           <SizeSlider label="Top Position" value={template.logoTop} min={0} max={1920} onChange={v => setTemplate({...template, logoTop: v})} />
                           <SizeSlider label="Horizontal Offset" value={template.logoLeft} min={-540} max={540} onChange={v => setTemplate({...template, logoLeft: v})} />
                        </div>
                      </div>

                      <div className="flex flex-col md:flex-row gap-8 items-start pt-10 border-t border-white/5">
                        <div className="space-y-2 shrink-0">
                          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Content Snap Presets</h3>
                          <AlignmentPresets onSelect={(top, left, align) => setTemplate({...template, mainTop: top, mainLeft: 80, mainAlign: align})} />
                        </div>
                        <div className="flex-1 w-full space-y-8">
                           <SizeSlider label="Top Position" value={template.mainTop} min={0} max={1920} onChange={v => setTemplate({...template, mainTop: v})} />
                           <SizeSlider label="Side Padding" value={template.mainLeft} min={0} max={400} onChange={v => setTemplate({...template, mainLeft: v})} />
                        </div>
                      </div>

                      <div className="flex flex-col md:flex-row gap-8 items-start pt-10 border-t border-white/5">
                        <div className="space-y-2 shrink-0">
                          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Badge Snap Presets</h3>
                          <AlignmentPresets onSelect={(top, left, align) => setTemplate({...template, tagTop: top, tagLeft: left, tagAlign: align})} />
                        </div>
                        <div className="flex-1 w-full space-y-8">
                           <SizeSlider label="Top Position" value={template.tagTop} min={0} max={1920} onChange={v => setTemplate({...template, tagTop: v})} />
                           <SizeSlider label="Horizontal Offset" value={template.tagLeft} min={-540} max={540} onChange={v => setTemplate({...template, tagLeft: v})} />
                        </div>
                      </div>
                    </div>

                    <div className="pt-10 border-t border-white/5">
                      <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6">Visibility Controls</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                         {[{ id: 'showLogo', label: 'Logo', icon: <Type className="w-3.5 h-3.5"/> }, { id: 'showTag', label: 'Badge', icon: <Sparkles className="w-3.5 h-3.5"/> }, { id: 'showDatetime', label: 'Datetime', icon: <Save className="w-3.5 h-3.5"/> }, { id: 'showCard', label: 'Content', icon: <Sliders className="w-3.5 h-3.5"/> }].map(item => (
                           <button key={item.id} onClick={() => setTemplate({ ...template, [item.id]: !((template as any)[item.id]) })} className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${((template as any)[item.id]) ? 'bg-pink-600/10 border-pink-500 text-white' : 'bg-white/5 border-white/5 text-slate-500'}`}><div className="flex items-center gap-2">{item.icon}<span className="text-[10px] font-bold uppercase">{item.label}</span></div><div className={`w-6 h-3 rounded-full relative transition-all ${((template as any)[item.id]) ? 'bg-pink-500' : 'bg-slate-700'}`}><div className={`absolute top-0.5 w-2 h-2 bg-white rounded-full transition-all ${((template as any)[item.id]) ? 'right-0.5' : 'left-0.5'}`}></div></div></button>
                         ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'background' && (
                <motion.div key="background" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                   <div className="bg-[#1e293b]/10 border border-white/5 rounded-2xl p-8 space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        <div className="space-y-4">
                           <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Overlay Opacity</label>
                           <div className="bg-[#0f172a] p-6 rounded-2xl border border-white/5">
                              <div className="flex justify-between mb-4"><span className="text-[10px] font-bold text-white">Brightness</span><span className="text-xs font-mono text-pink-400">{Math.round(template.backgroundBrightness * 100)}%</span></div>
                              <input type="range" min="0" max="1" step="0.05" value={template.backgroundBrightness} onChange={e => setTemplate({...template, backgroundBrightness: parseFloat(e.target.value)})} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-pink-500" />
                           </div>
                        </div>
                        <div className="space-y-4">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Wallpaper Asset</label>
                          <button 
                            onClick={() => setShowAssetPicker({ active: true, type: 'background' })}
                            className="w-full h-32 rounded-2xl border border-dashed border-white/10 hover:border-pink-500/50 bg-[#0f172a] flex flex-col items-center justify-center gap-3 transition-all overflow-hidden relative group"
                          >
                             {template.backgroundImage ? (
                               <>
                                 <img src={template.backgroundImage} className="w-full h-full object-cover" alt="Preview" />
                                 <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                                   <span className="text-[10px] font-black text-white uppercase bg-pink-600 px-4 py-2 rounded-xl">Change Image</span>
                                 </div>
                               </>
                             ) : (
                               <>
                                 <ImageIcon className="w-6 h-6 text-slate-600" />
                                 <span className="text-[10px] font-bold text-slate-600 uppercase">Select Asset</span>
                               </>
                             )}
                          </button>
                        </div>
                      </div>
                   </div>
                </motion.div>
              )}

              {activeTab === 'audio' && (
                <motion.div key="audio" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                   <div className="bg-[#1e293b]/10 border border-white/5 rounded-2xl p-6">
                      <div className="flex items-center gap-2 mb-6"><Volume2 className="w-3.5 h-3.5 text-pink-500"/><h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">TTS Provider Priority</h3></div>
                      <p className="text-[10px] text-slate-500 mb-6 px-1 italic">Drag or use arrows to set the order of Text-to-Speech providers. The system will try the top provider first.</p>
                      <div className="space-y-3">
                        {ttsPriority.map((provider, index) => (
                          <div key={provider} className="flex items-center justify-between p-4 bg-[#0f172a] border border-white/5 rounded-2xl group">
                            <div className="flex items-center gap-4"><span className="text-lg font-black text-white/5 italic">{index + 1}</span><span className="text-sm font-bold text-slate-300 capitalize tracking-tight">{provider}</span></div>
                            <div className="flex gap-2"><button onClick={() => movePriority(index, 'up')} disabled={index === 0} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white disabled:opacity-0 transition-all"><ArrowUp className="w-4 h-4"/></button><button onClick={() => movePriority(index, 'down')} disabled={index === ttsPriority.length - 1} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white disabled:opacity-0 transition-all"><ArrowDown className="w-4 h-4"/></button></div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-[#1e293b]/10 border border-white/5 rounded-2xl p-6">
                      <div className="flex items-center gap-2 mb-6"><Type className="w-3.5 h-3.5 text-pink-500"/><h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Voice ID Overrides</h3></div>
                      <p className="text-[10px] text-slate-500 mb-6 px-1 italic">Leave blank to use default values from system configuration (.env).</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {ttsPriority.map(provider => (
                          <div key={provider} className="space-y-1">
                            <span className="text-[8px] font-bold text-slate-600 uppercase ml-1">{provider} Voice ID</span>
                            <input 
                              type="text" 
                              placeholder="System Default"
                              value={template.ttsVoices?.[provider] || ''} 
                              onChange={e => setTemplate({
                                ...template, 
                                ttsVoices: { ...(template.ttsVoices || {}), [provider]: e.target.value }
                              })} 
                              className="w-full bg-[#0f172a] border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white font-bold outline-none focus:border-pink-500/50 placeholder:text-slate-700" 
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                 </motion.div>
               )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right Sidebar: Mobile Preview */}
        <div className="w-full xl:w-[480px] border-l border-white/5 bg-[#0f172a]/20 flex flex-col items-center justify-center p-8 shrink-0 z-40 overflow-hidden">
          <div className="w-full max-w-[320px] flex items-center justify-between mb-6 px-5 py-3 bg-white/5 rounded-2xl border border-white/5">
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-pink-500 animate-pulse"></div><span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Live Preview</span></div>
            <button onClick={playPreview} className="text-[10px] font-black uppercase text-pink-400 hover:text-white transition-all flex items-center gap-2"><Sparkles className="w-4 h-4" /> Play Anim</button>
          </div>
          
          <div className="relative group shrink-0">
            <div className="absolute -inset-1 bg-gradient-to-b from-pink-600/10 to-rose-600/10 rounded-[3rem] blur-2xl opacity-20"></div>
            <div ref={previewRef} className="relative w-[300px] aspect-[9/16] rounded-[3rem] border-[8px] border-[#1e293b] shadow-2xl overflow-hidden bg-black select-none">
               <div className="absolute inset-0">
                  <AnimatePresence mode="popLayout">
                    {template.backgroundImage ? (
                      <motion.img 
                        key={template.backgroundImage}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.8, ease: "easeInOut" }}
                        src={template.backgroundImage} 
                        className="absolute inset-0 w-full h-full object-cover" 
                        style={{ filter: `brightness(${template.backgroundBrightness})` }} 
                        alt="" 
                      />
                    ) : (
                      <motion.div 
                        key="default-bg"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 w-full h-full bg-slate-900 flex items-center justify-center text-white/5"
                      >
                        <ImageIcon className="w-12 h-12" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/80 z-0"></div>
               </div>

                <div className="absolute inset-0 z-10 pointer-events-none">
                   {template.showLogo !== false && (
                     <div className="absolute pointer-events-none flex justify-center" style={{ top: template.logoTop * SCALE, left: 0, right: 0, marginLeft: template.logoLeft * SCALE }}>
                       <motion.div 
                         drag dragMomentum={false} dragSnapToOrigin={true} onDragEnd={(e, info) => handleDragEnd(e, info, 'logo')} 
                         className="pointer-events-auto cursor-move group logo-el" 
                       >
                         <div className="border border-transparent group-hover:border-pink-500/50 rounded-lg px-2 text-center">
                           <span className="font-black text-center uppercase whitespace-nowrap block" style={{ fontFamily: 'Anton', color: template.logoColor, fontSize: (template.logoSize || DEFAULTS.logoSize) * SCALE, textShadow: `0 0 20px ${template.logoColor}66`, letterSpacing: 4 * SCALE }}>{template.logoText || 'LOGO'}</span>
                         </div>
                       </motion.div>
                     </div>
                   )}
                   {template.showCard !== false && (
                     <div className="absolute pointer-events-none" style={{ top: template.mainTop * SCALE, left: 0, width: '100%', padding: `0 ${Math.max(0, template.mainLeft * SCALE)}px` }}>
                       <motion.div 
                         drag="y" dragMomentum={false} dragSnapToOrigin={true} onDragEnd={(e, info) => handleDragEnd(e, info, 'main')} 
                         className="pointer-events-auto cursor-move group main-stack-el w-full" 
                       >
                         <div className="border border-transparent group-hover:border-pink-500/50 flex flex-col p-4 transition-all" style={{ gap: (template.contentGap || DEFAULTS.contentGap) * SCALE, backgroundColor: template.cardBgColor, borderTop: `${template.cardBorderTop * SCALE}px solid ${template.cardBorderColor}`, borderBottom: `${template.cardBorderBottom * SCALE}px solid ${template.cardBorderColor}`, borderLeft: `${template.cardBorderLeft * SCALE}px solid ${template.cardBorderColor}`, borderRight: `${template.cardBorderRight * SCALE}px solid ${template.cardBorderColor}`, borderRadius: (template.cardBorderRadius || 0) * SCALE }}>
                           <h3 className="font-black uppercase tracking-tight hook-el" style={{ fontFamily: 'Anton', color: template.hookColor, fontSize: (template.hookSize || DEFAULTS.hookSize) * SCALE, lineHeight: 1.15 }}>THE FUTURE OF VIDEO</h3>
                           <div className="h-1 rounded-full divider-el-inner" style={{ width: (template.dividerWidth || DEFAULTS.dividerWidth) * SCALE, backgroundColor: template.dividerColor }}></div>
                           <p className="font-medium body-el" style={{ color: template.bodyColor, fontSize: (template.bodySize || DEFAULTS.bodySize) * SCALE, lineHeight: 1.5 }}>Your automated content starts here. Drag me around!</p>
                         </div>
                       </motion.div>
                     </div>
                   )}
                   <div className="absolute inset-0 pointer-events-none">
                      {template.showTag !== false && (
                        <div className="absolute pointer-events-none flex justify-center" style={{ top: template.tagTop * SCALE, left: 0, right: 0, marginLeft: template.tagLeft * SCALE }}>
                          <motion.div 
                            drag dragMomentum={false} dragSnapToOrigin={true} onDragEnd={(e, info) => handleDragEnd(e, info, 'tag')} 
                            className="pointer-events-auto cursor-move group tag-el" 
                          >
                            <div className="border border-transparent group-hover:border-pink-500/50 rounded-lg px-2">
                              <div className="inline-block px-3 py-1 rounded-sm transform skew-x-[-15deg] font-black whitespace-nowrap" style={{ backgroundColor: template.tagBg, color: template.tagColor, fontSize: (template.tagSize || DEFAULTS.tagSize) * SCALE }}>{template.tagText || 'HOT NEWS'}</div>
                            </div>
                          </motion.div>
                        </div>
                      )}
                      {template.showDatetime !== false && (
                        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-[9px] font-bold text-white/30 uppercase tracking-widest whitespace-nowrap">MAY 05, 2026</div>
                      )}
                   </div>
                </div>
            </div>
          </div>
          <p className="mt-6 text-[9px] font-bold text-slate-700 uppercase tracking-[0.2em] text-center px-12 opacity-40 italic">Precision Studio Engine</p>
        </div>
      </main>

      <AnimatePresence>
        {showAssetPicker.active && (
          <AssetPicker 
            onSelect={(url) => {
              setTemplate({ ...template, backgroundImage: url });
              setShowAssetPicker({ active: false, type: 'background' });
            }}
            onClose={() => setShowAssetPicker({ active: false, type: 'background' })}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};
