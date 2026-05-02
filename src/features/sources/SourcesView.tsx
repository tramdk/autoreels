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
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-white mb-2">{t('sources.title')}</h1>
          <p className="text-slate-400">{t('sources.addTitle')}</p>
        </div>
        <button 
          onClick={openAdd}
          className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-2xl font-bold shadow-lg glow-primary hover:opacity-90 transition-all"
        >
          <Plus className="w-5 h-5" /> {t('sources.addBtn')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sources.map(source => (
          <div key={source.id} className="glass group p-6 rounded-3xl border border-white/5 hover:border-primary/20 transition-all flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
              <button 
                onClick={() => openEdit(source)}
                className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all"
              >
                <Edit3 className="w-4 h-4" />
              </button>
              <button 
                onClick={() => onDelete(source.id)}
                className="p-2 bg-red-500/10 hover:bg-red-500/20 rounded-xl text-red-500 transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-primary/10 text-primary rounded-2xl">
                <Rss className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white truncate max-w-[150px]">{source.name}</h3>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{source.type} Feed</span>
              </div>
            </div>

            <div className="mt-auto px-4 py-3 bg-slate-900/50 rounded-2xl border border-white/5 group-hover:bg-slate-900 transition-colors flex items-center gap-2">
              <Link className="w-3 h-3 text-slate-600" />
              <p className="text-[11px] text-slate-400 truncate font-mono">{source.url}</p>
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.form 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onSubmit={handleSubmit}
              className="glass w-full max-w-lg p-8 rounded-[32px] border border-white/10 shadow-2xl relative z-10"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold">{editingSource ? t('common.actions') : t('sources.addTitle')}</h2>
                <button onClick={() => setIsModalOpen(false)} type="button" className="p-2 text-slate-400 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-black uppercase text-slate-500 tracking-widest mb-3">{t('sources.name')}</label>
                  <input 
                    type="text" required
                    placeholder="e.g. VnExpress Technology"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:border-primary/50 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-slate-500 tracking-widest mb-3">{t('sources.url')}</label>
                  <input 
                    type="url" required
                    placeholder="https://..."
                    value={formData.url}
                    onChange={e => setFormData({...formData, url: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:border-primary/50 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-slate-500 tracking-widest mb-3">{t('sources.type')}</label>
                  <select 
                    value={formData.type}
                    onChange={e => setFormData({...formData, type: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:border-primary/50 transition-all appearance-none"
                  >
                    <option value="rss">RSS Feed (Recommended)</option>
                    <option value="web">Direct Web URL</option>
                  </select>
                </div>

                <div className="flex gap-4 mt-8">
                  <button 
                    type="button" onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-6 py-4 rounded-2xl font-bold text-slate-400 hover:text-white transition-all"
                  >
                    {t('common.cancel')}
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 bg-primary text-white px-6 py-4 rounded-2xl font-bold shadow-lg glow-primary hover:opacity-90 transition-all"
                  >
                    {editingSource ? t('common.save') : t('sources.addBtn')}
                  </button>
                </div>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
