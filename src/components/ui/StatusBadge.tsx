import React from 'react';
import { Clock, FileText, Video, CheckCircle2 } from 'lucide-react';

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const baseClass = "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border";
  switch (status) {
    case 'scraped':
      return <span className={`${baseClass} bg-slate-900 text-slate-400 border-white/5`}><Clock className="w-3 h-3" /> Scraped</span>;
    case 'summarized':
      return <span className={`${baseClass} bg-blue-500/10 text-blue-400 border-blue-500/20`}><FileText className="w-3 h-3" /> Script Ready</span>;
    case 'video_generated':
    case 'ready':
      return <span className={`${baseClass} bg-purple-500/10 text-purple-400 border-purple-500/20`}><Video className="w-3 h-3" /> Video Build</span>;
    case 'posted':
      return <span className={`${baseClass} bg-green-500/10 text-green-400 border-green-500/20`}><CheckCircle2 className="w-3 h-3" /> Published</span>;
    default:
      return <span className={`${baseClass} bg-slate-900 text-slate-500 border-white/5`}>{status}</span>;
  }
};
