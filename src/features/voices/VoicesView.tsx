import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Mic, Trash2, Edit3, X } from 'lucide-react';
import { Voice } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';

interface VoicesViewProps {
  voices: Voice[];
  onAdd: (data: { voiceId: string, name: string, provider: string }) => void;
  onUpdate: (id: string, data: { voiceId: string, name: string, provider: string }) => void;
  onDelete: (id: string) => void;
}

export const VoicesView: React.FC<VoicesViewProps> = ({ voices, onAdd, onUpdate, onDelete }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVoice, setEditingVoice] = useState<Voice | null>(null);
  const [formData, setFormData] = useState({ voiceId: '', name: '', provider: 'ohfree' });
  const { t } = useLanguage();

  const providers = ['ohfree', 'edge', 'elevenlabs', 'lucylab', 'gemini'];

  const openAdd = () => {
    setEditingVoice(null);
    setFormData({ voiceId: '', name: '', provider: 'ohfree' });
    setIsModalOpen(true);
  };

  const openEdit = (v: Voice) => {
    setEditingVoice(v);
    setFormData({ voiceId: v.voiceId, name: v.name, provider: v.provider });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingVoice) {
      onUpdate(editingVoice.id, formData);
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
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white mb-1 uppercase">Quản lý <span className="text-primary">Giọng đọc</span></h1>
            <p className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-[0.2em]">Cấu hình công nghệ chuyển đổi văn bản sang âm thanh</p>
          </div>
          <button 
            onClick={openAdd}
            className="flex items-center justify-center gap-3 bg-primary text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg glow-primary hover:opacity-90 transition-all min-w-0"
          >
            <Plus className="w-5 h-5 shrink-0" /> 
            <span className="truncate">Thêm Giọng đọc</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="px-6 py-8 md:px-12 md:py-10">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Desktop Table */}
          <div className="hidden md:block glass rounded-[32px] border border-white/5 overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white/5">
                  <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Tên giọng đọc</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Nhà cung cấp</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Voice ID</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {voices.map(voice => (
                  <tr key={voice.id} className="group hover:bg-white/[0.02] transition-colors">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center group-hover:scale-110 transition-all"><Mic className="w-5 h-5" /></div>
                        <span className="font-bold text-white">{voice.name}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6"><span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-900 px-3 py-1.5 rounded-lg border border-white/5">{voice.provider}</span></td>
                    <td className="px-8 py-6"><code className="text-xs text-slate-500 font-mono bg-black/20 px-3 py-1.5 rounded-lg border border-white/5">{voice.voiceId}</code></td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={() => openEdit(voice)} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all"><Edit3 className="w-4 h-4" /></button>
                        <button onClick={() => onDelete(voice.id)} className="p-2.5 bg-red-500/10 hover:bg-red-500/20 rounded-xl text-red-500 transition-all"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Grid */}
          <div className="grid grid-cols-1 md:hidden gap-4">
            {voices.map(voice => (
              <div key={voice.id} className="glass p-6 rounded-3xl border border-white/5">
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-3 bg-primary/10 text-primary rounded-2xl"><Mic className="w-6 h-6" /></div>
                  <div>
                    <h3 className="font-bold text-white">{voice.name}</h3>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{voice.provider}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-6 border-t border-white/5">
                  <code className="text-[10px] text-slate-500 font-mono">ID: {voice.voiceId}</code>
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(voice)} className="p-2 bg-white/5 rounded-xl text-slate-400"><Edit3 className="w-4 h-4" /></button>
                    <button onClick={() => onDelete(voice.id)} className="p-2 bg-red-500/10 rounded-xl text-red-500"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {voices.length === 0 && (
            <div className="py-40 flex flex-col items-center justify-center text-slate-700 bg-slate-900/10 border-2 border-dashed border-slate-800 rounded-[44px]">
              <Mic className="w-16 h-16 mb-4 opacity-10" />
              <p className="font-bold uppercase tracking-widest text-sm">Chưa có giọng đọc nào được lưu</p>
            </div>
          )}
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
                <h2 className="text-2xl font-black text-white">{editingVoice ? 'Sửa Giọng' : 'Thêm Giọng'}</h2>
                <button onClick={() => setIsModalOpen(false)} type="button" className="p-2.5 bg-white/5 rounded-xl"><X className="w-6 h-6 text-slate-400" /></button>
              </div>

              <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar flex-1">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Tên hiển thị</label>
                  <input type="text" required placeholder="Tên" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-white/5 border border-white/5 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-primary/50" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Nhà cung cấp</label>
                  <select value={formData.provider} onChange={e => setFormData({...formData, provider: e.target.value})} className="w-full bg-white/5 border border-white/5 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-primary/50 cursor-pointer">
                    {providers.map(p => <option key={p} value={p} className="bg-slate-900 capitalize">{p}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Voice ID</label>
                  <input type="text" required placeholder="Voice ID" value={formData.voiceId} onChange={e => setFormData({...formData, voiceId: e.target.value})} className="w-full bg-white/5 border border-white/5 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-primary/50 font-mono text-sm" />
                </div>
              </div>

              <div className="flex gap-4 mt-8 pt-6 border-t border-white/5">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 text-slate-500 font-black uppercase tracking-widest text-[11px]">{t('common.cancel')}</button>
                <button type="submit" className="flex-2 bg-primary text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-lg glow-primary">{editingVoice ? t('common.save') : 'Thêm Giọng'}</button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
