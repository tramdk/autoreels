import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Rss, Trash2, Edit3, X, Link } from 'lucide-react';
import { Source } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';

interface SourcesViewProps {
  sources: Source[];
  onAdd: (data: { name: string, url: string, type: string }) => void;
  onUpdate: (id: string, data: { name: string, url: string, type: string }) => void;
  onDelete: (id: string) => void;
}

export const SourcesView: React.FC<SourcesViewProps> = ({ sources, onAdd, onUpdate, onDelete }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<Source | null>(null);
  const [formData, setFormData] = useState({ name: '', url: '', type: 'rss' });
  const { t } = useLanguage();

  const openAdd = () => {
    setEditingSource(null);
    setFormData({ name: '', url: '', type: 'rss' });
    setIsModalOpen(true);
  };

  const openEdit = (s: Source) => {
    setEditingSource(s);
    setFormData({ name: s.name, url: s.url, type: s.type });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSource) {
      onUpdate(editingSource.id, formData);
    } else {
      onAdd(formData);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="flex flex-col">
      {/* Sticky Header */}
      <div className="sticky top-[76px] lg:top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-white/5 px-6 py-6 md:px-12 md:py-8 shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white mb-1">{t('sources.title')}</h1>
            <p className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-[0.2em]">{t('sources.addTitle')}</p>
          </div>
          <button 
            onClick={openAdd}
            className="flex items-center justify-center gap-2 bg-primary text-white px-8 py-4 rounded-2xl font-black uppercase text-xs shadow-lg glow-primary hover:opacity-90 transition-all tracking-[0.2em] min-w-0"
          >
            <Plus className="w-5 h-5 shrink-0" /> 
            <span className="truncate">{t('sources.addBtn')}</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="px-6 py-8 md:px-12 md:py-10">
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {sources.map(source => (
            <div key={source.id} className="glass group p-6 rounded-[32px] border border-white/5 hover:border-primary/20 transition-all flex flex-col relative overflow-hidden">
              <div className="absolute top-4 right-4 flex gap-1.5 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <button onClick={() => openEdit(source)} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all border border-white/5"><Edit3 className="w-4 h-4" /></button>
                <button onClick={() => onDelete(source.id)} className="p-2.5 bg-red-500/10 hover:bg-red-500/20 rounded-xl text-red-500 transition-all border-red-500/10"><Trash2 className="w-4 h-4" /></button>
              </div>

              <div className="flex items-center gap-4 mb-8">
                <div className="p-4 bg-primary/10 text-primary rounded-2xl border border-primary/10"><Rss className="w-6 h-6" /></div>
                <div className="min-w-0 pr-16 sm:pr-0">
                  <h3 className="text-lg font-bold text-white truncate">{source.name}</h3>
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest bg-white/5 px-2 py-1 rounded-lg border border-white/5">{source.type} Feed</span>
                </div>
              </div>

              <div className="mt-auto px-4 py-4 bg-slate-900/50 rounded-2xl border border-white/5 group-hover:bg-slate-900 transition-colors flex items-center gap-3">
                <Link className="w-4 h-4 text-slate-600 shrink-0" />
                <p className="text-[10px] text-slate-400 truncate font-mono">{source.url}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/95 backdrop-blur-xl" />
            <motion.form 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onSubmit={handleSubmit}
              className="glass w-full max-w-lg p-8 rounded-[40px] border border-white/10 shadow-3xl relative z-10 flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black text-white">{editingSource ? t('common.actions') : t('sources.addTitle')}</h2>
                <button onClick={() => setIsModalOpen(false)} type="button" className="p-2.5 bg-white/5 rounded-xl"><X className="w-6 h-6 text-slate-400" /></button>
              </div>

              <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar flex-1">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">{t('sources.name')}</label>
                  <input type="text" required placeholder="Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-white/5 border border-white/5 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-primary/50" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">{t('sources.url')}</label>
                  <input type="url" required placeholder="https://..." value={formData.url} onChange={e => setFormData({...formData, url: e.target.value})} className="w-full bg-white/5 border border-white/5 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-primary/50 font-mono text-sm" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">{t('sources.type')}</label>
                  <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full bg-white/5 border border-white/5 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-primary/50 cursor-pointer">
                    <option value="rss">RSS Feed</option>
                    <option value="web">Web Scraper</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-4 mt-8 pt-6 border-t border-white/5">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 text-slate-500 font-black uppercase tracking-widest text-[11px]">{t('common.cancel')}</button>
                <button type="submit" className="flex-2 bg-primary text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-lg glow-primary">{editingSource ? t('common.save') : t('sources.addBtn')}</button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
