import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Save, 
  Plus, 
  Trash2, 
  Image as ImageIcon, 
  Video as VideoIcon,
  Layout,
  History as HistoryIcon,
  Link as LinkIcon,
  Upload
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { AssetPicker } from '../../components/ui/AssetPicker';
import { GenerateVideoAction } from '../../components/ui/GenerateVideoAction';
import { api } from '../../services/api';
import { toast } from 'react-hot-toast';

interface StudioViewProps {
  onCreateManualScript: (data: { title: string, script: any }) => Promise<any>;
  onGenerateVideo: (id: string, templateId?: string) => void;
  loading: boolean;
}

export const StudioView: React.FC<StudioViewProps> = ({ onCreateManualScript, onGenerateVideo, loading }) => {
  const { t } = useLanguage();
  const [title, setTitle] = React.useState('');
  const [script, setScript] = React.useState({
    scenes: [
      { id: 1, type: 'hook', voiceText: '', imageKeyword: 'news', imageUrl: '' },
      { id: 2, type: 'body', voiceText: '', imageKeyword: 'report', imageUrl: '' },
      { id: 3, type: 'outro', voiceText: '', imageKeyword: 'cta', imageUrl: '' }
    ]
  });
  
  const [lastSavedArticleId, setLastSavedArticleId] = React.useState<string | null>(null);
  const [showAssetPicker, setShowAssetPicker] = React.useState<{ active: boolean; index: number | null }>({ active: false, index: null });
  const [isDirty, setIsDirty] = React.useState(false);

  const handleFieldChange = (fn: () => void) => {
    fn();
    setIsDirty(true);
  };

  const addScene = () => {
    handleFieldChange(() => {
      const newId = script.scenes.length + 1;
      const newScene = { id: newId, type: 'body', voiceText: '', imageKeyword: 'report', imageUrl: '' };
      const scenes = [...script.scenes];
      const outroIdx = scenes.findIndex(s => s.type === 'outro');
      if (outroIdx !== -1) {
        scenes.splice(outroIdx, 0, newScene);
      } else {
        scenes.push(newScene);
      }
      setScript({ ...script, scenes: scenes.map((s, i) => ({ ...s, id: i + 1 })) });
    });
  };

  const removeScene = (idx: number) => {
    handleFieldChange(() => {
      if (script.scenes.length <= 1) return;
      const scenes = script.scenes.filter((_, i) => i !== idx);
      setScript({ ...script, scenes: scenes.map((s, i) => ({ ...s, id: i + 1 })) });
    });
  };

  const updateScene = (idx: number, data: any) => {
    handleFieldChange(() => {
      const updated = [...script.scenes];
      updated[idx] = { ...updated[idx], ...data };
      setScript({ ...script, scenes: updated });
    });
  };

  const handleSave = async () => {
    if (!title) {
      toast.error('Vui lòng nhập tiêu đề');
      return;
    }
    const result = await onCreateManualScript({ title, script });
    if (result && result.id) {
      setLastSavedArticleId(result.id);
      setIsDirty(false);
      toast.success('Đã lưu kịch bản');
    }
  };

  return (
    <div className="flex flex-col">
      <div className="sticky top-[76px] lg:top-0 z-40 bg-[#0F172A]/80 backdrop-blur-xl py-4 sm:py-8 border-b border-white/5 px-6 md:px-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-white leading-tight">{t('sidebar.studio')}</h1>
            <p className="text-[10px] sm:text-sm text-slate-400 font-bold uppercase tracking-widest">{t('articles.manualDesignTab')}</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={addScene}
              className="flex-1 sm:flex-none h-12 sm:h-14 px-4 sm:px-6 rounded-2xl bg-slate-800 text-white text-[10px] sm:text-xs font-black uppercase tracking-widest border border-white/10 hover:bg-slate-700 transition-all flex items-center justify-center gap-2 min-w-0"
            >
              <Plus className="w-5 h-5 shrink-0" />
              <span className="hidden sm:inline truncate">{t('articles.addScene')}</span>
              <span className="sm:hidden">SCENE</span>
            </motion.button>

            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSave}
              disabled={loading || !title || (!isDirty && lastSavedArticleId !== null)}
              className="flex-1 sm:flex-none h-12 sm:h-14 px-4 sm:px-8 rounded-2xl bg-primary text-white text-[10px] sm:text-xs font-black uppercase tracking-widest shadow-lg glow-primary disabled:opacity-50 transition-all flex items-center justify-center gap-2 min-w-0"
            >
              <Save className="w-5 h-5 shrink-0" />
              <span className="truncate">{t('common.save')}</span>
            </motion.button>
            
            {lastSavedArticleId && (
              <GenerateVideoAction 
                articleId={lastSavedArticleId}
                loading={loading || isDirty}
                onGenerate={onGenerateVideo}
                t={t}
              />
            )}
          </div>
        </div>
      </div>

      <div className="px-6 py-8 md:px-12 md:py-10">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="glass rounded-[32px] p-8 border border-white/5 space-y-6">
              <div>
                  <label className="block text-xs font-black uppercase text-slate-500 mb-3 tracking-widest">{t('articles.articleTitle')}</label>
                  <input 
                    type="text"
                    placeholder={t('articles.placeholderTitle')}
                    value={title} 
                    onChange={e => handleFieldChange(() => setTitle(e.target.value))}
                    className="w-full bg-white/5 border border-white/5 rounded-2xl px-6 py-4 text-white text-xl font-bold focus:border-primary/50 focus:outline-none transition-all"
                  />
                </div>

                <div className="space-y-4">
                  <label className="block text-xs font-black uppercase text-slate-500 mb-1 tracking-widest">{t('dashboard.activePipeline')}</label>
                  <div className="space-y-4">
                    {script.scenes.map((scene, idx) => {
                      const typeColors: Record<string, string> = {
                        hook: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
                        body: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
                        outro: 'text-green-400 bg-green-400/10 border-green-400/20',
                      };
                      const color = typeColors[scene.type] || 'text-slate-400 bg-white/5 border-white/10';
                      return (
                        <motion.div 
                          layout
                          key={idx} 
                          className="p-6 rounded-3xl bg-slate-800/40 border border-white/5 space-y-4 hover:bg-slate-800/60 transition-all group"
                        >
                          <div className="flex flex-col md:flex-row md:items-center gap-4">
                              <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border ${color} shrink-0`}>
                                {scene.type} #{scene.id}
                              </span>
                              
                              <div className="flex-1 flex items-center gap-3 bg-white/5 rounded-2xl p-1 border border-white/5">
                                <div className="w-10 h-10 rounded-xl bg-slate-900 border border-white/5 overflow-hidden flex items-center justify-center shrink-0">
                                  {scene.imageUrl ? <img src={scene.imageUrl} className="w-full h-full object-cover" alt="" /> : <ImageIcon className="w-4 h-4 text-slate-600" />}
                                </div>
                                <div className="flex-1 relative">
                                    <LinkIcon className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                    <input 
                                      type="text" 
                                      value={scene.imageUrl}
                                      onChange={e => updateScene(idx, { imageUrl: e.target.value })}
                                      placeholder="Paste Image URL..."
                                      className="w-full bg-transparent border-none text-[11px] text-white font-medium pl-9 pr-4 py-2 focus:ring-0 outline-none"
                                    />
                                </div>
                                <button 
                                  onClick={() => setShowAssetPicker({ active: true, index: idx })}
                                  className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-[10px] font-bold text-slate-400 hover:text-white transition-all whitespace-nowrap"
                                >
                                  <Upload className="w-3.5 h-3.5" />
                                  PICK / UPLOAD
                                </button>
                              </div>

                              {script.scenes.length > 1 && (
                                <button onClick={() => removeScene(idx)} className="p-2 text-slate-600 hover:text-rose-500 transition-colors shrink-0">
                                  <Trash2 className="w-5 h-5" />
                                </button>
                              )}
                            </div>
                            <textarea
                              value={scene.voiceText}
                              onChange={e => updateScene(idx, { voiceText: e.target.value })}
                              placeholder="Voice text..."
                              className="w-full bg-white/5 border border-white/5 rounded-2xl p-5 text-white text-lg leading-relaxed focus:border-primary/50 focus:outline-none resize-none"
                              rows={3}
                            />
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="glass rounded-[32px] p-8 border border-white/5">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                  <VideoIcon className="w-5 h-5 text-primary" />
                  Preview & Tips
                </h3>
                <div className="space-y-4 text-sm text-slate-400 leading-relaxed">
                  <p>• 1 cảnh khoảng 10-15 giây là lý tưởng.</p>
                  <p>• Hook nên ngắn gọn và gây tò mò.</p>
                  <p>• Outro nên có lời kêu gọi hành động.</p>
                  <p>• Hình nền đẹp giúp giữ chân người xem.</p>
                </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showAssetPicker.active && (
          <AssetPicker 
            onSelect={(url) => {
              const idx = showAssetPicker.index;
              if (idx !== null) {
                updateScene(idx, { imageUrl: url });
              }
              setShowAssetPicker({ active: false, index: null });
            }}
            onClose={() => setShowAssetPicker({ active: false, index: null })}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
