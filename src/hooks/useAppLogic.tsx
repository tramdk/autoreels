import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { Source, Article, VideoItem, TabType, Voice } from '../types';
import toast from 'react-hot-toast';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

export const useAppLogic = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const videoStatusFilter = searchParams.get('status') || undefined;
  
  // Derive activeTab from URL path
  const activeTab = (location.pathname.split('/')[1] || 'dashboard') as TabType;
  const setActiveTab = (tab: TabType) => navigate(`/${tab}`);

  const [sources, setSources] = useState<Source[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [stats, setStats] = useState({ sources: 0, articles: 0, videos: 0, postedVideos: 0 });
  
  const [articlesPage, setArticlesPage] = useState(1);
  const [articlesTotalPages, setArticlesTotalPages] = useState(1);
  
  const [videosPage, setVideosPage] = useState(1);
  const [videosTotalPages, setVideosTotalPages] = useState(1);

  const [loading, setLoading] = useState(false);
  const [isTikTokConnected, setIsTikTokConnected] = useState(false);
  
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [authChecking, setAuthChecking] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const data = await api.getMe();
      if (data && data.user) {
        setIsAuthenticated(true);
        setMustChangePassword(data.user.mustChangePassword);
        setUser(data.user);
      }
    } catch (e) {
      console.warn('Auth check failed - user likely not logged in');
    } finally {
      setAuthChecking(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const data = await api.getStats();
      setStats(data);
    } catch (error) {}
  }, [isAuthenticated]);

  const fetchSources = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const data = await api.getSources();
      setSources(data);
    } catch (error) {}
  }, [isAuthenticated]);

  const fetchArticles = useCallback(async (page: number = 1) => {
    if (!isAuthenticated) return;
    try {
      const data = await api.getArticles(page, 10);
      setArticles(data.items || []);
      setArticlesPage(data.page || 1);
      setArticlesTotalPages(data.totalPages || 1);
    } catch (error) {
      console.error('[AppLogic] fetchArticles error:', error);
    }
  }, [isAuthenticated]);

  const fetchVideos = useCallback(async (page: number = 1, status?: string) => {
    if (!isAuthenticated) return;
    try {
      const data = await api.getVideos(page, 9, status);
      setVideos(data.items || []);
      setVideosPage(data.page || 1);
      setVideosTotalPages(data.totalPages || 1);
    } catch (error) {
      console.error('[AppLogic] fetchVideos error:', error);
    }
  }, [isAuthenticated]);

  const fetchVoices = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const data = await api.getVoices();
      setVoices(data);
    } catch (error) {}
  }, [isAuthenticated]);

  const reloadCurrentView = useCallback(async () => {
    if (!isAuthenticated) return;
    await fetchStats();
    if (activeTab === 'dashboard') await fetchArticles(articlesPage);
    if (activeTab === 'videos') await fetchVideos(videosPage, videoStatusFilter);
    if (activeTab === 'sources') await fetchSources();
    if (activeTab === 'voices') await fetchVoices();
  }, [isAuthenticated, activeTab, fetchStats, fetchArticles, articlesPage, fetchVideos, videosPage, fetchSources, fetchVoices, videoStatusFilter]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchStats();
      fetchSources(); // usually small enough to load once for dropdowns
    }
  }, [isAuthenticated, fetchStats, fetchSources]);

  useEffect(() => {
    if (isAuthenticated && activeTab === 'dashboard') {
      fetchArticles(articlesPage);
    }
  }, [isAuthenticated, activeTab, articlesPage, fetchArticles]);

  useEffect(() => {
    if (isAuthenticated && activeTab === 'videos') {
      fetchVideos(videosPage, videoStatusFilter);
    }
  }, [isAuthenticated, activeTab, videosPage, fetchVideos, videoStatusFilter]);

  useEffect(() => {
    if (isAuthenticated && activeTab === 'voices') {
      fetchVoices();
    }
  }, [isAuthenticated, activeTab, fetchVoices]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost')) return;
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS' && event.data?.platform === 'tiktok') {
        setIsTikTokConnected(true);
        toast.success('TikTok connected successfully!');
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleConnectTikTok = async () => {
    try {
      const { url } = await api.getTikTokAuthUrl();
      const authWindow = window.open(url, 'oauth_popup', 'width=600,height=700');
      if (!authWindow) toast.error('Please allow popups for this site.');
    } catch (error: any) {
      toast.error('OAuth connection failed: ' + error.message);
    }
  };

  const handleDisconnectTikTok = async () => {
    if (!confirm('Are you sure you want to disconnect TikTok? You will need to re-authorize.')) return;
    try {
      await api.disconnectTikTok();
      setIsTikTokConnected(false);
      toast.success('TikTok disconnected.');
    } catch (error: any) {
      toast.error('Disconnect failed: ' + error.message);
    }
  };

  const handleScrape = async () => {
    const loadingToast = toast.loading('Searching for new articles...');
    setLoading(true);
    try {
      await api.scrape();
      await reloadCurrentView();
      toast.success('Sources checked! Articles updated.', { id: loadingToast });
    } catch (error: any) {
      toast.error('Scraping failed: ' + error.message, { id: loadingToast });
    }
    setLoading(false);
  };

  const handleSummarize = async (id: string) => {
    const loadingToast = toast.loading('AI is reading and summarizing...');
    setLoading(true);
    try {
      const language = localStorage.getItem('autoreels_language') || 'Vietnamese';
      await api.summarize(id, language);
      await reloadCurrentView();
      toast.success('Script generated successfully!', { id: loadingToast });
    } catch (error: any) {
      toast.error('Summarization failed: ' + error.message, { id: loadingToast });
    }
    setLoading(false);
  };

  const [renderingVideos, setRenderingVideos] = useState<Record<string, number>>({});

  const handleGenerateVideo = async (id: string, templateId?: string, options: any = {}) => {
    setLoading(true);
    try {
      const data = await api.generateVideo(id, templateId, options);
      const { videoId } = data;
      
      if (!videoId) throw new Error('No videoId returned from server');

      // Unblock the UI immediately after the job starts!
      // Unblock the UI immediately after the job starts!
      setLoading(false);
      const progressKey = `v_${id}_${videoId}`;
      setRenderingVideos(prev => ({ ...prev, [progressKey]: 5 }));
      reloadCurrentView();

      // Start listening for progress via SSE
      const eventSource = new EventSource(api.getVideoProgressUrl(videoId));
      
      const toastId = toast.loading(`Rendering video: 5%`, { duration: Infinity });

      eventSource.onmessage = (event) => {
        const { progress } = JSON.parse(event.data);
        
        if (progress === -1) {
          toast.error('Video generation failed.', { id: toastId });
          eventSource.close();
          setRenderingVideos(prev => {
            const next = { ...prev };
            delete next[progressKey];
            return next;
          });
          return;
        }

        setRenderingVideos(prev => ({ ...prev, [progressKey]: progress }));
        toast.loading(`Rendering video: ${progress}%`, { id: toastId });

        if (progress >= 100) {
          eventSource.close();
          toast.success((t) => (
            <div onClick={() => { setActiveTab('videos'); toast.dismiss(t.id); }} className="cursor-pointer">
              Video Rendered! Click to view.
            </div>
          ), { id: toastId, duration: 5000 });
          reloadCurrentView();
          
          setTimeout(() => {
            setRenderingVideos(prev => {
              const next = { ...prev };
              delete next[progressKey];
              return next;
            });
          }, 3000);
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
      };

    } catch (error: any) {
      toast.error('Video generation failed: ' + error.message);
      setLoading(false); // Only reset here if the initial API call failed
    }
  };

  const handlePost = async (videoId: string) => {
    const loadingToast = toast.loading('Uploading to TikTok...');
    setLoading(true);
    try {
      const data = await api.postToTikTok(videoId);
      if (data.error) throw new Error(data.error);
      await reloadCurrentView();
      toast.success('Video posted successfully to TikTok!', { id: loadingToast });
    } catch (error: any) {
      toast.error('Posting failed: ' + error.message, { id: loadingToast });
    }
    setLoading(false);
  };

  const handleLogin = async (username: string, password: string) => {
    setLoading(true);
    try {
      const data = await api.login(username, password);
      setIsAuthenticated(true);
      setMustChangePassword(data.user.mustChangePassword);
      setUser(data.user);
      toast.success('Đăng nhập thành công!');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (newPassword: string) => {
    setLoading(true);
    try {
      await api.changePassword(newPassword);
      setMustChangePassword(false);
      toast.success('Đổi mật khẩu thành công!');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.logout();
      setIsAuthenticated(false);
      setUser(null);
      setArticles([]);
      setVideos([]);
      toast.success('Đã đăng xuất.');
    } catch (e) {
      setIsAuthenticated(false);
    }
  };

  const handleAddSource = async (data: { name: string, url: string, type: string }) => {
    setLoading(true);
    try {
      await api.addSource(data);
      await reloadCurrentView();
      toast.success('Source added.');
    } catch (e: any) { 
      toast.error(e.message);
    }
    setLoading(false);
  };

  const handleUpdateSource = async (id: string, data: { name: string, url: string, type: string }) => {
    setLoading(true);
    try {
      await api.updateSource(id, data);
      await reloadCurrentView();
      toast.success('Source updated.');
    } catch (e: any) {
      toast.error(e.message);
    }
    setLoading(false);
  };

  const handleDeleteSource = async (id: string) => {
    if (!confirm('Are you sure you want to delete this source?')) return;
    setLoading(true);
    try {
      await api.deleteSource(id);
      await reloadCurrentView();
      toast.success('Source deleted.');
    } catch (e: any) {
      toast.error(e.message);
    }
    setLoading(false);
  };

  const handleCreateManualArticle = async (data: { title: string, content: string, imageUrl?: string }) => {
    setLoading(true);
    try {
      await api.createManualArticle(data);
      await reloadCurrentView();
      toast.success('Manual article created!');
    } catch (e: any) {
      toast.error(e.message);
    }
    setLoading(false);
  };

  const handleCreateManualScript = async (data: { title: string, script: any }) => {
    setLoading(true);
    try {
      const result = await api.createManualScript(data);
      await reloadCurrentView();
      toast.success('Manual script designed!');
      return result;
    } catch (e: any) {
      toast.error(e.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateScript = async (id: string, script: any) => {
    setLoading(true);
    try {
      await api.updateScript(id, script);
      await reloadCurrentView();
      toast.success('Script updated.');
    } catch (e: any) {
      toast.error(e.message);
    }
    setLoading(false);
  };

  const handleDeleteVideo = async (id: string) => {
    if (!confirm('Permanently delete this video?')) return;
    setLoading(true);
    try {
      await api.deleteVideo(id);
      await reloadCurrentView();
      toast.success('Video deleted.');
    } catch (e: any) {
      toast.error(e.message);
    }
    setLoading(false);
  };

  const handleCheckStatus = async (videoId: string) => {
    setLoading(true);
    try {
      const data = await api.getTikTokStatus(videoId);
      toast.success('Status checked.');
      console.log('TikTok Status:', data);
    } catch (error: any) {
      toast.error('Check status failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddVoice = async (data: { voiceId: string, name: string, provider: string }) => {
    setLoading(true);
    try {
      await api.addVoice(data);
      await reloadCurrentView();
      toast.success('Voice added.');
    } catch (e: any) { 
      toast.error(e.message);
    }
    setLoading(false);
  };

  const handleUpdateVoice = async (id: string, data: { voiceId: string, name: string, provider: string }) => {
    setLoading(true);
    try {
      await api.updateVoice(id, data);
      await reloadCurrentView();
      toast.success('Voice updated.');
    } catch (e: any) {
      toast.error(e.message);
    }
    setLoading(false);
  };

  const handleDeleteVoice = async (id: string) => {
    if (!confirm('Are you sure you want to delete this voice?')) return;
    setLoading(true);
    try {
      await api.deleteVoice(id);
      await reloadCurrentView();
      toast.success('Voice deleted.');
    } catch (e: any) {
      toast.error(e.message);
    }
    setLoading(false);
  };

  return {
    activeTab,
    setActiveTab,
    sources,
    articles,
    videos,
    loading,
    isTikTokConnected,
    setIsTikTokConnected,
    isAuthenticated,
    mustChangePassword,
    user,
    authChecking,
    handleConnectTikTok,
    handleDisconnectTikTok,
    handleScrape,
    handleSummarize,
    handleGenerateVideo,
    handlePost,
    handleCheckStatus,
    handleLogin,
    handleLogout,
    handleChangePassword,
    handleAddSource,
    handleUpdateSource,
    handleDeleteSource,
    handleUpdateScript,
    handleDeleteVideo,
    handleCreateManualArticle,
    handleCreateManualScript,
    reloadCurrentView,
    renderingVideos,
    stats,
    articlesPage,
    setArticlesPage,
    articlesTotalPages,
    videosPage,
    setVideosPage,
    videosTotalPages,
    voices,
    handleAddVoice,
    handleUpdateVoice,
    handleDeleteVoice
  };
};
