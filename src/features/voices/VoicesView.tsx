import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Mic, Trash2, Edit3, X, Database } from 'lucide-react';
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
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-white mb-2 uppercase">Quản lý <span className="text-primary">Giọng đọc</span></h1>
          <p className="text-slate-400 font-medium">Danh sách các giọng đọc tùy chỉnh được lưu trữ trong hệ thống.</p>
        </div>
        <button 
          onClick={openAdd}
          className="flex items-center justify-center gap-3 bg-primary text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg glow-primary hover:opacity-90 transition-all"
        >
          <Plus className="w-5 h-5" /> Thêm Giọng đọc
        </button>
      </div>

      {/* Desktop List View */}
      <div className="hidden md:block glass rounded-[32px] border border-white/5 overflow-hidden shadow-2xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/5 bg-white/5">
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
                    <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Mic className="w-5 h-5" />
                    </div>
                    <span className="font-bold text-white text-base">{voice.name}</span>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-900/50 px-3 py-1.5 rounded-lg border border-white/5">
                    {voice.provider}
                  </span>
                </td>
                <td className="px-8 py-6">
                  <code className="text-xs text-slate-500 font-mono bg-black/20 px-3 py-1.5 rounded-lg border border-white/5">
                    {voice.voiceId}
                  </code>
                </td>
                <td className="px-8 py-6 text-right">
                  <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                    <button 
                      onClick={() => openEdit(voice)} 
                      className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all border border-white/5"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => onDelete(voice.id)} 
                      className="p-2.5 bg-red-500/10 hover:bg-red-500/20 rounded-xl text-red-500 transition-all border border-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {voices.length === 0 && (
          <div className="py-24 flex flex-col items-center justify-center text-slate-500">
            <Mic className="w-16 h-16 mb-4 opacity-10" />
            <p className="font-bold uppercase tracking-widest text-xs">Chưa có giọng đọc nào được lưu</p>
          </div>
        )}
      </div>

      {/* Mobile Card View */}
      <div className="grid grid-cols-1 md:hidden gap-4">
        {voices.map(voice => (
          <div key={voice.id} className="glass p-6 rounded-3xl border border-white/5 relative overflow-hidden">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-primary/10 text-primary rounded-2xl">
                <Mic className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-white">{voice.name}</h3>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{voice.provider}</span>
              </div>
            </div>
            <div className="flex items-center justify-between mt-6 pt-6 border-t border-white/5">
              <code className="text-[10px] text-slate-500 font-mono">ID: {voice.voiceId}</code>
              <div className="flex gap-2">
                <button onClick={() => openEdit(voice)} className="p-2 bg-white/5 rounded-xl text-slate-400">
                  <Edit3 className="w-4 h-4" />
                </button>
                <button onClick={() => onDelete(voice.id)} className="p-2 bg-red-500/10 rounded-xl text-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {voices.length === 0 && (
          <div className="py-20 flex flex-col items-center justify-center text-slate-600 border-2 border-dashed border-white/5 rounded-[32px]">
            <p className="text-xs font-bold uppercase tracking-widest">No voices found</p>
          </div>
        )}
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
                <h2 className="text-2xl font-bold">{editingVoice ? 'Edit Voice' : 'Add New Voice'}</h2>
                <button onClick={() => setIsModalOpen(false)} type="button" className="p-2 text-slate-400 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-black uppercase text-slate-500 tracking-widest mb-3">Display Name</label>
                  <input 
                    type="text" required
                    placeholder="e.g. Thế Hào"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:border-primary/50 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-slate-500 tracking-widest mb-3">Provider / Model</label>
                  <select 
                    value={formData.provider}
                    onChange={e => setFormData({...formData, provider: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:border-primary/50 transition-all appearance-none"
                  >
                    {providers.map(p => (
                      <option key={p} value={p} className="bg-slate-900 capitalize">{p}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-slate-500 tracking-widest mb-3">Voice ID</label>
                  <input 
                    type="text" required
                    placeholder="e.g. 1402 or vi-VN-HoaiMyNeural"
                    value={formData.voiceId}
                    onChange={e => setFormData({...formData, voiceId: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:border-primary/50 transition-all"
                  />
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
                    {editingVoice ? t('common.save') : 'Add Voice'}
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
