import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  RefreshCw, 
  Rss, 
  FileText, 
  Video, 
  CheckCircle2, 
  Zap, 
  Wand2, 
  ExternalLink,
  Edit,
  X,
  Save,
  Plus
} from 'lucide-react';
import { StatCard } from '../../components/ui/StatCard';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Source, Article, VideoItem } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';

interface DashboardViewProps {
  sources: Source[];
  articles: Article[];
  videos: VideoItem[];
  loading: boolean;
  onScrape: () => void;
  onSummarize: (id: string) => void;
  onGenerateVideo: (id: string) => void;
  onUpdateScript: (id: string, script: any) => void;
  onCreateManualArticle: (data: { title: string, content: string }) => void;
  renderingVideos: Record<string, number>;
}

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
  renderingVideos
}) => {
  const { t } = useLanguage();
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [tempScript, setTempScript] = useState<any>(null);
  const [isAddingManual, setIsAddingManual] = useState(false);
  const [manualData, setManualData] = useState({ title: '', content: '', imageUrl: '' });

  const startEditing = (article: Article) => {
    setEditingArticle(article);
    setTempScript(article.script ? JSON.parse(article.script as string) : null);
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

  const getArticleProgress = (articleId: string) => {
    const key = Object.keys(renderingVideos).find(k => k.startsWith(`v_${articleId}_`));
    return key ? renderingVideos[key] : null;
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      {/* Header Stat Cards as before... */}
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
        <StatCard title={t('dashboard.sources')} value={sources.length} icon={<Rss className="w-5 h-5" />} color="rose" />
        <StatCard title={t('dashboard.articles')} value={articles.length} icon={<FileText className="w-5 h-5" />} color="blue" />
        <StatCard title={t('dashboard.videos')} value={videos.length} icon={<Video className="w-5 h-5" />} color="purple" />
        <StatCard title={t('dashboard.posted')} value={videos.filter(v => v.status === 'posted').length} icon={<CheckCircle2 className="w-5 h-5" />} color="green" />
      </div>
      
      <div className="glass rounded-3xl p-8 border border-white/5">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 text-primary rounded-xl">
              <Zap className="w-5 h-5" />
            </div>
            <h2 className="text-2xl font-bold text-white">{t('dashboard.activePipeline')}</h2>
          </div>
        </div>
        
        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
          <AnimatePresence mode="popLayout">
            {articles.slice(0, 15).map((article, idx) => (
              <motion.div 
                key={article.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="group flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-2xl bg-slate-800/40 border border-white/5 hover:bg-slate-800/60 transition-all gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-900/50 px-2 py-0.5 rounded border border-white/5">
                      {typeof article.source === 'string' ? article.source : (article.source?.name || 'Unknown')}
                    </span>
                    <StatusBadge status={article.status} />
                  </div>
                  <h3 className="text-base font-semibold text-slate-200 truncate">{article.title}</h3>
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
                      <button onClick={() => onGenerateVideo(article.id)} disabled={loading} className="bg-purple-600/10 text-purple-400 hover:bg-purple-600/20 px-4 py-2 rounded-xl text-sm font-bold border border-purple-500/20 transition-all flex items-center gap-2 font-mono">
                         <Video className="w-4 h-4" /> {t('dashboard.generate')}
                      </button>
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
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
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
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-white">{t('articles.editTitle')}</h2>
                  <p className="text-slate-500 text-sm">{t('articles.editSubtitle')}</p>
                </div>
                <button onClick={() => setEditingArticle(null)} className="p-2 text-slate-400 hover:text-white"><X className="w-6 h-6" /></button>
              </div>

              <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-4 custom-scrollbar">
                <div>
                   <label className="block text-xs font-black uppercase text-slate-600 mb-2">{t('articles.hook')}</label>
                   <textarea 
                    value={tempScript.hook} 
                    onChange={e => setTempScript({...tempScript, hook: e.target.value})}
                    className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-white text-lg font-bold leading-relaxed focus:border-primary/50 focus:outline-none min-h-[100px]"
                   />
                </div>
                <div>
                   <label className="block text-xs font-black uppercase text-slate-600 mb-2">{t('articles.body')}</label>
                   <textarea 
                    value={tempScript.body} 
                    onChange={e => setTempScript({...tempScript, body: e.target.value})}
                    className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-white leading-relaxed focus:border-primary/50 focus:outline-none min-h-[200px]"
                   />
                </div>
                <div>
                   <label className="block text-xs font-black uppercase text-slate-600 mb-2">{t('articles.cta')}</label>
                   <input 
                    type="text"
                    value={tempScript.cta} 
                    onChange={e => setTempScript({...tempScript, cta: e.target.value})}
                    className="w-full bg-white/5 border border-white/5 rounded-2xl px-4 py-3 text-white font-medium focus:border-primary/50 focus:outline-none"
                   />
                </div>
              </div>

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
              className="glass w-full max-w-xl p-8 rounded-[40px] border border-white/10 shadow-3xl relative z-10 overflow-hidden"
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
    </motion.div>
  );
};
