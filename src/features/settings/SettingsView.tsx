import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, Volume2, Palette, ArrowUp, ArrowDown, Save, Image as ImageIcon, Sliders, Type, Move, Sparkles, Zap, Film, Dna, Layout as LayoutIcon, Maximize, Smartphone, Layers, Box, Cpu, Filter, Wand2 } from 'lucide-react';
import { api } from '../../services/api';
import { cn } from '../../utils/cn';
import { toast } from 'react-hot-toast';
import { AssetPicker } from '../../components/ui/AssetPicker';
import { LivePreview } from '../../components/ui/generate-video/LivePreview';

interface TemplateSettings {
  logoText: string;
  logoColor: string;
  logoTop: number; // %
  logoLeft: number; // %
  logoAlign: 'left' | 'center' | 'right';
  logoPlacement: 'top' | 'center' | 'bottom';
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
  mainTop: number; // %
  mainLeft: number; // %
  mainAlign: 'left' | 'center' | 'right';
  mainPlacement: 'top' | 'center' | 'bottom';
  contentGap: number;
  tagText: string;
  tagBg: string;
  tagColor: string;
  tagTop: number; // %
  tagLeft: number; // %
  tagAlign: 'left' | 'center' | 'right';
  tagPlacement: 'top' | 'center' | 'bottom';
  tagAnim: string;
  tagSize: number;
  backgroundBrightness: number;
  backgroundImage: string;
  bgGradientStart?: string;
  bgGradientEnd?: string;
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
  accentColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  lineHeight?: number;
  showProgressBar?: boolean;
  ttsPriority?: string[];
  ttsVoices?: Record<string, string>;
  // Advanced options
  autoMatchMood?: boolean;
  transitionStyle?: 'crossfade' | 'slide' | 'zoom';
  stripHashtags?: boolean;
  aiEnhanceText?: boolean;
  logoImage?: string;
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

const SCALE = 300 / 1080;

const DEFAULTS = {
  logoSize: 48,
  hookSize: 96,
  bodySize: 44,
  tagSize: 28,
  dividerWidth: 160,
  logoTop: 10,
  mainTop: 0,
  mainLeft: 0,
  contentGap: 40
};

const SizeSlider: React.FC<{ label: string, value: number, min: number, max: number, isPercent?: boolean, onChange: (v: number) => void }> = ({ label, value, min, max, isPercent, onChange }) => (
  <div className="space-y-2">
    <div className="flex justify-between items-center px-1">
      <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">{label}</span>
      <span className="text-[9px] font-mono text-primary">{Math.round(value)}{isPercent ? '%' : (label.includes('Brightness') ? '' : 'px')}</span>
    </div>
    <input 
      type="range" 
      min={min} 
      max={max} 
      step={label.includes('Brightness') || label.includes('Line Height') || label.includes('Offset') ? 0.05 : (label.includes('Gap') || label.includes('Size') || label.includes('Width') ? 1 : 0.1)} 
      value={value ?? min} 
      onChange={e => onChange(parseFloat(e.target.value))} 
      className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary" 
    />
  </div>
);

const AnimGroup: React.FC<{ label: string, value: string, onChange: (v: string) => void }> = ({ label, value, onChange }) => (
  <div className="space-y-2">
    <label className="text-[9px] font-black text-white/40 uppercase tracking-widest px-1">{label} Motion</label>
    <select value={value} onChange={e => onChange(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white font-bold outline-none focus:border-primary/50 appearance-none cursor-pointer">
      {ANIMATIONS.map(a => <option key={a.value} value={a.value} className="bg-[#050505]">{a.label}</option>)}
    </select>
  </div>
);

const ChoiceGroup: React.FC<{ label: string, value: string, options: { value: string, label: string }[], onChange: (v: any) => void }> = ({ label, value, options, onChange }) => (
  <div className="space-y-2">
    <label className="text-[9px] font-black text-white/40 uppercase tracking-widest px-1">{label}</label>
    <div className="flex gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            "flex-1 py-2 text-[9px] font-black uppercase rounded-lg transition-all",
            value === opt.value ? "bg-primary text-white shadow-lg" : "text-white/40 hover:text-white/60"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
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
    <div className="bg-white/5 p-3 rounded-xl border border-white/10 flex flex-col gap-2 hover:border-white/20 transition-all">
      <div className="flex items-center gap-3">
        <div className="relative w-8 h-8 shrink-0">
          <input type="color" value={hex} onChange={e => handleHexChange(e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
          <div className="w-full h-full rounded-md border border-white/10" style={{ backgroundColor: value }}></div>
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-[8px] font-black text-white/40 uppercase tracking-tighter">{label}</span>
          <input type="text" value={value} onChange={e => onChange(e.target.value)} className="bg-transparent text-[10px] font-mono text-white/60 outline-none w-full" />
        </div>
      </div>
      <div className="flex items-center gap-2 px-1">
        <input type="range" min="0" max="1" step="0.05" value={alpha} onChange={e => handleAlphaChange(parseFloat(e.target.value))} className="flex-1 h-0.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary" />
        <span className="text-[8px] font-mono text-primary w-5 text-right">{Math.round(alpha * 100)}</span>
      </div>
    </div>
  );
};

export const SettingsView: React.FC = () => {
  const [template, setTemplate] = useState<TemplateSettings>({
    logoText: 'AUTOREELS',
    logoColor: '#ffffff',
    logoTop: DEFAULTS.logoTop,
    logoLeft: 0,
    logoAlign: 'center',
    logoPlacement: 'top',
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
    mainAlign: 'center',
    mainPlacement: 'center',
    contentGap: DEFAULTS.contentGap,
    tagText: 'HOT NEWS',
    tagBg: '#fff000',
    tagColor: '#000000',
    tagTop: -15,
    tagLeft: 0,
    tagAlign: 'center',
    tagPlacement: 'bottom',
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
    accentColor: '#00f2ff',
    secondaryColor: '#ffffff',
    ttsPriority: ['lucylab', 'ohfree', 'elevenlabs', 'edge', 'gemini'],
    ttsVoices: {},
    autoMatchMood: true,
    transitionStyle: 'crossfade',
    stripHashtags: true,
    aiEnhanceText: false,
    fontFamily: 'Inter',
    lineHeight: 1.1,
    showProgressBar: true,
    logoImage: ''
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState('dynamic');
  const [selectedRatio, setSelectedRatio] = useState<'9:16' | '1:1' | '16:9'>('9:16');
  const [showAssetPicker, setShowAssetPicker] = useState(false);
  const [activeTab, setActiveTab] = useState<'visual' | 'layout' | 'audio' | 'advanced'>('visual');
  const previewRef = useRef<HTMLDivElement>(null);

  const templates = [
    { id: 'dynamic', name: 'Dynamic' },
    { id: 'promo', name: 'Promo Template' },
    { id: 'classic', name: 'Classic' },
    { id: 'modern', name: 'Modern' },
    { id: 'cinematic', name: 'Cinematic' },
    { id: 'cyberpunk', name: 'Cyberpunk' },
    { id: 'glassmorphism', name: 'Glass' },
    { id: 'minimal', name: 'Minimal' },
    { id: 'y2k', name: 'Y2K' },
    { id: 'bold', name: 'Bold' }
  ];

  useEffect(() => {
    loadSettings();
  }, [editingTemplateId]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await api.getSettings() as any;
      const tplKey = `video_template_${editingTemplateId}`;
      const tplVal = res[tplKey] || res['video_template'];

      if (tplVal) {
        const val = typeof tplVal === 'string' ? JSON.parse(tplVal) : tplVal;
        setTemplate(prev => ({ ...prev, ...val }));
        if (val.defaultRatio) setSelectedRatio(val.defaultRatio);
      }
    } catch (err) {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const tplKey = `video_template_${editingTemplateId}`;
      const payload = { ...template, defaultRatio: selectedRatio };
      await api.updateSetting(tplKey, payload);
      toast.success('Settings saved successfully!');
    } catch (err) {
      toast.error('Save failed');
    } finally {
      setSaving(false);
    }
  };

  const movePriority = (index: number, direction: 'up' | 'down') => {
    const newPriority = [...(template.ttsPriority || [])];
    if (direction === 'up' && index > 0) [newPriority[index], newPriority[index - 1]] = [newPriority[index - 1], newPriority[index]];
    else if (direction === 'down' && index < newPriority.length - 1) [newPriority[index], newPriority[index + 1]] = [newPriority[index + 1], newPriority[index]];
    setTemplate({ ...template, ttsPriority: newPriority });
  };


  if (loading) return (
    <div className="min-h-screen bg-[#050505] text-white p-4 md:p-8 font-sans">
      <div className="max-w-[1600px] mx-auto space-y-8">
        {/* Header skeleton */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-white/5 pb-8">
          <div className="space-y-3">
            <div className="w-48 h-10 skeleton-item" />
            <div className="w-72 h-4 skeleton-item" />
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden lg:flex items-center gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/10">
              {Array(8).fill(0).map((_, i) => (
                <div key={i} className="w-16 h-8 skeleton-item" style={{ borderRadius: 12 }} />
              ))}
            </div>
            <div className="w-32 h-12 skeleton-item" style={{ borderRadius: 999 }} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Config area skeleton */}
          <div className="lg:col-span-7 space-y-8">
            <div className="backdrop-blur-xl bg-white/[0.03] border border-white/10 rounded-[32px] overflow-hidden">
              {/* Tabs skeleton */}
              <div className="flex border-b border-white/5 bg-white/[0.01] p-1">
                {Array(4).fill(0).map((_, i) => (
                  <div key={i} className="flex-1 py-5 flex justify-center">
                    <div className="w-16 h-4 skeleton-item" />
                  </div>
                ))}
              </div>
              {/* Content skeleton */}
              <div className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="w-24 h-3 skeleton-item" />
                    <div className="h-12 skeleton-item" style={{ borderRadius: 12 }} />
                    <div className="grid grid-cols-2 gap-4">
                      <div className="h-20 skeleton-item" style={{ borderRadius: 12 }} />
                      <div className="h-20 skeleton-item" style={{ borderRadius: 12 }} />
                    </div>
                    <div className="h-10 skeleton-item" style={{ borderRadius: 8 }} />
                  </div>
                  <div className="space-y-4">
                    <div className="w-24 h-3 skeleton-item" />
                    <div className="h-10 skeleton-item" style={{ borderRadius: 8 }} />
                    <div className="h-10 skeleton-item" style={{ borderRadius: 8 }} />
                    <div className="grid grid-cols-2 gap-4">
                      <div className="h-20 skeleton-item" style={{ borderRadius: 12 }} />
                      <div className="h-20 skeleton-item" style={{ borderRadius: 12 }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Preview skeleton */}
          <div className="lg:col-span-5">
            <div className="sticky top-8 space-y-8">
              <div className="backdrop-blur-2xl bg-white/[0.03] border border-white/10 rounded-[40px] overflow-hidden">
                <div className="p-6 border-b border-white/5 flex justify-between items-center">
                  <div className="w-40 h-4 skeleton-item" />
                  <div className="w-28 h-8 skeleton-item" style={{ borderRadius: 12 }} />
                </div>
                <div className="bg-black/40 min-h-[500px] flex items-center justify-center">
                  <div className="w-[200px] h-[356px] skeleton-item" style={{ borderRadius: 16 }} />
                </div>
                <div className="p-5 border-t border-white/5 flex justify-between">
                  <div className="w-40 h-3 skeleton-item" />
                  <div className="w-24 h-3 skeleton-item" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 md:p-8 font-sans selection:bg-primary/30">
      <div className="max-w-[1600px] mx-auto space-y-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-white/5 pb-8">
          <div className="space-y-1">
            <h1 className="text-4xl font-black tracking-tight uppercase text-white">Settings</h1>
            <p className="text-white/40 font-medium uppercase text-[10px] tracking-[0.2em]">Production Pipeline Master Control</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden lg:flex items-center gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/10">
              {templates.map(t => (
                <button
                  key={t.id} onClick={() => setEditingTemplateId(t.id)}
                  className={cn("px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all", editingTemplateId === t.id ? "bg-white text-black shadow-lg shadow-white/10" : "text-white/40 hover:text-white")}
                >
                  {t.name}
                </button>
              ))}
            </div>
            <button
              onClick={saveSettings} disabled={saving}
              className="px-8 py-3 bg-primary text-white font-black rounded-full hover:scale-105 active:scale-95 transition-all flex items-center gap-2 shadow-lg shadow-primary/20"
            >
              <Save className="w-4 h-4" /> {saving ? 'SAVING...' : 'SAVE ALL'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

          {/* Main Config Area */}
          <div className="lg:col-span-7 space-y-8">

            {/* Template Specific Settings */}
            <div className="backdrop-blur-xl bg-white/[0.03] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl">
              <div className="flex border-b border-white/5 bg-white/[0.01]">
                {[
                  { id: 'visual', label: 'Style', icon: <Palette size={14} /> },
                  { id: 'layout', label: 'Layout', icon: <Move size={14} /> },
                  { id: 'audio', label: 'Audio', icon: <Volume2 size={14} /> },
                  { id: 'advanced', label: 'Advanced', icon: <Cpu size={14} /> }
                ].map(tab => (
                  <button
                    key={tab.id} onClick={() => setActiveTab(tab.id as any)}
                    className={cn("flex-1 py-5 flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest transition-all border-b-2", activeTab === tab.id ? "border-primary text-white bg-white/[0.02]" : "border-transparent text-white/30 hover:text-white/60")}
                  >
                    {tab.icon} {tab.label}
                  </button>
                ))}
              </div>

              <div className="p-8 min-h-[500px]">
                <AnimatePresence mode="wait">
                  {activeTab === 'visual' && (
                    <motion.div key="visual" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                          <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Branding</h3>
                          <div className="space-y-4">
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-white/40 uppercase tracking-widest ml-1">Logo Text</label>
                              <input type="text" value={template.logoText} onChange={e => setTemplate({ ...template, logoText: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-primary/50 outline-none transition-all" />
                            </div>
                            
                            <div className="space-y-2">
                              <label className="text-[9px] font-bold text-white/40 uppercase tracking-widest ml-1">Logo Icon / Image</label>
                              <div className="flex gap-4">
                                <button 
                                  onClick={() => setShowAssetPicker(true)} 
                                  className="w-20 h-20 rounded-xl border border-dashed border-white/20 hover:border-primary/50 transition-all bg-white/5 flex items-center justify-center overflow-hidden"
                                >
                                  {template.logoImage ? <img src={template.logoImage} alt="Logo" className="w-full h-full object-contain" /> : <ImageIcon className="text-white/20 w-4 h-4" />}
                                </button>
                                {template.logoImage && (
                                  <button onClick={() => setTemplate({ ...template, logoImage: '' })} className="text-[8px] font-black uppercase text-red-500/50 hover:text-red-500">Remove Icon</button>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <ColorInput label="Logo Color" value={template.logoColor} onChange={v => setTemplate({ ...template, logoColor: v })} />
                              <ColorInput label="Accent Color" value={template.accentColor || '#00f2ff'} onChange={v => setTemplate({ ...template, accentColor: v })} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <ColorInput label="Secondary" value={template.secondaryColor || '#ffffff'} onChange={v => setTemplate({ ...template, secondaryColor: v })} />
                              <ColorInput label="Divider" value={template.dividerColor} onChange={v => setTemplate({ ...template, dividerColor: v })} />
                            </div>
                            <SizeSlider label="Logo Font Size" value={template.logoSize} min={20} max={120} onChange={v => setTemplate({ ...template, logoSize: v })} />
                          </div>
                        </div>
                        <div className="space-y-4">
                          <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Typography</h3>
                          <div className="space-y-4">
                            <SizeSlider label="Hook Font Size" value={template.hookSize} min={30} max={200} onChange={v => setTemplate({ ...template, hookSize: v })} />
                            <SizeSlider label="Body Font Size" value={template.bodySize} min={20} max={100} onChange={v => setTemplate({ ...template, bodySize: v })} />
                            <div className="grid grid-cols-2 gap-4">
                              <ColorInput label="Hook Color" value={template.hookColor} onChange={v => setTemplate({ ...template, hookColor: v })} />
                              <ColorInput label="Body Color" value={template.bodyColor} onChange={v => setTemplate({ ...template, bodyColor: v })} />
                            </div>
                            <div className="pt-2 space-y-4">
                              <div className="space-y-2">
                                <label className="text-[9px] font-black text-white/40 uppercase tracking-widest px-1">Typography Font</label>
                                <select 
                                  value={template.fontFamily || 'Inter'} 
                                  onChange={e => setTemplate({ ...template, fontFamily: e.target.value })}
                                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white font-bold outline-none focus:border-primary/50 appearance-none cursor-pointer"
                                >
                                  <option value="Inter" className="bg-[#050505]">Inter (Modern Sans)</option>
                                  <option value="'Playfair Display'" className="bg-[#050505]">Playfair (Elegant Serif)</option>
                                  <option value="'JetBrains Mono'" className="bg-[#050505]">JetBrains (Tech Mono)</option>
                                  <option value="'Be Vietnam Pro'" className="bg-[#050505]">Be Vietnam Pro (Clean)</option>
                                </select>
                              </div>
                              <SizeSlider label="Line Height" value={template.lineHeight || 1.1} min={0.8} max={2} onChange={v => setTemplate({ ...template, lineHeight: v })} />
                              
                              <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                                <div className="flex flex-col">
                                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Progress Bar</span>
                                  <span className="text-[8px] text-white/20 uppercase mt-0.5">Show scene timeline</span>
                                </div>
                                <button onClick={() => setTemplate({ ...template, showProgressBar: !template.showProgressBar })} className={cn("w-10 h-5 rounded-full relative transition-all", template.showProgressBar ? "bg-primary" : "bg-white/10")}>
                                  <div className={cn("absolute top-1 w-3 h-3 bg-white rounded-full transition-all", template.showProgressBar ? "right-1" : "left-1")} />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="pt-8 border-t border-white/5 space-y-6">
                        <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Tag Badge Style</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <label className="text-[9px] font-bold text-white/40 uppercase tracking-widest ml-1">Tag Text</label>
                              <input
                                type="text" value={template.tagText}
                                onChange={e => setTemplate({ ...template, tagText: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white font-bold outline-none focus:border-primary"
                              />
                            </div>
                            <SizeSlider label="Tag Font Size" value={template.tagSize} min={10} max={60} onChange={v => setTemplate({ ...template, tagSize: v })} />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <ColorInput label="Tag Background" value={template.tagBg} onChange={v => setTemplate({ ...template, tagBg: v })} />
                            <ColorInput label="Tag Text Color" value={template.tagColor} onChange={v => setTemplate({ ...template, tagColor: v })} />
                          </div>
                        </div>
                      </div>

                      <div className="pt-8 border-t border-white/5 space-y-6">
                        <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Background & Filter</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-6">
                            <SizeSlider label="Overlay Brightness" value={template.backgroundBrightness} min={0} max={1} onChange={v => setTemplate({ ...template, backgroundBrightness: v })} />
                            
                            <div className="grid grid-cols-2 gap-4">
                              <ColorInput label="Gradient Start" value={template.bgGradientStart || '#000000'} onChange={v => setTemplate({ ...template, bgGradientStart: v })} />
                              <ColorInput label="Gradient End" value={template.bgGradientEnd || '#000000'} onChange={v => setTemplate({ ...template, bgGradientEnd: v })} />
                            </div>

                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                              <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Show Tag Badge</span>
                              <button onClick={() => setTemplate({ ...template, showTag: !template.showTag })} className={cn("w-10 h-5 rounded-full relative transition-all", template.showTag ? "bg-primary" : "bg-white/10")}>
                                <div className={cn("absolute top-1 w-3 h-3 bg-white rounded-full transition-all", template.showTag ? "right-1" : "left-1")} />
                              </button>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                              <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Show Datetime Overlay</span>
                              <button onClick={() => setTemplate({ ...template, showDatetime: !template.showDatetime })} className={cn("w-10 h-5 rounded-full relative transition-all", template.showDatetime ? "bg-primary" : "bg-white/10")}>
                                <div className={cn("absolute top-1 w-3 h-3 bg-white rounded-full transition-all", template.showDatetime ? "right-1" : "left-1")} />
                              </button>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[9px] font-bold text-white/40 uppercase tracking-widest ml-1">Custom Background Asset</label>
                            <button onClick={() => setShowAssetPicker(true)} className="w-full h-24 rounded-2xl border border-dashed border-white/20 hover:border-primary/50 transition-all bg-white/5 flex flex-col items-center justify-center gap-2 overflow-hidden">
                              {template.backgroundImage ? <img src={template.backgroundImage} alt="Background asset" className="w-full h-full object-cover" /> : <><ImageIcon className="text-white/20" /> <span className="text-[9px] font-bold text-white/20">SELECT ASSET</span></>}
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'layout' && (
                    <motion.div key="layout" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-12">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                          <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Positioning</h3>
                          <div className="space-y-8">
                            <div className="bg-white/5 p-6 rounded-3xl border border-white/10 space-y-6">
                              <div className="flex items-center gap-2 mb-2">
                                <Box className="w-4 h-4 text-primary" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Main Content</span>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <ChoiceGroup label="Alignment" value={template.mainAlign} options={[{ value: 'left', label: 'Left' }, { value: 'center', label: 'Center' }, { value: 'right', label: 'Right' }]} onChange={v => setTemplate({ ...template, mainAlign: v })} />
                                <ChoiceGroup label="Placement" value={template.mainPlacement} options={[{ value: 'top', label: 'Top' }, { value: 'center', label: 'Mid' }, { value: 'bottom', label: 'Bot' }]} onChange={v => setTemplate({ ...template, mainPlacement: v })} />
                              </div>
                              <SizeSlider label="Vertical Offset" value={template.mainTop} min={-100} max={100} isPercent onChange={v => setTemplate({ ...template, mainTop: v })} />
                              <SizeSlider label="Side Offset" value={template.mainLeft} min={-100} max={100} isPercent onChange={v => setTemplate({ ...template, mainLeft: v })} />
                            </div>

                            <div className="bg-white/5 p-6 rounded-3xl border border-white/10 space-y-6">
                              <div className="flex items-center gap-2 mb-2">
                                <Sparkles className="w-4 h-4 text-primary" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Brand Logo</span>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <ChoiceGroup label="Alignment" value={template.logoAlign} options={[{ value: 'left', label: 'Left' }, { value: 'center', label: 'Center' }, { value: 'right', label: 'Right' }]} onChange={v => setTemplate({ ...template, logoAlign: v })} />
                                <ChoiceGroup label="Placement" value={template.logoPlacement} options={[{ value: 'top', label: 'Top' }, { value: 'center', label: 'Mid' }, { value: 'bottom', label: 'Bot' }]} onChange={v => setTemplate({ ...template, logoPlacement: v })} />
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <SizeSlider label="Vertical Offset" value={template.logoTop} min={-100} max={100} isPercent onChange={v => setTemplate({ ...template, logoTop: v })} />
                                <SizeSlider label="Side Offset" value={template.logoLeft} min={-100} max={100} isPercent onChange={v => setTemplate({ ...template, logoLeft: v })} />
                              </div>
                            </div>

                            <div className="bg-white/5 p-6 rounded-3xl border border-white/10 space-y-6">
                              <div className="flex items-center gap-2 mb-2">
                                <Zap className="w-4 h-4 text-primary" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Tag Badge</span>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <ChoiceGroup label="Alignment" value={template.tagAlign} options={[{ value: 'left', label: 'Left' }, { value: 'center', label: 'Center' }, { value: 'right', label: 'Right' }]} onChange={v => setTemplate({ ...template, tagAlign: v })} />
                                <ChoiceGroup label="Placement" value={template.tagPlacement} options={[{ value: 'top', label: 'Top' }, { value: 'center', label: 'Mid' }, { value: 'bottom', label: 'Bot' }]} onChange={v => setTemplate({ ...template, tagPlacement: v })} />
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <SizeSlider label="Vertical Offset" value={template.tagTop} min={-100} max={100} isPercent onChange={v => setTemplate({ ...template, tagTop: v })} />
                                <SizeSlider label="Side Offset" value={template.tagLeft} min={-100} max={100} isPercent onChange={v => setTemplate({ ...template, tagLeft: v })} />
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-6">
                          <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Animations</h3>
                          <div className="space-y-4">
                            <AnimGroup label="Main Content" value={template.bodyAnim} onChange={v => setTemplate({ ...template, bodyAnim: v })} />
                            <AnimGroup label="Viral Hook" value={template.hookAnim} onChange={v => setTemplate({ ...template, hookAnim: v })} />
                            <AnimGroup label="Brand Logo" value={template.logoAnim} onChange={v => setTemplate({ ...template, logoAnim: v })} />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'audio' && (
                    <motion.div key="audio" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
                      <div className="backdrop-blur-md bg-white/[0.02] border border-white/10 rounded-2xl p-6">
                        <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-4">TTS Provider Priority</h3>
                        <div className="space-y-3">
                          {template.ttsPriority?.map((p, i) => (
                            <div key={p} className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl group hover:border-primary/30 transition-all">
                              <div className="flex items-center gap-4">
                                <span className="text-lg font-black text-white/10 italic">#{i + 1}</span>
                                <span className="font-black uppercase text-xs tracking-widest">{p}</span>
                              </div>
                              <div className="flex gap-2">
                                <button onClick={() => movePriority(i, 'up')} className="p-2 bg-white/5 hover:bg-primary/20 rounded-lg transition-all"><ArrowUp size={14} /></button>
                                <button onClick={() => movePriority(i, 'down')} className="p-2 bg-white/5 hover:bg-primary/20 rounded-lg transition-all"><ArrowDown size={14} /></button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {template.ttsPriority?.map(p => (
                          <div key={p} className="p-4 bg-white/5 border border-white/5 rounded-2xl space-y-2">
                            <label className="text-[9px] font-black text-white/30 uppercase tracking-widest">{p} VOICE ID</label>
                            <input
                              type="text" value={template.ttsVoices?.[p] || ''}
                              placeholder="System Default"
                              onChange={e => setTemplate({ ...template, ttsVoices: { ...template.ttsVoices, [p]: e.target.value } })}
                              className="w-full bg-transparent border-b border-white/10 py-2 outline-none focus:border-primary text-sm font-mono"
                            />
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'advanced' && (
                    <motion.div key="advanced" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* AI Matcher */}
                        <div className="bg-white/5 border border-white/10 rounded-[24px] p-6 space-y-6">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500/20 rounded-xl"><Wand2 className="w-5 h-5 text-blue-400" /></div>
                            <div>
                              <h4 className="text-sm font-black uppercase tracking-tight">AI Template Matcher</h4>
                              <p className="text-[9px] text-white/40 uppercase">Auto-select style based on content mood</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between p-4 bg-black/20 rounded-xl border border-white/5">
                            <span className="text-[10px] font-bold uppercase text-white/60">Enable Auto-Match</span>
                            <button onClick={() => setTemplate({ ...template, autoMatchMood: !template.autoMatchMood })} className={cn("w-10 h-5 rounded-full relative transition-all", template.autoMatchMood ? "bg-blue-500" : "bg-white/10")}>
                              <div className={cn("absolute top-1 w-3 h-3 bg-white rounded-full transition-all", template.autoMatchMood ? "right-1" : "left-1")} />
                            </button>
                          </div>
                        </div>

                        {/* Transitions */}
                        <div className="bg-white/5 border border-white/10 rounded-[24px] p-6 space-y-6">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-500/20 rounded-xl"><Layers className="w-5 h-5 text-purple-400" /></div>
                            <div>
                              <h4 className="text-sm font-black uppercase tracking-tight">Scene Transitions</h4>
                              <p className="text-[9px] text-white/40 uppercase">Set default transition style</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            {['crossfade', 'slide', 'zoom'].map(s => (
                              <button
                                key={s} onClick={() => setTemplate({ ...template, transitionStyle: s as any })}
                                className={cn("py-2 rounded-lg text-[9px] font-black uppercase border transition-all", template.transitionStyle === s ? "bg-purple-500 border-purple-400" : "bg-white/5 border-white/5 text-white/40")}
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Content Cleaning */}
                        <div className="bg-white/5 border border-white/10 rounded-[24px] p-6 space-y-6">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-500/20 rounded-xl"><Filter className="w-5 h-5 text-green-400" /></div>
                            <div>
                              <h4 className="text-sm font-black uppercase tracking-tight">Content Pipeline</h4>
                              <p className="text-[9px] text-white/40 uppercase">Pre-processing settings</p>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between p-3 bg-black/20 rounded-xl border border-white/5">
                              <span className="text-[10px] font-bold uppercase text-white/60">Strip Hashtags from TTS</span>
                              <button onClick={() => setTemplate({ ...template, stripHashtags: !template.stripHashtags })} className={cn("w-8 h-4 rounded-full relative transition-all", template.stripHashtags ? "bg-green-500" : "bg-white/10")}>
                                <div className={cn("absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all", template.stripHashtags ? "right-0.5" : "left-0.5")} />
                              </button>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-black/20 rounded-xl border border-white/5">
                              <span className="text-[10px] font-bold uppercase text-white/60">AI Enhance Hook Text</span>
                              <button onClick={() => setTemplate({ ...template, aiEnhanceText: !template.aiEnhanceText })} className={cn("w-8 h-4 rounded-full relative transition-all", template.aiEnhanceText ? "bg-green-500" : "bg-white/10")}>
                                <div className={cn("absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all", template.aiEnhanceText ? "right-0.5" : "left-0.5")} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Right Preview Column */}
          <div className="lg:col-span-5">
            <div className="sticky top-8 space-y-8">
              <div className="backdrop-blur-2xl bg-white/[0.03] border border-white/10 rounded-[40px] overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.5)]" />
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/60">Live Master Preview</span>
                  </div>
                  <div className="flex gap-2 bg-black/40 p-1 rounded-xl border border-white/10">
                    {['9:16', '1:1', '16:9'].map(r => (
                      <button
                        key={r} onClick={() => setSelectedRatio(r as any)}
                        className={cn("px-4 py-1.5 rounded-lg text-[9px] font-black transition-all", selectedRatio === r ? "bg-white text-black shadow-lg" : "text-white/40 hover:text-white")}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-center bg-black/40 relative min-h-[500px]">
                  <LivePreview 
                    templateId={editingTemplateId} 
                    templateData={{
                      settings: template,
                      ...template,
                      title: "THÁNG NĂM TẠI NÚT GIAO LIÊM TUYỀN. CHIẾC XE CON MẤT LÁI, LAO THẲNG VỀ TRẠM THU PHÍ.",
                      content: "Khám phá nguyên nhân vụ tai nạn kinh hoàng và cách phòng tránh rủi ro khi lái xe trên cao tốc.",
                      scenes: [
                        { id: 1, type: 'hook', voiceText: "THÁNG NĂM TẠI NÚT GIAO LIÊM TUYỀN. CHIẾC XE CON MẤT LÁI, LAO THẲNG VỀ TRẠM THU PHÍ.", bodyText: "THÁNG NĂM TẠI NÚT GIAO LIÊM TUYỀN. CHIẾC XE CON MẤT LÁI, LAO THẲNG VỀ TRẠM THU PHÍ." },
                        { id: 2, type: 'body', voiceText: "Vụ việc xảy ra bất ngờ khiến tài xế không kịp phản ứng. Toàn bộ diễn biến được camera an ninh ghi lại.", bodyText: "Vụ việc xảy ra bất ngờ khiến tài xế không kịp phản ứng. Toàn bộ diễn biến được camera an ninh ghi lại." },
                        { id: 3, type: 'outro', voiceText: "Hãy lái xe an toàn và tuân thủ luật lệ giao thông!", bodyText: "HÃY LÁI XE AN TOÀN VÀ TUÂN THỦ LUẬT LỆ GIAO THÔNG" }
                      ]
                    }} 
                    loading={loading} 
                    ratio={selectedRatio} 
                  />
                </div>

                <div className="p-5 bg-white/[0.02] border-t border-white/5 flex items-center justify-between px-8">
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">ADVANCED SYNC ACTIVE</span>
                    </div>
                  </div>
                  <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.5em]">SYSTEM STABLE</span>
                </div>
              </div>

              <div className="backdrop-blur-xl bg-white/[0.03] border border-white/10 rounded-[32px] p-6 flex items-center gap-5">
                <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/20 shadow-lg shadow-primary/10">
                  <Zap className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <h4 className="text-sm font-black uppercase tracking-tight">Real-time Synchronization</h4>
                  <p className="text-[10px] text-white/30 uppercase tracking-widest mt-1">Updates apply instantly to all background workers</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showAssetPicker && (
          <AssetPicker
            onSelect={(url) => { setTemplate({ ...template, backgroundImage: url }); setShowAssetPicker(false); }}
            onClose={() => setShowAssetPicker(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
