import React from 'react';
import { motion } from 'motion/react';

const colorMap = {
  rose: 'from-rose-500/20 to-rose-500/5 text-rose-500',
  blue: 'from-blue-500/20 to-blue-500/5 text-blue-500',
  purple: 'from-purple-500/20 to-purple-500/5 text-purple-500',
  green: 'from-green-500/20 to-green-500/5 text-green-500'
};

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color?: keyof typeof colorMap;
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color = 'blue' }) => {
  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className={`glass-panel group p-8 flex flex-col items-center text-center`}
    >
       <div className={`p-4 rounded-2xl bg-gradient-to-br ${colorMap[color]} mb-6 transition-transform group-hover:scale-110`}>
        {React.cloneElement(icon as React.ReactElement, { className: 'w-8 h-8' })}
      </div>
      <p className="text-sm font-bold text-slate-500 uppercase tracking-[0.15em] mb-2">{title}</p>
      <p className="text-5xl font-black text-white tracking-tighter">{value}</p>
    </motion.div>
  );
};
