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
  Upload,
  Monitor,
  Smartphone,
  Square,
  Maximize,
  Sparkles,
  Zap,
  Film,
  Dna,
  Layers,
  FileText,
  Clock,
  ExternalLink,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Wand2
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { AssetPicker } from '../../components/ui/AssetPicker';
import { GenerateVideoAction } from '../../components/ui/GenerateVideoAction';
import { SummarizeAction } from '../../components/ui/SummarizeAction';
import { api } from '../../services/api';
import { toast } from 'react-hot-toast';
import { cn } from '../../utils/cn';

// Import Frames
import { CinematicFrame } from '../../components/frames/CinematicFrame';
import { CyberpunkFrame } from '../../components/frames/CyberpunkFrame';
import { GlassmorphismFrame } from '../../components/frames/GlassmorphismFrame';
import { MinimalFrame } from '../../components/frames/MinimalFrame';
import { Y2kFrame } from '../../components/frames/Y2kFrame';
import { BoldFrame } from '../../components/frames/BoldFrame';
import { ModernFrame } from '../../components/frames/ModernFrame';
import { ClassicFrame } from '../../components/frames/ClassicFrame';

type Ratio = "16:9" | "9:16" | "1:1" | "4:3";
type Style = "classic" | "modern" | "cinematic" | "cyberpunk" | "glassmorphism" | "minimal" | "y2k";

interface StudioViewProps {
  onCreateManualScript: (data: { title: string, script: any }) => Promise<any>;
  onGenerateVideo: (id: string, templateId?: string, options?: any) => void;
  loading: boolean;
}

const STYLES: { id: Style; name: string; label: string; icon: any }[] = [
  { id: 'classic', name: 'Classic', label: 'Clean & Sharp', icon: Layers },
  { id: 'modern', name: 'Modern', label: 'Pro & Bold', icon: Maximize },
  { id: 'cinematic', name: 'Cinematic', label: 'Movie Style', icon: Film },
  { id: 'cyberpunk', name: 'Cyberpunk', label: 'Neon Glitch', icon: Zap },
  { id: 'glassmorphism', name: 'Glass', label: 'Translucent', icon: Sparkles },
  { id: 'minimal', name: 'Minimal', label: 'Elegant', icon: Layout },
  { id: 'y2k', name: 'Y2K Retro', label: 'Vintage Tech', icon: Dna },
];

export const StudioView: React.FC<StudioViewProps> = ({ onCreateManualScript, onGenerateVideo, loading }) => {
  const { t } = useLanguage();
  const [title, setTitle] = React.useState('');
  const [selectedStyle, setSelectedStyle] = React.useState<Style>("classic");

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
  const [activePreviewIdx, setActivePreviewIdx] = React.useState(0);
  const [selectedRatio, setSelectedRatio] = React.useState<Ratio>("9:16");
  const [templateSettings, setTemplateSettings] = React.useState<any>(null);

  // History state
  const [articles, setArticles] = React.useState<any[]>([]);
  const [loadingArticles, setLoadingArticles] = React.useState(true);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);

  const RATIOS: { id: Ratio; icon: any; label: string }[] = [
    { id: '9:16', icon: Smartphone, label: '9:16' },
    { id: '16:9', icon: Monitor, label: '16:9' },
    { id: '1:1', icon: Square, label: '1:1' },
    { id: '4:3', icon: Maximize, label: '4:3' },
  ];

  // Load template settings when style changes
  React.useEffect(() => {
    const loadTemplate = async () => {
      try {
        const res = await api.getSettings() as any;
        const tplKey = `video_template_${selectedStyle}`;
        const tplVal = res[tplKey] || res['video_template'];
        if (tplVal) {
          setTemplateSettings(typeof tplVal === 'string' ? JSON.parse(tplVal) : tplVal);
        }
      } catch (err) {
        console.error('Failed to load template settings in Studio', err);
      }
    };
    loadTemplate();
  }, [selectedStyle]);

  const fetchHistory = async (page: number = 1, silent: boolean = false) => {
    if (!silent) setLoadingArticles(true);
    try {
      const res = await api.getArticles(page, 20);
      setArticles(res.items || []);
      setTotalPages(res.totalPages || 1);
      setCurrentPage(page);
    } catch (err) {
      console.error('Failed to fetch history', err);
    } finally {
      if (!silent) setLoadingArticles(false);
    }
  };

  React.useEffect(() => {
    fetchHistory(1);
  }, []);

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
      fetchHistory(1); // Refresh history, back to page 1
    }
  };

  const handleNewScript = () => {
    if (isDirty && !window.confirm('Kịch bản chưa lưu sẽ bị mất. Bạn có chắc muốn tạo mới?')) {
      return;
    }
    setTitle('');
    setScript({
      scenes: [
        { id: 1, type: 'hook', voiceText: '', imageKeyword: 'news', imageUrl: '' },
        { id: 2, type: 'body', voiceText: '', imageKeyword: 'report', imageUrl: '' },
        { id: 3, type: 'outro', voiceText: '', imageKeyword: 'cta', imageUrl: '' }
      ]
    });
    setLastSavedArticleId(null);
    setIsDirty(false);
    setActivePreviewIdx(0);
    toast.success('Đã khởi tạo kịch bản mới');
  };

  const [selectedTone, setSelectedTone] = React.useState('News');

  const TONES = [
    { id: 'News', name: 'Tin tức', icon: FileText },
    { id: 'Dramatic', name: 'Kịch tính', icon: Zap },
    { id: 'Humorous', name: 'Hài hước', icon: Sparkles },
    { id: 'Inspirational', name: 'Cảm hứng', icon: Wand2 },
  ];

  const loadArticle = (article: any) => {
    if (isDirty && !window.confirm('Kịch bản chưa lưu sẽ bị mất. Bạn có chắc muốn tải kịch bản này?')) {
      return;
    }
    setTitle(article.title);
    if (article.script) {
      let parsed = typeof article.script === 'string' ? JSON.parse(article.script) : article.script;
      let scenes: any[] = [];

      if (parsed) {
        if (Array.isArray(parsed.scenes)) {
          scenes = parsed.scenes;
        } else if (parsed.scenes && typeof parsed.scenes === 'object') {
          scenes = Object.values(parsed.scenes);
        } else if (Array.isArray(parsed)) {
          scenes = parsed;
        } else if (typeof parsed === 'object') {
          // If it's an object without scenes, maybe the scenes are at the root
          scenes = Object.values(parsed).filter(v => v && typeof v === 'object' && ('voiceText' in v || 'text' in v));
          if (scenes.length === 0) scenes = [];
        }
      }

      setScript({ scenes });
    }
    setLastSavedArticleId(article.id);
    setIsDirty(false);
    setActivePreviewIdx(0);
    toast.success('Đã tải kịch bản');
  };

  const activeScene = (script?.scenes?.[activePreviewIdx]) || (script?.scenes?.[0]);

  const [activeTab, setActiveTab] = React.useState<'editor' | 'history'>('editor');

  return (
    <div className="flex flex-col lg:flex-row h-screen lg:h-[calc(100vh - 76px)] overflow-hidden bg-[#0A0A0B]">
      {/* Mobile Tab Switcher */}
      <div className="lg:hidden flex border-b border-white/5 bg-black/40 p-1 shrink-0">
        <button
          onClick={() => setActiveTab('editor')}
          className={cn(
            "flex-1 py-3 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all",
            activeTab === 'editor' ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-slate-500"
          )}
        >
          Editor
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={cn(
            "flex-1 py-3 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all",
            activeTab === 'history' ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-slate-500"
          )}
        >
          Archive
        </button>
      </div>

      {/* Left Sidebar: Controls & Scenes */}
      <div className={cn(
        "w-full lg:w-[450px] flex flex-col border-r border-white/5 bg-[#0F172A]/20 backdrop-blur-md overflow-hidden",
        activeTab !== 'editor' && "hidden lg:flex"
      )}>
        {/* Header Controls */}
        <div className="p-6 border-b border-white/5 space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div className="shrink-0">
              <h1 className="text-lg sm:text-xl font-black text-white tracking-tight leading-none mb-1">{t('sidebar.studio')}</h1>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">v0.4 Premium</p>
            </div>
            <div className="flex items-center gap-2">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleNewScript}
                title="Tạo mới kịch bản"
                className="h-9 sm:h-10 px-2 sm:px-4 rounded-xl bg-white/20 border border-green-500/20 text-white hover:bg-white/10 transition-all flex items-center gap-2 whitespace-nowrap"
              >
                <Plus className="w-4 h-4 text-green-500" />
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleSave}
                disabled={loading || !title || (!isDirty && lastSavedArticleId !== null)}
                title="Lưu kịch bản"
                className="h-9 sm:h-10 px-2 sm:px-4 rounded-xl bg-primary text-white shadow-lg glow-primary disabled:opacity-50 flex items-center gap-2 transition-all whitespace-nowrap"
              >
                <Save className="w-4 h-4" />

              </motion.button>

              {lastSavedArticleId && (
                <GenerateVideoAction
                  articleId={lastSavedArticleId}
                  loading={loading || isDirty}
                  onGenerate={(id, tplId, options) => onGenerateVideo(id, tplId, options)}
                  t={t}
                  compact={true}
                />
              )}
            </div>
          </div>

          <div className="space-y-4">
            <input
              type="text"
              placeholder={t('articles.placeholderTitle')}
              value={title}
              onChange={e => handleFieldChange(() => setTitle(e.target.value))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-bold focus:border-primary/50 focus:outline-none transition-all"
            />

            <div className="flex flex-col gap-2">
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest ml-1">Tông giọng AI Script</span>
              <div className="grid grid-cols-4 gap-1.5 p-1 bg-white/5 border border-white/10 rounded-xl">
                {TONES.map(tone => (
                  <button
                    key={tone.id}
                    onClick={() => setSelectedTone(tone.id)}
                    className={cn(
                      "flex flex-col items-center justify-center py-2 rounded-lg transition-all gap-1 border",
                      selectedTone === tone.id 
                        ? "bg-primary/20 border-primary/40 text-primary shadow-lg glow-primary/10" 
                        : "border-transparent text-slate-500 hover:text-slate-300 hover:bg-white/5"
                    )}
                  >
                    <tone.icon className="w-3.5 h-3.5" />
                    <span className="text-[8px] font-bold uppercase tracking-tighter">{tone.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={addScene}
                className="h-10 flex items-center justify-center gap-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-[10px] font-bold text-slate-400 hover:text-white transition-all uppercase tracking-widest"
              >
                <Plus className="w-4 h-4" />
                {t('articles.addScene')}
              </button>
              <div className="h-10 flex items-center justify-center gap-2 px-3 rounded-xl bg-slate-900/50 border border-white/5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                {script?.scenes?.length || 0} Scenes
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Scene List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {script?.scenes?.map((scene, idx) => {
            const isActive = activePreviewIdx === idx;
            return (
              <motion.div
                key={idx}
                layout
                onClick={() => setActivePreviewIdx(idx)}
                className={cn(
                  "p-4 rounded-2xl border transition-all cursor-pointer group",
                  isActive
                    ? "bg-slate-800/60 border-primary/30 ring-1 ring-primary/20 shadow-xl"
                    : "bg-slate-900/40 border-white/5 hover:bg-slate-900/60"
                )}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className={cn(
                    "text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border",
                    scene.type === 'hook' ? "text-yellow-400 border-yellow-400/20 bg-yellow-400/5" :
                      scene.type === 'outro' ? "text-green-400 border-green-400/20 bg-green-400/5" :
                        "text-blue-400 border-blue-400/20 bg-blue-400/5"
                  )}>
                    {scene.type} #{scene.id}
                  </span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowAssetPicker({ active: true, index: idx }); }}
                      className="p-1.5 hover:bg-white/10 rounded-lg text-slate-500 hover:text-white transition-all"
                    >
                      <Upload className="w-3.5 h-3.5" />
                    </button>
                    {script.scenes.length > 1 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); removeScene(idx); }}
                        className="p-1.5 hover:bg-rose-500/20 rounded-lg text-slate-600 hover:text-rose-500 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <textarea
                  value={scene.voiceText}
                  onClick={(e) => e.stopPropagation()}
                  onChange={e => updateScene(idx, { voiceText: e.target.value })}
                  placeholder="Type spoken text here..."
                  className="w-full bg-transparent border-none p-0 text-sm text-white/80 placeholder:text-slate-700 leading-relaxed focus:ring-0 resize-none min-h-[60px]"
                />

                {scene.imageUrl && (
                  <div className="mt-3 relative aspect-video rounded-xl overflow-hidden border border-white/10">
                    <img src={scene.imageUrl} className="w-full h-full object-cover" alt="" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Right Content Area */}
      <div className={cn(
        "flex-1 flex flex-col bg-[#0F0F10] overflow-hidden relative",
        activeTab !== 'history' && "hidden lg:flex"
      )}>
        <div className="h-auto sm:h-16 border-b border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 sm:px-8 py-4 sm:py-0 bg-black/20 backdrop-blur-sm z-10 gap-4">
          <div className="flex items-center gap-4">
            <HistoryIcon className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-black uppercase tracking-widest text-white">Lịch sử kịch bản</h2>
          </div>

          <div className="flex items-center justify-between w-full sm:w-auto gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchHistory(currentPage)}
                disabled={loadingArticles}
                className="p-2 hover:bg-white/5 rounded-lg text-slate-500 hover:text-white transition-all disabled:opacity-50"
              >
                <RefreshCw className={cn("w-4 h-4", loadingArticles && "animate-spin")} />
              </button>

              <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1 border border-white/10">
                <button
                  onClick={() => fetchHistory(currentPage - 1)}
                  disabled={currentPage <= 1 || loadingArticles}
                  className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white disabled:opacity-20 transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="px-2 sm:px-3 text-[10px] font-black text-white/50 tracking-widest uppercase">
                  P.{currentPage}
                </div>
                <button
                  onClick={() => fetchHistory(currentPage + 1)}
                  disabled={currentPage >= totalPages || loadingArticles}
                  className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white disabled:opacity-20 transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="h-8 sm:h-10 flex items-center gap-2 px-3 rounded-xl bg-slate-900/50 border border-white/5 text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">
              {articles.length} Scripts
            </div>
          </div>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {loadingArticles ? (
            <div className="h-full flex flex-col items-center justify-center gap-4 opacity-40">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-[10px] font-black uppercase tracking-widest">Đang tải lịch sử...</span>
            </div>
          ) : articles.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-4 opacity-40">
              <FileText className="w-12 h-12" />
              <span className="text-[10px] font-black uppercase tracking-widest">Chưa có kịch bản nào</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {articles.map((article) => (
                <motion.div
                  key={article.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => loadArticle(article)}
                  className={cn(
                    "group relative p-5 rounded-[24px] border transition-all cursor-pointer",
                    lastSavedArticleId === article.id
                      ? "bg-primary/10 border-primary/30 shadow-xl"
                      : "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10"
                  )}
                >
                  <div className="flex flex-col gap-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h3 className="text-sm font-bold text-white group-hover:text-primary transition-colors line-clamp-1">{article.title}</h3>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                          <Clock className="w-3 h-3" />
                          {new Date(article.createdAt).toLocaleString('vi-VN')}
                        </div>
                      </div>
                      <div className="p-2 bg-white/5 rounded-xl opacity-0 group-hover:opacity-100 transition-all">
                        <ExternalLink className="w-4 h-4 text-primary" />
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 mt-auto">
                      <div className="px-2 py-1 bg-blue-500/10 border border-blue-500/20 rounded-lg text-[9px] font-black text-blue-500 uppercase tracking-widest">
                        {article.sourceType || 'Manual'}
                      </div>

                      {article.script ? (
                        <div className="px-2 py-1 bg-green-500/10 border border-green-500/20 rounded-lg text-[9px] font-black text-green-500 uppercase tracking-widest">
                          {JSON.parse(typeof article.script === 'string' ? article.script : JSON.stringify(article.script)).scenes?.length || 0} Scenes
                        </div>
                      ) : (
                        <SummarizeAction 
                          articleId={article.id} 
                          tone={selectedTone} 
                          onSuccess={async () => {
                            await fetchHistory(currentPage, true);
                            // Optionally load it automatically
                            const updated = await api.getArticle(article.id);
                            loadArticle(updated);
                          }}
                          className="px-3 py-1.5"
                          label="AI Script"
                        />
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="p-6 border-t border-white/5 bg-black/20 text-center">
          <p className="text-[10px] text-slate-500 font-medium uppercase tracking-[0.3em]">Sequential Rendering Engine // Archive System Ready</p>
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
