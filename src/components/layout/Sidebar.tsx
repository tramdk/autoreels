import React from 'react';
import { motion } from 'motion/react';
import { 
  LayoutDashboard, 
  Rss, 
  Video, 
  Share2, 
  Settings, 
  Play, 
  ChevronRight,
  LogOut,
  Globe,
  Clapperboard,
  Mic
} from 'lucide-react';
import { TabType } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, active, onClick }) => {
  return (
    <motion.button
      whileHover={{ x: 4 }}
      onClick={onClick}
      className={`relative w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-sm font-bold transition-all ${
        active 
          ? 'bg-primary text-white shadow-xl glow-primary' 
          : 'text-slate-500 hover:text-white hover:bg-white/5'
      }`}
    >
      {React.cloneElement(icon as React.ReactElement, { className: 'w-5 h-5' })}
      {label}
      {active && (
        <motion.div layoutId="nav-glow" className="absolute left-0 w-1.5 h-6 bg-white rounded-full -ml-3" />
      )}
    </motion.button>
  );
};

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  onLogout: () => void;
  renderingVideos?: Record<string, { progress: number, phase?: string, title?: string }>;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, onLogout, renderingVideos = {} }) => {
  const { t, language, setLanguage } = useLanguage();

  const activeJobs = Object.entries(renderingVideos);

  return (
    <aside className="hidden lg:flex w-80 glass border-r border-white/5 flex-col sticky top-0 h-screen z-50">
      <div className="p-10 flex justify-between items-center">
        <div className="flex items-center gap-4 text-3xl font-black tracking-tighter text-white">
          <motion.div 
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ repeat: Infinity, duration: 4 }}
            className="w-12 h-12 bg-primary flex items-center justify-center rounded-2xl shadow-xl glow-primary"
          >
            <Play className="w-6 h-6 text-white fill-current" />
          </motion.div>
          AutoReels
        </div>
      </div>
      
      <nav className="flex-1 px-6 space-y-2 overflow-y-auto custom-scrollbar">
        <NavItem icon={<LayoutDashboard />} label={t('sidebar.dashboard')} active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
        <NavItem icon={<Clapperboard />} label={t('sidebar.studio')} active={activeTab === 'studio'} onClick={() => setActiveTab('studio')} />
        <NavItem icon={<Rss />} label={t('sidebar.sources')} active={activeTab === 'sources'} onClick={() => setActiveTab('sources')} />
        <NavItem icon={<Video />} label={t('sidebar.videos')} active={activeTab === 'videos'} onClick={() => setActiveTab('videos')} />
        <NavItem icon={<Share2 />} label={t('sidebar.social')} active={activeTab === 'social'} onClick={() => setActiveTab('social')} />
        <NavItem icon={<Mic />} label="Voices" active={activeTab === 'voices'} onClick={() => setActiveTab('voices')} />
        
        {/* Active Tasks Section */}
        {activeJobs.length > 0 && (
          <div className="mt-8 pt-4 border-t border-white/5 px-4">
             <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] mb-4">Active Tasks</p>
             <div className="space-y-5">
               {activeJobs.map(([id, rawData]) => {
                 const data = rawData as { progress: number, phase?: string, title?: string };
                 return (
                   <div key={id} className="space-y-2 group/task">
                     <div className="flex flex-col gap-1">
                       <div className="flex justify-between items-start">
                         <span className="text-[11px] font-bold text-white truncate max-w-[140px]">
                           {data.title || 'Rendering Video'}
                         </span>
                         <span className="text-[10px] font-mono font-black text-primary tracking-tighter">{data.progress}%</span>
                       </div>
                       <span className="text-[9px] font-medium text-slate-500 italic">
                         {data.phase || 'Processing...'}
                       </span>
                     </div>
                     <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                       <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${data.progress}%` }}
                          className="h-full bg-primary shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]"
                       />
                     </div>
                   </div>
                 );
               })}
             </div>
          </div>
        )}

        <div className="mt-10 mb-4 px-4 flex justify-between items-center">
           <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">{t('sidebar.config')}</p>
        </div>
        <NavItem icon={<Settings />} label={t('sidebar.settings')} active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
        <div className="mt-2 text-slate-400">
           <button 
             onClick={() => setLanguage(language === 'vi' ? 'en' : 'vi')}
             className="w-full flex items-center justify-between px-5 py-4 rounded-2xl hover:bg-white/5 transition-all text-sm font-bold"
           >
             <div className="flex items-center gap-4">
               <Globe className="w-5 h-5" />
               <span className="group-hover:text-white">{t('sidebar.language')}</span>
             </div>
             <span className="bg-white/10 px-2 py-0.5 rounded text-xs uppercase">{language}</span>
           </button>
        </div>
        <div className="mt-2 pt-2 border-t border-white/5">
           <NavItem icon={<LogOut />} label={t('sidebar.logout')} onClick={onLogout} />
        </div>
      </nav>
      
      <div className="p-8">
        <div className="glass flex items-center gap-4 px-6 py-5 rounded-[32px] border border-white/10 overflow-hidden group hover:border-primary/30 transition-all cursor-pointer">
           <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-500 to-blue-600 shadow-lg group-hover:animate-pulse" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate">{t('sidebar.enterprise')}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('sidebar.activePlan')}</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-white transition-colors" />
        </div>
      </div>
    </aside>
  );
};
