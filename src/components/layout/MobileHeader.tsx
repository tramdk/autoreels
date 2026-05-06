import React from 'react';
import { motion } from 'motion/react';
import { Play, LogOut } from 'lucide-react';

interface MobileHeaderProps {
  onLogout: () => void;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({ onLogout }) => {
  return (
    <header className="lg:hidden flex items-center justify-between px-6 py-5 bg-background sticky top-0 z-50 border-b border-white/5">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-primary flex items-center justify-center rounded-xl shadow-lg shadow-primary/20">
          <Play size={18} className="text-white fill-current" />
        </div>
        <span className="text-xl font-black tracking-tighter text-white">AutoReels</span>
      </div>
      
      <button 
        onClick={onLogout}
        className="p-2.5 rounded-xl bg-white/5 text-slate-400 hover:text-white transition-colors"
      >
        <LogOut size={18} />
      </button>
    </header>
  );
};
