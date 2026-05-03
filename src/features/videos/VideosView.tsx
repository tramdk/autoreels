import React from 'react';
import { motion } from 'motion/react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Video, Share2, Trash2, ExternalLink, RefreshCw, X } from 'lucide-react';
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
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-white mb-2">{t('videos.title')}</h1>
          <div className="flex items-center gap-3">
            <p className="text-slate-400">{t('sidebar.videos')}</p>
            {statusFilter && (
              <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full">
                <span className="text-[10px] font-black uppercase text-primary tracking-widest">{statusFilter}</span>
                <button 
                  onClick={() => navigate('/videos')}
                  className="p-0.5 hover:bg-primary/20 rounded-full text-primary transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>
        {loading && videos.length > 0 && (
          <div className="flex items-center gap-2 text-primary animate-pulse text-xs font-bold uppercase tracking-widest">
            <RefreshCw className="w-3 h-3 animate-spin" /> Fetching...
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 min-h-[600px]">
        {loading && videos.length === 0 ? (
          Array(9).fill(0).map((_, i) => <VideoSkeleton key={i} />)
        ) : (
          <>
            {videos.map(video => (
              <motion.div 
                key={video.id} 
                layout
                className="glass flex flex-col rounded-3xl border border-white/5 overflow-hidden hover:border-white/20 transition-all group"
              >
                <div className="aspect-[9/16] bg-slate-950 relative overflow-hidden">
                  <video 
                    src={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/videos/play/${video.id}`} 
                    className="w-full h-full object-cover" 
                    controls 
                  />
                  <div className="absolute top-4 left-4 flex gap-2">
                    <StatusBadge status={video.status} />
                  </div>
                  <button 
                    onClick={() => onDelete(video.id)}
                    className="absolute top-4 right-4 p-3 bg-red-600/20 backdrop-blur-md text-red-400 hover:bg-red-600/40 hover:text-white rounded-2xl transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="p-6 flex-1 flex flex-col">
                  <h3 className="font-bold text-white text-lg line-clamp-2 mb-4 group-hover:text-primary transition-colors">{video.title}</h3>
                  
                  <div className="mt-auto space-y-3">
                     {video.status === 'posted' && (
                        <div className="flex gap-2">
                          <button 
                            onClick={() => onCheckStatus(video.id)}
                            disabled={loading}
                            className="flex-1 flex items-center justify-center gap-2 bg-slate-800 text-white px-4 py-3 rounded-2xl font-bold hover:bg-slate-700 transition-all"
                          >
                            {t('videos.status')}
                          </button>
                          <button className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-400 hover:text-white transition-all">
                            <ExternalLink className="w-5 h-5" />
                          </button>
                        </div>
                     )}
                     
                     {(video.status === 'ready' || video.status === 'video_generated') && (
                      <button 
                        onClick={() => onPost(video.id)}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 bg-primary text-white px-4 py-4 rounded-2xl font-bold shadow-lg glow-primary hover:scale-[1.02] active:scale-[0.98] transition-all"
                      >
                        <Share2 className="w-5 h-5" /> {t('videos.postTikTok')}
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </>
        )}
        {!loading && videos.length === 0 && (
          <div className="col-span-full text-center py-40 bg-slate-900/10 border-2 border-slate-800 border-dashed rounded-[44px]">
            <Video className="w-16 h-16 text-slate-800 mx-auto mb-6" />
            <p className="text-xl text-slate-500 font-medium">{t('common.noData')}</p>
            <button onClick={onStartPipeline} className="mt-4 text-primary font-bold hover:underline">{t('articles.emptyState')}</button>
          </div>
        )}
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-8 pt-6 border-t border-white/5">
          <button 
            disabled={page <= 1} 
            onClick={() => setPage(page - 1)}
            className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-all"
          >
            Previous
          </button>
          <span className="text-xs font-black uppercase tracking-widest text-slate-600">
            Page <span className="text-primary">{page}</span> of {totalPages}
          </span>
          <button 
            disabled={page >= totalPages} 
            onClick={() => setPage(page + 1)}
            className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-all"
          >
            Next
          </button>
        </div>
      )}
    </motion.div>
  );
};
