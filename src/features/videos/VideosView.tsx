import React from 'react';
import { motion } from 'motion/react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Video as VideoIcon, Share2, Trash2, ArrowUpRight, RefreshCw, X, CheckCircle2 } from 'lucide-react';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { VideoItem } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';

interface VideosViewProps {
  videos: VideoItem[];
  loading: boolean;
  onPost: (videoId: string) => void;
  onCheckStatus: (videoId: string) => void;
  onDelete: (videoId: string) => void;
  onStartPipeline: () => void;
  page: number;
  setPage: (page: number) => void;
  totalPages: number;
}

const VideoSkeleton = () => (
  <div className="glass flex flex-col rounded-3xl border border-white/5 overflow-hidden">
    <div className="aspect-[9/16] bg-slate-900/50 skeleton-item" />
    <div className="p-6 space-y-4">
      <div className="h-6 w-full skeleton-item" />
      <div className="h-12 w-full skeleton-item" />
    </div>
  </div>
);

export const VideosView: React.FC<VideosViewProps> = ({
  videos,
  loading,
  onPost,
  onCheckStatus,
  onDelete,
  onStartPipeline,
  page,
  setPage,
  totalPages
}) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const statusFilter = searchParams.get('status');

  return (
    <div className="flex flex-col">
      {/* Sticky Header */}
      <div className="sticky top-[76px] lg:top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-white/5 px-6 py-6 md:px-12 md:py-8 shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white mb-1">{t('videos.title')}</h1>
            <div className="flex items-center gap-3">
              <p className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-[0.2em]">{t('sidebar.videos')}</p>
              {statusFilter && (
                <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full">
                  <span className="text-[9px] font-black uppercase text-primary tracking-widest">{statusFilter}</span>
                  <button onClick={() => navigate('/videos')} className="p-0.5 hover:bg-primary/20 rounded-full text-primary transition-colors"><X className="w-3 h-3" /></button>
                </div>
              )}
            </div>
          </div>
          {loading && (videos?.length ?? 0) > 0 && (
            <div className="flex items-center gap-2 text-primary animate-pulse text-[10px] font-bold uppercase tracking-widest bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/20">
              <RefreshCw className="w-3 h-3 animate-spin" /> Fetching...
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="px-6 py-8 md:px-12 md:py-10 pb-32">
        <div className="max-w-7xl mx-auto space-y-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 min-h-[400px]">
            {loading && (videos?.length ?? 0) === 0 ? (
              Array(6).fill(0).map((_, i) => <VideoSkeleton key={i} />)
            ) : (
              <>
                {videos?.map(video => (
                  <motion.div key={video.id} layout className="glass flex flex-col rounded-[32px] border border-white/5 overflow-hidden hover:border-white/20 transition-all group">
                    <div className="aspect-[9/16] bg-slate-950 relative overflow-hidden">
                      <video src={video.videoUrl.startsWith('http') ? video.videoUrl : `/api/videos/play/${video.id}`} className="w-full h-full object-contain" controls />
                      <div className="absolute top-4 left-4 flex gap-2"><StatusBadge status={video.status} /></div>
                      <button onClick={() => onDelete(video.id)} className="absolute top-4 right-4 p-3 bg-red-600/20 backdrop-blur-md text-red-400 hover:bg-red-600/40 hover:text-white rounded-2xl transition-all opacity-100 sm:opacity-0 group-hover:opacity-100 z-10"><Trash2 className="w-5 h-5" /></button>
                    </div>
                    <div className="p-6 flex-1 flex flex-col">
                      <h3 className="font-bold text-white text-lg line-clamp-2 mb-6 group-hover:text-primary transition-colors">{video.title}</h3>
                      <div className="mt-auto space-y-3">
                        {video.status === 'posted' ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => onCheckStatus(video.id)}
                              className="flex-1 flex items-center justify-center gap-2 bg-emerald-500/10 text-emerald-500 px-4 py-4 rounded-2xl font-black uppercase text-xs tracking-[0.2em] border border-emerald-500/20 hover:bg-emerald-500/20 transition-all min-w-0"
                            >
                              <CheckCircle2 className="w-5 h-5 shrink-0" />
                              <span className="truncate">ĐÃ ĐĂNG</span>
                            </button>
                            <button className="p-4 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-400 hover:text-white transition-all border border-white/5"><ArrowUpRight className="w-5 h-5" /></button>
                          </div>
                        ) : (
                          <button
                            onClick={() => onPost(video.id)}
                            className="w-full flex items-center justify-center gap-2 bg-primary text-white px-4 py-4 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-lg glow-primary transition-all min-w-0"
                          >
                            <Share2 className="w-5 h-5 shrink-0" />
                            <span className="truncate">{t('videos.postTikTok')}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </>
            )}
            {!loading && (videos?.length ?? 0) === 0 && (
              <div className="col-span-full text-center py-40 bg-slate-900/10 border-2 border-slate-800 border-dashed rounded-[44px]">
                <VideoIcon className="w-16 h-16 text-slate-800 mx-auto mb-6" />
                <p className="text-xl text-slate-500 font-bold uppercase tracking-widest">{t('common.noData')}</p>
                <button onClick={onStartPipeline} className="mt-4 text-primary font-black uppercase tracking-widest text-sm hover:underline">{t('articles.emptyState')}</button>
              </div>
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
  );
};
