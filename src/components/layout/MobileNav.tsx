import React from 'react';
import { motion } from 'motion/react';
import { 
  LayoutDashboard, 
  Clapperboard, 
  Video, 
  Settings,
  Mic
} from 'lucide-react';
import { TabType } from '../../types';

interface MobileNavProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ activeTab, setActiveTab }) => {
  const navItems = [
    { id: 'dashboard' as TabType, icon: <LayoutDashboard />, label: 'Home' },
    { id: 'studio' as TabType, icon: <Clapperboard />, label: 'Studio' },
    { id: 'videos' as TabType, icon: <Video />, label: 'Videos' },
    { id: 'voices' as TabType, icon: <Mic />, label: 'TTS' },
    { id: 'settings' as TabType, icon: <Settings />, label: 'Config' }
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 px-4 pb-6 pt-2">
      <div className="glass-morphism rounded-3xl border border-white/10 flex justify-around items-center px-2 py-3 shadow-2xl backdrop-blur-2xl bg-black/40">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className="relative flex flex-col items-center gap-1 flex-1 py-1"
            >
              <div className={`transition-all duration-300 ${isActive ? 'text-primary scale-110' : 'text-slate-400'}`}>
                {React.cloneElement(item.icon as React.ReactElement, { size: 24, strokeWidth: isActive ? 2.5 : 2 })}
              </div>
              <span className={`text-[10px] font-bold transition-all ${isActive ? 'text-primary opacity-100' : 'text-slate-500 opacity-70'}`}>
                {item.label}
              </span>
              {isActive && (
                <motion.div 
                  layoutId="active-dot"
                  className="absolute -top-1 w-1 h-1 bg-primary rounded-full shadow-[0_0_8px_rgba(255,59,48,0.8)]"
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
