import React, { useState, useEffect } from 'react';
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
  ChevronRight, 
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
  onGenerateVideo: (id: string, templateId?: string, options?: { ttsProvider?: string, ttsVoiceId?: string }) => void;
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
  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-2xl bg-slate-800/40 border border-white/5 gap-4">
    <div className="flex-1 space-y-2">
      <div className="flex gap-2">
        <div className="w-16 h-4 skeleton-item" />
        <div className="w-20 h-4 skeleton-item" />
      </div>
      <div className="w-3/4 h-6 skeleton-item" />
    </div>
    <div className="flex gap-2">
      <div className="w-24 h-10 skeleton-item" />
      <div className="w-10 h-10 skeleton-item" />
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
  const [editingArticle, setEditingArticle] = React.useState<Article | null>(null);
  const [tempScript, setTempScript] = React.useState<any>(null);
  const [templateId, setTemplateId] = React.useState('classic');
  const [isAddingManual, setIsAddingManual] = React.useState(false);
  const [manualData, setManualData] = React.useState<any>({ title: '', content: '' });
  const [showAssetPicker, setShowAssetPicker] = React.useState<{ active: boolean; index: number | null }>({ active: false, index: null });

  const SCALE = 240 / 1080; // Smaller scale for popup

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
    const setTarget = isTemp ? setTempScript : null;
    
    if (!target || !target.scenes || !setTarget) return;
    
    const newId = target.scenes.length + 1;
    const newScene = { id: newId, type: 'body', voiceText: '', imageKeyword: 'report', imageUrl: '' };
    
    // Insert before outro if possible
    const scenes = [...target.scenes];
    const outroIdx = scenes.findIndex((s: any) => s.type === 'outro');
    if (outroIdx !== -1) {
      scenes.splice(outroIdx, 0, newScene);
    } else {
      scenes.push(newScene);
    }
    
    // Re-id
    const reIded = scenes.map((s, i) => ({ ...s, id: i + 1 }));
    setTarget({ ...target, scenes: reIded });
  };

  const removeScene = (idx: number, isTemp: boolean = true) => {
    const target = isTemp ? tempScript : null;
    const setTarget = isTemp ? setTempScript : null;
    
    if (!target || !target.scenes || !setTarget) return;
    if (target.scenes.length <= 1) return;
    
    const scenes = target.scenes.filter((_: any, i: number) => i !== idx);
    const reIded = scenes.map((s: any, i: number) => ({ ...s, id: i + 1 }));
    setTarget({ ...target, scenes: reIded });
  };

  const getArticleProgress = (articleId: string) => {
    const key = Object.keys(renderingVideos).find(k => k.startsWith(`v_${articleId}_`));
    return key ? renderingVideos[key] : null;
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      {/* Header Stat Cards */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-white mb-2">{t('dashboard.title')}</h1>
          <p className="text-slate-400">{t('dashboard.subtitle')}</p>
        </div>
        <div className="flex gap-3">
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsAddingManual(true)}
            disabled={loading}
            className="flex items-center justify-center gap-2 bg-slate-800 text-white px-6 py-3 rounded-2xl font-semibold border border-white/10 hover:bg-slate-700 disabled:opacity-50 transition-all"
          >
            <Plus className="w-5 h-5" />
            {t('articles.manualBtn')}
          </motion.button>
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onScrape}
            disabled={loading}
            className="flex items-center justify-center gap-2 bg-primary text-white px-6 py-3 rounded-2xl font-semibold shadow-lg glow-primary disabled:opacity-50 transition-all"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            {t('dashboard.runPipeline')}
          </motion.button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard title={t('dashboard.sources')} value={stats.sources} icon={<Rss className="w-5 h-5" />} color="rose" onClick={() => navigate('/sources')} />
        <StatCard title={t('dashboard.articles')} value={stats.articles} icon={<FileText className="w-5 h-5" />} color="blue" onClick={() => navigate('/dashboard')} />
        <StatCard title={t('dashboard.videos')} value={stats.videos} icon={<VideoIcon className="w-5 h-5" />} color="purple" onClick={() => navigate('/videos')} />
        <StatCard title={t('dashboard.posted')} value={stats.postedVideos} icon={<CheckCircle2 className="w-5 h-5" />} color="green" onClick={() => navigate('/videos?status=posted')} />
      </div>
      
      <div className="glass rounded-3xl p-8 border border-white/5">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 text-primary rounded-xl">
              <Zap className="w-5 h-5" />
            </div>
            <h2 className="text-2xl font-bold text-white">{t('dashboard.activePipeline')}</h2>
          </div>
          {loading && articles.length > 0 && (
            <div className="flex items-center gap-2 text-primary animate-pulse text-xs font-bold uppercase tracking-widest">
              <RefreshCw className="w-3 h-3 animate-spin" /> Updating...
            </div>
          )}
        </div>
        
        <div className="space-y-3 min-h-[400px] max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
          {loading && articles.length === 0 ? (
            Array(10).fill(0).map((_, i) => <ArticleSkeleton key={i} />)
          ) : (
            <AnimatePresence mode="popLayout">
              {articles.map((article, idx) => (
                <motion.div 
                  key={article.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="group relative flex flex-col sm:flex-row sm:items-center justify-between p-6 rounded-[24px] bg-slate-800/20 border border-white/5 hover:bg-white/5 hover:border-white/10 transition-all gap-4 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                  
                  <div className="flex-1 min-w-0 relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
                        {typeof article.source === 'string' ? article.source : (article.source?.name || 'Unknown')}
                      </span>
                      <StatusBadge status={article.status} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-100 tracking-tight group-hover:text-white transition-colors truncate">
                      {article.title}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {article.status === 'scraped' && (
                      <button onClick={() => onSummarize(article.id)} disabled={loading} className="bg-blue-600/10 text-blue-400 hover:bg-blue-600/20 px-4 py-2 rounded-xl text-sm font-bold border border-blue-500/20 transition-all flex items-center gap-2">
                         <Wand2 className="w-4 h-4" /> {t('dashboard.aiScript')}
                      </button>
                    )}
                    {article.status === 'summarized' && (
                      <>
                        <button onClick={() => startEditing(article)} className="p-2.5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl transition-all border border-white/5">
                           <Edit className="w-4 h-4" />
                        </button>
                        <GenerateVideoAction 
                          articleId={article.id}
                          loading={loading}
                          onGenerate={onGenerateVideo}
                          t={t}
                        />
                      </>
                    )}
                    {(() => {
                      const progress = getArticleProgress(article.id);
                      if (progress !== null && progress < 100) {
                        return (
                          <div className="flex flex-col items-end gap-1 min-w-[120px]">
                            <span className="text-[10px] font-bold text-primary animate-pulse">RENDERING {progress}%</span>
                            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                className="h-full bg-primary glow-primary"
                              />
                            </div>
                          </div>
                        );
                      }
                      if (article.status === 'generating') {
                        return <div className="px-4 py-2 rounded-xl bg-orange-500/10 text-orange-500 text-sm font-bold border border-orange-500/20 animate-pulse">{t('dashboard.rendering')}</div>;
                      }
                      return null;
                    })()}
                    <a href={article.link} target="_blank" rel="noopener noreferrer" className="p-2 text-slate-600 hover:text-white transition-colors">
                      <ArrowUpRight className="w-4 h-4" />
                    </a>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-8 pt-6 border-t border-white/5">
            <button 
              disabled={page <= 1} 
              onClick={() => setPage(page - 1)}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm font-bold text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-all"
            >
              Previous
            </button>
            <span className="text-xs font-black uppercase tracking-widest text-slate-600">
              Page <span className="text-primary">{page}</span> of {totalPages}
            </span>
            <button 
              disabled={page >= totalPages} 
              onClick={() => setPage(page + 1)}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm font-bold text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-all"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Script Editor Modal */}
      <AnimatePresence>
        {editingArticle && tempScript && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditingArticle(null)} className="absolute inset-0 bg-black/90 backdrop-blur-md" />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 30 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 30 }}
              className="glass w-full max-w-2xl p-8 rounded-[40px] border border-white/10 shadow-3xl relative z-10 overflow-hidden"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white">{t('articles.editTitle')}</h2>
                  <p className="text-slate-500 text-sm">{t('articles.editSubtitle')}</p>
                </div>
                <button onClick={() => setEditingArticle(null)} className="p-2 text-slate-400 hover:text-white"><X className="w-6 h-6" /></button>
              </div>

              {editingArticle.imageUrl && (
                <div className="mb-6 p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-black border border-white/10 flex-shrink-0">
                    <img src={editingArticle.imageUrl} alt="Source" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Source Image URL</p>
                    <p className="text-xs text-slate-400 truncate font-mono">{editingArticle.imageUrl}</p>
                  </div>
                </div>
              )}

              {/* Scene-based editor */}
              {tempScript.scenes && Array.isArray(tempScript.scenes) ? (
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-4 custom-scrollbar">
                  {tempScript.scenes.map((scene: any, idx: number) => {
                    const typeColors: Record<string, string> = {
                      hook: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
                      body: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
                      outro: 'text-green-400 bg-green-400/10 border-green-400/20',
                    };
                    const color = typeColors[scene.type] || 'text-slate-400 bg-white/5 border-white/10';
                    return (
                      <div key={idx} className="p-4 rounded-2xl bg-slate-800/40 border border-white/5 space-y-3 relative group/scene">
                        <div className="flex items-center gap-3">
                          <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border ${color}`}>
                            {scene.type} #{scene.id}
                          </span>
                          <div className="flex-1 flex gap-2">
                            <div className="flex-1 relative flex items-center gap-1.5">
                              <div className="relative flex-1">
                                <ImageIcon className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input
                                  value={scene.imageUrl || scene.image_url || ''}
                                  onChange={e => {
                                    const updated = [...tempScript.scenes];
                                    updated[idx] = { ...updated[idx], imageUrl: e.target.value };
                                    setTempScript({ ...tempScript, scenes: updated });
                                  }}
                                  placeholder="Image URL (optional)"
                                  className="w-full bg-white/5 border border-white/5 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-300 placeholder:text-slate-600 focus:border-primary/50 focus:outline-none"
                                />
                              </div>
                              <button 
                                onClick={() => setShowAssetPicker({ active: true, index: idx })}
                                className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-slate-400 hover:text-white transition-all"
                              >
                                <HistoryIcon className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <input
                              value={scene.imageKeyword || ''}
                              onChange={e => {
                                const updated = [...tempScript.scenes];
                                updated[idx] = { ...updated[idx], imageKeyword: e.target.value };
                                setTempScript({ ...tempScript, scenes: updated });
                              }}
                              placeholder="keyword"
                              className="w-24 bg-white/5 border border-white/5 rounded-xl px-3 py-1.5 text-xs text-slate-500 placeholder:text-slate-600 focus:border-primary/50 focus:outline-none font-mono"
                            />
                          </div>
                          {tempScript.scenes.length > 1 && (
                            <button 
                              onClick={() => removeScene(idx, true)}
                              className="p-1.5 text-slate-600 hover:text-rose-500 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <textarea
                          value={scene.voiceText || ''}
                          onChange={e => {
                            const updated = [...tempScript.scenes];
                            updated[idx] = { ...updated[idx], voiceText: e.target.value };
                            setTempScript({ ...tempScript, scenes: updated });
                          }}
                          rows={3}
                          className="w-full bg-white/5 border border-white/5 rounded-xl p-3 text-white text-sm leading-relaxed focus:border-primary/50 focus:outline-none resize-none"
                        />
                      </div>
                    );
                  })}
                  <button 
                    onClick={() => addScene(true)}
                    className="w-full py-4 rounded-2xl border-2 border-dashed border-white/5 text-slate-500 hover:text-white hover:border-white/10 hover:bg-white/5 transition-all flex items-center justify-center gap-2 font-bold text-sm"
                  >
                    <Plus className="w-4 h-4" /> Add Scene
                  </button>
                </div>
              ) : (
                /* Fallback: old flat format */
                <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-4 custom-scrollbar">
                  <div>
                    <label className="block text-xs font-black uppercase text-slate-600 mb-2">{t('articles.hook')}</label>
                    <textarea
                      value={tempScript.hook || ''}
                      onChange={e => setTempScript({...tempScript, hook: e.target.value})}
                      className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-white text-lg font-bold leading-relaxed focus:border-primary/50 focus:outline-none min-h-[100px]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase text-slate-600 mb-2">{t('articles.body')}</label>
                    <textarea
                      value={tempScript.body || ''}
                      onChange={e => setTempScript({...tempScript, body: e.target.value})}
                      className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-white leading-relaxed focus:border-primary/50 focus:outline-none min-h-[200px]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase text-slate-600 mb-2">{t('articles.cta')}</label>
                    <input
                      type="text"
                      value={tempScript.callToAction || tempScript.cta || ''}
                      onChange={e => setTempScript({...tempScript, callToAction: e.target.value})}
                      className="w-full bg-white/5 border border-white/5 rounded-2xl px-4 py-3 text-white font-medium focus:border-primary/50 focus:outline-none"
                    />
                  </div>
                </div>
              )}


              <div className="flex gap-4 mt-8 pt-6 border-t border-white/5">
                <button onClick={() => setEditingArticle(null)} className="flex-1 py-4 text-slate-400 font-bold hover:text-white transition-all">{t('common.discard')}</button>
                <button 
                  onClick={handleSaveScript}
                  className="flex-2 bg-primary text-white px-10 py-4 rounded-2xl font-bold shadow-lg glow-primary hover:opacity-90 flex items-center justify-center gap-2"
                >
                  <Save className="w-5 h-5" /> {t('common.save')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Manual Article Modal */}
      <AnimatePresence>
        {isAddingManual && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAddingManual(false)} className="absolute inset-0 bg-black/90 backdrop-blur-md" />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 30 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 30 }}
              className="glass w-full max-xl p-8 rounded-[40px] border border-white/10 shadow-3xl relative z-10 overflow-hidden"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-white">{t('articles.addManualTitle')}</h2>
                  <p className="text-slate-500 text-sm">{t('articles.addManualSubtitle')}</p>
                </div>
                <button onClick={() => setIsAddingManual(false)} className="p-2 text-slate-400 hover:text-white"><X className="w-6 h-6" /></button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-black uppercase text-slate-600 mb-2">{t('articles.articleTitle')}</label>
                  <input 
                    type="text"
                    placeholder={t('articles.placeholderTitle')}
                    value={manualData.title} 
                    onChange={e => setManualData({...manualData, title: e.target.value})}
                    className="w-full bg-white/5 border border-white/5 rounded-2xl px-4 py-3 text-white font-medium focus:border-primary/50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-slate-600 mb-2">{t('articles.articleContent')}</label>
                  <textarea 
                    placeholder={t('articles.placeholderContent')}
                    value={manualData.content} 
                    onChange={e => setManualData({...manualData, content: e.target.value})}
                    className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-white leading-relaxed focus:border-primary/50 focus:outline-none min-h-[250px]"
                  />
                </div>
              </div>

              <div className="flex gap-4 mt-8 pt-6 border-t border-white/5">
                <button onClick={() => setIsAddingManual(false)} className="flex-1 py-4 text-slate-400 font-bold hover:text-white transition-all">{t('common.cancel')}</button>
                <button 
                  onClick={handleCreateManual}
                  disabled={!manualData.title || !manualData.content}
                  className="flex-2 bg-primary text-white px-10 py-4 rounded-2xl font-bold shadow-lg glow-primary hover:opacity-90 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Save className="w-5 h-5" /> {t('articles.manualBtn')}
                </button>
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
              if (idx !== null) {
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
    </motion.div>
  );
};
