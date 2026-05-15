import React from 'react';
import { Wand2 } from 'lucide-react';
import { api } from '../../services/api';
import { toast } from 'react-hot-toast';
import { cn } from '../../utils/cn';

interface SummarizeActionProps {
  articleId: string;
  tone?: string;
  onSuccess?: (data: any) => void;
  className?: string;
  label?: string;
}

export const SummarizeAction: React.FC<SummarizeActionProps> = ({ 
  articleId, 
  tone = 'News', 
  onSuccess, 
  className,
  label = 'AI SCRIPT'
}) => {
  const [loading, setLoading] = React.useState(false);

  const handleSummarize = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const tid = toast.loading('AI is reading and summarizing...');
    setLoading(true);
    try {
      const language = localStorage.getItem('autoreels_language') || 'Vietnamese';
      const result = await api.summarize(articleId, language, tone);
      toast.success('Script generated successfully!', { id: tid });
      if (onSuccess) onSuccess(result);
    } catch (error: any) {
      toast.error('Summarization failed: ' + error.message, { id: tid });
    } finally {
      setLoading(false);
    }
  };

  return (
    <button 
      onClick={handleSummarize} 
      disabled={loading}
      className={cn(
        "bg-blue-600/10 text-blue-400 hover:bg-blue-600/20 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-blue-500/20 transition-all flex items-center gap-2 disabled:opacity-50 shadow-lg glow-primary/5",
        className
      )}
    >
      <Wand2 className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
      {label}
    </button>
  );
};
