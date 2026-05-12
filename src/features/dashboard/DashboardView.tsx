import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  RefreshCw, 
  Rss, 
  FileText, 
  Video as VideoIcon, 
  CheckCircle2, 
  Zap, 
  Wand2, 
  Plus, 
  Edit, 
  Trash2, 
  ArrowUpRight,
  X,
  Save,
  Image as ImageIcon,
  History as HistoryIcon
} from 'lucide-react';
import { StatCard } from '../../components/ui/StatCard';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Source, Article, VideoItem } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { AssetPicker } from '../../components/ui/AssetPicker';
import { GenerateVideoAction } from '../../components/ui/GenerateVideoAction';
import { api } from '../../services/api';
import { toast } from 'react-hot-toast';

interface DashboardViewProps {
  sources: Source[];
  articles: Article[];
  videos: VideoItem[];
  loading: boolean;
  onScrape: () => void;
  onSummarize: (id: string) => void;
  onGenerateVideo: (id: string, templateId?: string, options?: any) => void;
  onUpdateScript: (id: string, script: any) => void;
  onCreateManualArticle: (data: { title: string, content: string }) => void;
  onCreateManualScript: (data: { title: string, script: any }) => void;
  renderingVideos: Record<string, number>;
  stats: { sources: number, articles: number, videos: number, postedVideos: number };
  page: number;
  setPage: (page: number) => void;
  totalPages: number;
}

const ArticleSkeleton = () => (
  <div className="flex flex-col p-4 sm:p-6 rounded-[24px] bg-slate-800/20 border border-white/5 gap-4">
    <div className="flex items-center justify-between">
      <div className="flex-1 space-y-2">
        <div className="w-20 h-4 skeleton-item" />
        <div className="w-3/4 h-6 skeleton-item" />
      </div>
      <div className="w-24 h-10 skeleton-item" />
    </div>
  </div>
);

export const DashboardView: React.FC<DashboardViewProps> = ({
  sources,
  articles,
  videos,
  loading,
  onScrape,
  onSummarize,
  onGenerateVideo,
  onUpdateScript,
  onCreateManualArticle,
  onCreateManualScript,
  renderingVideos,
  stats,
  page,
  setPage,
  totalPages
}) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [tempScript, setTempScript] = useState<any>(null);
  const [isAddingManual, setIsAddingManual] = useState(false);
  const [manualData, setManualData] = useState<any>({ title: '', content: '' });
  const [showAssetPicker, setShowAssetPicker] = useState<{ active: boolean; index: number | null }>({ active: false, index: null });

  const startEditing = (article: Article) => {
    setEditingArticle(article);
    const script = article.script;
    if (script) {
      setTempScript(typeof script === 'string' ? JSON.parse(script) : script);
    } else {
      setTempScript(null);
    }
  };

  const handleSaveScript = () => {
    if (editingArticle && tempScript) {
      onUpdateScript(editingArticle.id, tempScript);
      setEditingArticle(null);
    }
  };

  const handleCreateManual = () => {
    if (!manualData.title || !manualData.content) return;
    onCreateManualArticle(manualData);
    setIsAddingManual(false);
    setManualData({ title: '', content: '', imageUrl: '' });
  };

  const addScene = (isTemp: boolean = true) => {
    const target = isTemp ? tempScript : null;
    if (!target || !target.scenes) return;
    
    const scenes = [...target.scenes];
    const newId = scenes.length + 1;
    const newScene = { id: newId, type: 'body', voiceText: '', bodyText: '', imageKeyword: 'report', imageUrl: '' };
    
    const outroIdx = scenes.findIndex((s: any) => s.type === 'outro');
    if (outroIdx !== -1) {
      scenes.splice(outroIdx, 0, newScene);
    } else {
      scenes.push(newScene);
    }
    
    setTempScript({ ...target, scenes: scenes.map((s, i) => ({ ...s, id: i + 1 })) });
  };

  const removeScene = (idx: number) => {
    if (!tempScript || !tempScript.scenes || tempScript.scenes.length <= 1) return;
    const scenes = tempScript.scenes.filter((_: any, i: number) => i !== idx);
    setTempScript({ ...tempScript, scenes: scenes.map((s: any, i: number) => ({ ...s, id: i + 1 })) });
  };

  const getArticleProgress = (articleId: string) => {
    const key = Object.keys(renderingVideos).find(k => k.startsWith(`v_${articleId}_`));
    return key ? renderingVideos[key] : null;
  };

  return (
    <div className="flex flex-col">
      {/* Sticky Header */}
      <div className="sticky top-[76px] lg:top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-white/5 px-6 py-6 md:px-12 md:py-8 shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white mb-1">{t('dashboard.title')}</h1>
            <p className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-[0.2em]">{t('dashboard.subtitle')}</p>
          </div>
          <div className="flex items-center gap-3">
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsAddingManual(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-slate-800 text-white px-5 py-3.5 rounded-2xl font-bold border border-white/10 hover:bg-slate-700 transition-all text-[11px] uppercase tracking-widest min-w-0"
            >
              <Plus className="w-4 h-4 shrink-0" /> 
              <span className="truncate">{t('articles.manualBtn')}</span>
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onScrape}
              disabled={loading}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-primary text-white px-6 py-3.5 rounded-2xl font-black shadow-lg glow-primary disabled:opacity-50 transition-all text-[11px] uppercase tracking-[0.2em] min-w-0"
            >
              <RefreshCw className={`w-4 h-4 shrink-0 ${loading ? 'animate-spin' : ''}`} /> 
              <span className="truncate">{t('dashboard.runPipeline')}</span>
            </motion.button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="px-6 py-8 md:px-12 md:py-10 pb-32">
        <div className="max-w-7xl mx-auto space-y-10">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <StatCard title={t('dashboard.sources')} value={stats.sources} icon={<Rss className="w-5 h-5" />} color="rose" onClick={() => navigate('/sources')} loading={loading && articles.length === 0} />
            <StatCard title={t('dashboard.articles')} value={stats.articles} icon={<FileText className="w-5 h-5" />} color="blue" onClick={() => navigate('/dashboard')} loading={loading && articles.length === 0} />
            <StatCard title={t('dashboard.videos')} value={stats.videos} icon={<VideoIcon className="w-5 h-5" />} color="purple" onClick={() => navigate('/videos')} loading={loading && articles.length === 0} />
            <StatCard title={t('dashboard.posted')} value={stats.postedVideos} icon={<CheckCircle2 className="w-5 h-5" />} color="green" onClick={() => navigate('/videos?status=posted')} loading={loading && articles.length === 0} />
          </div>

          <div className="glass rounded-[32px] p-6 sm:p-10 border border-white/5">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/20 text-primary rounded-2xl"><Zap className="w-6 h-6" /></div>
                <h2 className="text-xl sm:text-2xl font-bold text-white">{t('dashboard.activePipeline')}</h2>
              </div>
            </div>

            <div className="space-y-4">
              {loading && articles.length === 0 ? (
                Array(5).fill(0).map((_, i) => <ArticleSkeleton key={i} />)
              ) : (
                <AnimatePresence mode="popLayout">
                  {articles.map((article, idx) => (
                    <motion.div 
                      key={article.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="group p-5 sm:p-6 rounded-3xl bg-slate-800/20 border border-white/5 hover:bg-white/5 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 bg-white/5 px-2 py-0.5 rounded-lg border border-white/5">{typeof article.source === 'string' ? article.source : (article.source?.name || 'RSS')}</span>
                          <StatusBadge status={article.status} />
                        </div>
                        <h3 className="text-base sm:text-lg font-bold text-white truncate">{article.title}</h3>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {getArticleProgress(article.id) !== null ? (
                          <div className="flex flex-col items-end gap-1 min-w-[120px]">
                            <span className="text-[9px] font-black text-primary uppercase tracking-widest animate-pulse">RENDERING {getArticleProgress(article.id)}%</span>
                            <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                              <div className="h-full bg-primary" style={{ width: `${getArticleProgress(article.id)}%` }} />
                            </div>
                          </div>
                        ) : (
                          <>
                            {article.status === 'generating' && (
                              <div className="flex flex-col items-end gap-1 min-w-[120px]">
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">IN QUEUE</span>
                                <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                                  <div className="h-full bg-slate-700 animate-shimmer" style={{ width: '100%', background: 'linear-gradient(90deg, #1e293b 0%, #334155 50%, #1e293b 100%)', backgroundSize: '200% 100%' }} />
                                </div>
                              </div>
                            )}
                            {article.status === 'scraped' && (
                              <button onClick={() => onSummarize(article.id)} className="bg-blue-600/10 text-blue-400 hover:bg-blue-600/20 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-blue-500/20 transition-all flex items-center gap-2">
                                <Wand2 className="w-3.5 h-3.5 animate-wiggle" /> AI SCRIPT
                              </button>
                            )}
                            {article.status === 'summarized' && (
                              <div className="flex items-center gap-2">
                                <button onClick={() => startEditing(article)} className="p-2.5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl transition-all border border-white/5">
                                  <Edit className="w-4 h-4" />
                                </button>
                                <GenerateVideoAction articleId={article.id} loading={loading} onGenerate={onGenerateVideo} t={t} />
                              </div>
                            )}
                          </>
                        )}
                        <a href={article.link} target="_blank" rel="noopener noreferrer" className="p-2.5 text-slate-600 hover:text-white transition-all"><ArrowUpRight className="w-4 h-4" /></a>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>

            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 mt-10 pt-8 border-t border-white/5 pb-10">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="flex-1 sm:flex-none px-5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-white disabled:opacity-20 transition-all">Prev</button>
                  <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="flex-1 sm:flex-none px-5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-white disabled:opacity-20 transition-all">Next</button>
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Page <span className="text-primary">{page}</span> of {totalPages}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Script Editor Modal */}
      <AnimatePresence>
        {editingArticle && tempScript && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditingArticle(null)} className="absolute inset-0 bg-black/95 backdrop-blur-xl" />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 30 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 30 }}
              className="glass w-full max-w-2xl p-5 sm:p-8 rounded-[40px] border border-white/10 shadow-3xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 shrink-0 border-b border-white/5 pb-6">
                <div className="flex items-center justify-between w-full sm:w-auto">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/20 text-primary rounded-xl hidden sm:block"><Edit className="w-5 h-5" /></div>
                    <div>
                      <h2 className="text-lg sm:text-xl font-black text-white tracking-tight leading-tight">{t('articles.editTitle')}</h2>
                      <p className="text-slate-500 text-[9px] font-bold uppercase tracking-[0.2em]">{t('articles.editSubtitle')}</p>
                    </div>
                  </div>
                  <button onClick={() => setEditingArticle(null)} className="p-2 text-slate-500 hover:text-white bg-white/5 rounded-xl transition-all sm:hidden"><X className="w-5 h-5" /></button>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => addScene(true)} className="flex-1 sm:flex-none h-11 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-black uppercase tracking-widest border border-white/10 transition-all flex items-center justify-center gap-2 min-w-0">
                    <Plus className="w-4 h-4 shrink-0" /> 
                    <span className="hidden sm:inline truncate">Add Scene</span>
                    <span className="sm:hidden">Scene</span>
                  </button>
                  <button onClick={handleSaveScript} className="flex-1 sm:flex-none h-11 px-6 rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-widest shadow-lg glow-primary hover:opacity-90 transition-all flex items-center justify-center gap-2 min-w-0">
                    <Save className="w-4 h-4 shrink-0" /> 
                    <span className="truncate">{t('common.save')}</span>
                  </button>
                  <button onClick={() => setEditingArticle(null)} className="p-2.5 text-slate-500 hover:text-white bg-white/5 rounded-xl transition-all hidden sm:block"><X className="w-5 h-5" /></button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
                {tempScript.scenes?.map((scene: any, idx: number) => {
                  const colors: any = { hook: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20', body: 'text-blue-400 bg-blue-400/10 border-blue-400/20', outro: 'text-green-400 bg-green-400/10 border-green-400/20' };
                  return (
                    <div key={idx} className="p-5 rounded-3xl bg-slate-800/40 border border-white/5 space-y-4 relative group">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border ${colors[scene.type] || 'text-slate-400 bg-white/5 border-white/5'}`}>{scene.type} #{scene.id}</span>
                        <div className="flex-1 flex gap-2">
                          <div className="flex-1 relative">
                            <ImageIcon className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
                            <input value={scene.imageUrl || ''} onChange={e => { const updated = [...tempScript.scenes]; updated[idx] = { ...updated[idx], imageUrl: e.target.value }; setTempScript({ ...tempScript, scenes: updated }); }} placeholder="Image URL" className="w-full bg-white/5 border border-white/5 rounded-xl pl-9 pr-3 py-2 text-[11px] text-white focus:outline-none focus:border-primary/50" />
                          </div>
                          <button onClick={() => setShowAssetPicker({ active: true, index: idx })} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all"><HistoryIcon className="w-4 h-4 text-slate-500" /></button>
                        </div>
                        <button onClick={() => removeScene(idx)} className="p-2 text-slate-600 hover:text-rose-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Voice (Audio)</label>
                        <textarea value={scene.voiceText || ''} onChange={e => { const updated = [...tempScript.scenes]; updated[idx] = { ...updated[idx], voiceText: e.target.value }; setTempScript({ ...tempScript, scenes: updated }); }} rows={2} className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-white text-sm focus:outline-none focus:border-primary/50 resize-none" />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center px-1">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Body (On-Screen Text)</label>
                          <div className="flex items-center gap-2">
                            <span className="text-[8px] font-bold text-slate-400">COLOR</span>
                            <input 
                              type="color" 
                              value={scene.textColor || '#ffffff'} 
                              onChange={e => { const updated = [...tempScript.scenes]; updated[idx] = { ...updated[idx], textColor: e.target.value }; setTempScript({ ...tempScript, scenes: updated }); }}
                              className="w-4 h-4 rounded cursor-pointer bg-transparent border-none"
                            />
                          </div>
                        </div>
                        <textarea value={scene.bodyText || ''} onChange={e => { const updated = [...tempScript.scenes]; updated[idx] = { ...updated[idx], bodyText: e.target.value }; setTempScript({ ...tempScript, scenes: updated }); }} rows={2} className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-white text-sm focus:outline-none focus:border-primary/50 resize-none" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Manual Article Modal */}
      <AnimatePresence>
        {isAddingManual && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAddingManual(false)} className="absolute inset-0 bg-black/95 backdrop-blur-xl" />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 30 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 30 }}
              className="glass w-full max-w-xl p-6 sm:p-10 rounded-[40px] border border-white/10 shadow-3xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl sm:text-2xl font-black text-white">{t('articles.addManualTitle')}</h2>
                <button onClick={() => setIsAddingManual(false)} className="p-2 bg-white/5 rounded-xl"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar flex-1">
                <input placeholder={t('articles.placeholderTitle')} value={manualData.title} onChange={e => setManualData({...manualData, title: e.target.value})} className="w-full bg-white/5 border border-white/5 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-primary/50" />
                <textarea placeholder={t('articles.placeholderContent')} value={manualData.content} onChange={e => setManualData({...manualData, content: e.target.value})} className="w-full bg-white/5 border border-white/5 rounded-2xl p-5 text-white leading-relaxed focus:outline-none focus:border-primary/50 min-h-[250px]" />
              </div>
              <div className="flex gap-4 mt-8 pt-6 border-t border-white/5">
                <button onClick={() => setIsAddingManual(false)} className="flex-1 py-4 text-slate-500 font-bold uppercase tracking-widest text-[11px]">{t('common.cancel')}</button>
                <button onClick={handleCreateManual} disabled={!manualData.title || !manualData.content} className="flex-2 bg-primary text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-lg glow-primary disabled:opacity-50">{t('articles.manualBtn')}</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAssetPicker.active && (
          <AssetPicker 
            onSelect={(url) => {
              const idx = showAssetPicker.index;
              if (idx !== null && tempScript) {
                const updated = [...tempScript.scenes];
                updated[idx] = { ...updated[idx], imageUrl: url };
                setTempScript({ ...tempScript, scenes: updated });
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
