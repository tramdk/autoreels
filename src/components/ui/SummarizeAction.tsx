import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Wand2, X, FileText, Zap, Sparkles, Star, Code2 } from 'lucide-react';
import { api } from '../../services/api';
import { toast } from 'react-hot-toast';
import { cn } from '../../utils/cn';

interface SummarizeActionProps {
  articleId: string;
  onSuccess?: (data: any) => void;
  className?: string;
  label?: string;
}

const TONES = [
  { id: 'News', name: 'Tin tức', description: 'Chuyên nghiệp, khách quan', icon: FileText, color: 'text-blue-400', bg: 'bg-blue-400/10' },
  { id: 'Dramatic', name: 'Kịch tính', description: 'Hồi hộp, cảm xúc mạnh', icon: Zap, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  { id: 'Humorous', name: 'Hài hước', description: 'Vui vẻ, phá cách', icon: Sparkles, color: 'text-pink-400', bg: 'bg-pink-400/10' },
  { id: 'Inspirational', name: 'Cảm hứng', description: 'Truyền động lực, tích cực', icon: Star, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  { id: 'AulaqAI', name: 'Tech Slide (Aulaq)', description: 'Slide lập trình, bento, tối giản', icon: Code2, color: 'text-orange-400', bg: 'bg-orange-400/10' },
];

export const SummarizeAction: React.FC<SummarizeActionProps> = ({ 
  articleId, 
  onSuccess, 
  className,
  label = 'AI SCRIPT'
}) => {
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedTone, setSelectedTone] = useState('News');

  const handleStartSummarize = async () => {
    setShowModal(false);
    const tid = toast.loading('AI is reading and summarizing...');
    setLoading(true);
    try {
      const language = localStorage.getItem('autoreels_language') || 'Vietnamese';
      const result = await api.summarize(articleId, language, selectedTone);
      toast.success('Script generated successfully!', { id: tid });
      if (onSuccess) onSuccess(result);
    } catch (error: any) {
      toast.error('Summarization failed: ' + error.message, { id: tid });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button 
        onClick={(e) => { e.stopPropagation(); setShowModal(true); }} 
        disabled={loading}
        className={cn(
          "bg-emerald-600/10 text-emerald-400 hover:bg-emerald-600/20 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-500/20 btn-tactile flex items-center gap-2 disabled:opacity-50 shadow-lg",
          className
        )}
      >
        <Wand2 data-icon="inline-start" className={cn("size-3.5", loading && "animate-twinkle-sway")} />
        {label}
      </button>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setShowModal(false)} 
              className="absolute inset-0 bg-black/90 backdrop-blur-md" 
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="summarize-dialog-title"
              className="glass w-full max-w-md p-8 rounded-[40px] border border-white/10 shadow-3xl relative z-10 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-primary/20 text-primary rounded-xl">
                    <Wand2 className="size-5" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 font-bold uppercase tracking-widest leading-none mb-1">
                      Kịch bản AI
                    </div>
                    <h2 id="summarize-dialog-title" className="text-lg font-black tracking-tight text-white leading-none">
                      Chọn phong cách
                    </h2>
                  </div>
                </div>
                <button onClick={() => setShowModal(false)} className="p-2 text-slate-500 hover:text-white bg-white/5 rounded-xl transition-all">
                  <X className="size-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 mb-8">
                {TONES.map(tone => (
                  <button
                    key={tone.id}
                    onClick={() => setSelectedTone(tone.id)}
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-2xl border transition-all text-left group",
                      selectedTone === tone.id 
                        ? "bg-primary/20 border-primary/40 shadow-lg" 
                        : "bg-white/5 border-transparent hover:bg-white/10"
                    )}
                  >
                    <div className={cn("p-3 rounded-xl transition-transform group-hover:scale-110", tone.bg, tone.color)}>
                      <tone.icon className="size-5" />
                    </div>
                    <div className="flex-1">
                      <div className={cn("text-sm font-black tracking-tight mb-0.5", selectedTone === tone.id ? "text-white" : "text-slate-300")}>
                        {tone.name}
                      </div>
                      <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none">
                        {tone.description}
                      </div>
                    </div>
                    {selectedTone === tone.id && (
                      <div className="size-2 rounded-full bg-primary shadow-[0_0_10px_#fff]" />
                    )}
                  </button>
                ))}
              </div>

              <button
                onClick={handleStartSummarize}
                className="w-full py-4 bg-primary text-on-primary font-black uppercase tracking-[0.2em] text-[11px] rounded-2xl shadow-lg glow-primary hover:brightness-110 btn-tactile flex items-center justify-center gap-2"
              >
                Tạo kịch bản ngay
                <Wand2 data-icon="inline-end" className="size-4" />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
