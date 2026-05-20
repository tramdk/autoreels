import React from 'react';
import { Layout, Monitor, Film, Zap, Sparkles, Dna, Wand2 } from 'lucide-react';

interface TemplateGridProps {
  selected: string;
  onSelect: (id: string) => void;
}

export const TemplateGrid: React.FC<TemplateGridProps> = ({ selected, onSelect }) => {
  const templates = [
    { id: 'dynamic', label: 'Dynamic', icon: <Wand2 className="w-4 h-4" />, desc: 'AI Tự Động' },
    { id: 'promo', label: 'Promo', icon: <Zap className="w-4 h-4" />, desc: 'Quảng Cáo' },
    { id: 'classic', label: 'Classic', icon: <Layout className="w-4 h-4" />, desc: 'Truyền thống' },
    { id: 'modern', label: 'Modern', icon: <Monitor className="w-4 h-4" />, desc: 'Chuyên nghiệp' },
    { id: 'cinematic', label: 'Cinematic', icon: <Film className="w-4 h-4" />, desc: 'Điện ảnh' },
    { id: 'cyberpunk', label: 'Cyberpunk', icon: <Zap className="w-4 h-4" />, desc: 'Neon Glitch' },
    { id: 'glassmorphism', label: 'Glass', icon: <Sparkles className="w-4 h-4" />, desc: 'Kính mờ' },
    { id: 'minimal', label: 'Minimal', icon: <Monitor className="w-4 h-4" />, desc: 'Tối giản' },
    { id: 'y2k', label: 'Y2K Retro', icon: <Dna className="w-4 h-4" />, desc: 'Vintage' },
    { id: 'bold', label: 'Bold', icon: <Zap className="w-4 h-4" />, desc: 'Mạnh mẽ' }
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {templates.map(tpl => (
        <button
          key={tpl.id}
          onClick={() => onSelect(tpl.id)}
          className={`relative overflow-hidden px-4 py-5 rounded-2xl border transition-all duration-300 flex flex-col items-center justify-center text-center gap-2 group ${
            selected === tpl.id 
              ? 'bg-primary/10 border-primary shadow-[0_0_20px_rgba(0,242,255,0.1)]' 
              : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'
          }`}
        >
          {selected === tpl.id && (
            <div className="absolute inset-0 bg-primary/5 blur-xl pointer-events-none" />
          )}
          
          <div className={`p-2 rounded-xl transition-all ${
            selected === tpl.id ? 'bg-primary text-white shadow-[0_0_15px_rgba(0,242,255,0.4)]' : 'bg-white/5 text-slate-400 group-hover:text-slate-200'
          }`}>
            {tpl.icon}
          </div>
          <div className="space-y-0.5">
            <span className={`text-[10px] font-black uppercase tracking-widest block ${
              selected === tpl.id ? 'text-primary' : 'text-slate-400 group-hover:text-slate-200'
            }`}>
              {tpl.label}
            </span>
            <span className="text-[8px] font-bold text-slate-600 uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">
              {tpl.desc}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
};
