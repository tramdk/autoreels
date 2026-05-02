import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { Source, Article, VideoItem, TabType } from '../types';
import toast from 'react-hot-toast';

export const useAppLogic = () => {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [sources, setSources] = useState<Source[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [videos, setVideos] = useState<VideoItem[]>([]);
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

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const [sourcesRes, articlesRes, videosRes] = await Promise.all([
        api.getSources(),
        api.getArticles(),
        api.getVideos()
      ]);
      setSources(sourcesRes);
      setArticles(articlesRes);
      setVideos(videosRes);
    } catch (error) {
      console.error('Failed to fetch data', error);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [fetchData, isAuthenticated]);

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

  const handleScrape = async () => {
    const loadingToast = toast.loading('Searching for new articles...');
    setLoading(true);
    try {
      await api.scrape();
      await fetchData();
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
      await fetchData();
      toast.success('Script generated successfully!', { id: loadingToast });
    } catch (error: any) {
      toast.error('Summarization failed: ' + error.message, { id: loadingToast });
    }
    setLoading(false);
  };

  const [renderingVideos, setRenderingVideos] = useState<Record<string, number>>({});

  const handleGenerateVideo = async (id: string) => {
    setLoading(true);
    try {
      const data = await api.generateVideo(id);
      const { videoId } = data;
      
      if (!videoId) throw new Error('No videoId returned from server');

      // Start listening for progress via SSE
      const eventSource = new EventSource(api.getVideoProgressUrl(videoId));
      
      const toastId = toast.loading(`Rendering video: 0%`, { duration: Infinity });

      eventSource.onmessage = (event) => {
        const { progress } = JSON.parse(event.data);
        
        if (progress === -1) {
          toast.error('Video generation failed.', { id: toastId });
          eventSource.close();
          setLoading(false);
          return;
        }

        setRenderingVideos(prev => ({ ...prev, [videoId]: progress }));
        toast.loading(`Rendering video: ${progress}%`, { id: toastId });

        if (progress >= 100) {
          eventSource.close();
          toast.success((t) => (
            <div onClick={() => { setActiveTab('videos'); toast.dismiss(t.id); }} className="cursor-pointer">
              Video Rendered! Click to view.
            </div>
          ), { id: toastId, duration: 5000 });
          fetchData();
          setLoading(false);
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        setLoading(false);
      };

    } catch (error: any) {
      toast.error('Video generation failed: ' + error.message);
      setLoading(false);
    }
  };

  const handlePost = async (videoId: string) => {
    const loadingToast = toast.loading('Uploading to TikTok...');
    setLoading(true);
    try {
      const data = await api.postToTikTok(videoId);
      if (data.error) throw new Error(data.error);
      await fetchData();
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
      await fetchData();
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
      await fetchData();
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
      await fetchData();
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
      await fetchData();
      toast.success('Manual article created!');
    } catch (e: any) {
      toast.error(e.message);
    }
    setLoading(false);
  };

  const handleUpdateScript = async (id: string, script: any) => {
    setLoading(true);
    try {
      await api.updateScript(id, script);
      await fetchData();
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
      await fetchData();
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
    fetchData,
    renderingVideos
  };
};
