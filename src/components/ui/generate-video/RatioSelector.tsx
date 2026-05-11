import React from 'react';
import { Monitor, Smartphone, Square, Maximize } from 'lucide-react';
import { cn } from '../../../utils/cn';

export type Ratio = "16:9" | "9:16" | "1:1" | "4:3";

export const RATIOS: { id: Ratio; name: string; icon: any; w: number; h: number }[] = [
  { id: '9:16', name: 'Vertical', icon: Smartphone, w: 9, h: 16 },
  { id: '16:9', name: 'Horizontal', icon: Monitor, w: 16, h: 9 },
  { id: '1:1', name: 'Square', icon: Square, w: 1, h: 1 },
  { id: '4:3', name: 'Classic', icon: Maximize, w: 4, h: 3 },
];

interface RatioSelectorProps {
  selected: Ratio;
  onSelect: (ratio: Ratio) => void;
}

export const RatioSelector: React.FC<RatioSelectorProps> = ({ selected, onSelect }) => {
  return (
    <div className="space-y-4">
      <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4">
        Video Resolution (Ratio)
      </h3>
      <div className="grid grid-cols-4 gap-2">
        {RATIOS.map((r) => {
          const Icon = r.icon;
          const isActive = selected === r.id;
          return (
            <button
              key={r.id}
              onClick={() => onSelect(r.id)}
              className={cn(
                "flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border transition-all group",
                isActive 
                  ? "bg-primary/10 border-primary/30 text-primary shadow-lg" 
                  : "bg-white/5 border-white/5 text-slate-500 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon className={cn("w-5 h-5 transition-transform group-hover:scale-110", isActive && "animate-pulse")} />
              <span className="text-[9px] font-bold uppercase tracking-wider">{r.id}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
