import React from 'react';
import { motion } from 'motion/react';

interface SettingToggleProps {
  title: string;
  description: string;
  active?: boolean;
  onToggle?: () => void;
}

export const SettingToggle: React.FC<SettingToggleProps> = ({ title, description, active = false, onToggle }) => {
  return (
    <div className="flex items-center justify-between group py-2" onClick={onToggle}>
      <div className="pr-4">
        <h3 className="text-lg font-bold text-white mb-1 group-hover:text-primary transition-colors">{title}</h3>
        <p className="text-sm font-medium text-slate-500">{description}</p>
      </div>
      <div className={`w-14 h-8 ${active ? 'bg-primary shadow-lg shadow-primary/20' : 'bg-slate-800'} rounded-full relative cursor-pointer transition-all border border-white/10`}>
        <motion.div 
          animate={{ x: active ? 28 : 4 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className="w-6 h-6 bg-white rounded-full absolute top-1 shadow-sm"
        />
      </div>
    </div>
  );
};
