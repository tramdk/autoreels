import React from 'react';
import { motion } from 'motion/react';

const colorMap = {
  rose: { bg: 'bg-rose-500/10', border: 'border-rose-500/20', text: 'text-rose-500', glow: 'shadow-rose-500/20' },
  blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-500', glow: 'shadow-blue-500/20' },
  purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-500', glow: 'shadow-purple-500/20' },
  green: { bg: 'bg-green-500/10', border: 'border-green-500/20', text: 'text-green-500', glow: 'shadow-green-500/20' }
};

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color?: keyof typeof colorMap;
  onClick?: () => void;
  loading?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color = 'blue', onClick, loading }) => {
  const styles = colorMap[color];
  
  return (
    <motion.div 
      whileHover={{ y: -8, scale: 1.02 }}
      whileTap={onClick ? { scale: 0.98 } : {}}
      onClick={onClick}
      className={`relative overflow-hidden glass p-5 sm:p-8 flex flex-col items-center text-center rounded-[24px] sm:rounded-[32px] border border-white/5 transition-all duration-300 ${
        onClick ? 'cursor-pointer hover:border-white/10 hover:bg-white/5' : ''
      }`}
    >
      {/* Dynamic Background Glow */}
      <div className={`absolute -bottom-12 -right-12 w-32 h-32 blur-[60px] opacity-20 rounded-full ${styles.bg}`} />
      
      {loading ? (
        <>
          <div className={`p-4 sm:p-5 rounded-2xl mb-4 sm:mb-6 skeleton-item w-14 h-14 sm:w-16 sm:h-16`} />
          <div className="w-16 h-3 skeleton-item mb-3" />
          <div className="w-20 h-10 sm:h-12 skeleton-item mb-1" />
          <div className="h-1 w-8 skeleton-item mt-1" />
        </>
      ) : (
        <>
          <div className={`p-4 sm:p-5 rounded-2xl ${styles.bg} ${styles.text} mb-4 sm:mb-6 transition-all duration-500 group-hover:scale-110 shadow-lg ${styles.glow} border ${styles.border}`}>
            {React.cloneElement(icon as React.ReactElement, { className: 'w-6 h-6 sm:w-7 h-7' })}
          </div>
          
          <p className="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2 sm:mb-3 leading-none">
            {title}
          </p>
          
          <div className="relative">
            <p className="text-3xl sm:text-5xl font-black text-white tracking-tighter leading-none mb-1">
              {value}
            </p>
            <div className={`h-1 w-8 mx-auto rounded-full ${styles.bg} opacity-50`} />
          </div>
        </>
      )}
    </motion.div>
  );
};
