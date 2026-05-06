import { Source, Article, VideoItem } from '../types';

const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const isFormData = options.body instanceof FormData;
  
  const headers: Record<string, string> = { ...options.headers as any };
  if (!isFormData && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers,
  });

  if (!response.ok) {
    let errorMsg = 'An unexpected error occurred';
    try {
      const errorData = await response.json();
      errorMsg = errorData.error || errorData.message || errorMsg;
    } catch (e) {
      // Fallback if not JSON
    }
    throw new Error(errorMsg);
  }

  return response;
};

export const api = {
  // Auth
  login: (username: string, password: string) => 
    fetchWithAuth('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }).then(r => r.json()),
  logout: () => fetchWithAuth('/api/auth/logout', { method: 'POST' }).then(r => r.json()),
  changePassword: (newPassword: string) => 
    fetchWithAuth('/api/auth/change-password', { method: 'POST', body: JSON.stringify({ newPassword }) }).then(r => r.json()),
  getMe: () => fetchWithAuth('/api/auth/me').then(r => r.json()),

  // App Data
  getStats: () => fetchWithAuth('/api/stats').then(r => r.json() as Promise<{sources: number, articles: number, videos: number, postedVideos: number}>),
  getSources: () => fetchWithAuth('/api/sources').then(r => r.json() as Promise<Source[]>),
  getArticles: (page: number = 1, limit: number = 20) => fetchWithAuth(`/api/articles?page=${page}&limit=${limit}`).then(r => r.json() as Promise<{total: number, items: Article[], page: number, limit: number, totalPages: number}>),
  getVideos: (page: number = 1, limit: number = 20, status?: string) => 
    fetchWithAuth(`/api/videos?page=${page}&limit=${limit}${status ? `&status=${status}` : ''}`).then(r => r.json() as Promise<{total: number, items: VideoItem[], page: number, limit: number, totalPages: number}>),
  
  deleteManyArticles: () => fetchWithAuth('/api/articles/clear', { method: 'POST' }).then(r => r.json()),
  createManualArticle: (data: { title: string, content: string, imageUrl?: string }) => 
    fetchWithAuth('/api/articles/manual', { method: 'POST', body: JSON.stringify(data) }).then(r => r.json()),
  createManualScript: (data: { title: string, script: any }) => 
    fetchWithAuth('/api/articles/manual-script', { method: 'POST', body: JSON.stringify(data) }).then(r => r.json()),

  // Sources
  addSource: (data: { name: string, url: string, type: string }) => 
    fetchWithAuth('/api/sources', { method: 'POST', body: JSON.stringify(data) }).then(r => r.json()),
  updateSource: (id: string, data: { name: string, url: string, type: string }) => 
    fetchWithAuth(`/api/sources/${id}`, { method: 'PUT', body: JSON.stringify(data) }).then(r => r.json()),
  deleteSource: (id: string) => 
    fetchWithAuth(`/api/sources/${id}`, { method: 'DELETE' }).then(r => r.json()),

  scrape: () => fetchWithAuth('/api/articles/scrape', { method: 'POST' }).then(r => r.json()),
  summarize: (id: string, language: string = 'Vietnamese') => fetchWithAuth(`/api/articles/summarize/${id}`, { method: 'POST', body: JSON.stringify({ language }) }).then(r => r.json()),
  updateScript: (id: string, script: any) => 
    fetchWithAuth(`/api/articles/${id}/script`, { method: 'PUT', body: JSON.stringify({ script }) }).then(r => r.json()),
  
  generateVideo: (id: string, templateId?: string, options: any = {}) => 
    fetchWithAuth(`/api/videos/generate`, { method: 'POST', body: JSON.stringify({ articleId: id, templateId, ...options }) }).then(r => r.json()),
  getVideoProgressUrl: (id: string) => `/api/videos/progress/${id}`, // For EventSource
  
  deleteVideo: (id: string) => fetchWithAuth(`/api/videos/${id}`, { method: 'DELETE' }).then(r => r.json()),
  postToTikTok: (videoId: string) => fetchWithAuth(`/api/videos/post/${videoId}`, { method: 'POST' }).then(r => r.json()),
  getTikTokStatus: (videoId: string) => fetchWithAuth(`/api/videos/post/status/${videoId}`).then(r => r.json()),
  getTikTokAuthUrl: () => fetchWithAuth('/api/auth/tiktok/url').then(r => r.json() as Promise<{ url: string }>),
  disconnectTikTok: () => fetchWithAuth('/api/auth/tiktok/disconnect', { method: 'POST' }).then(r => r.json()),

  // BGM
  getBgmPresets: () => fetchWithAuth('/api/videos/bgm-presets').then(r => r.json() as Promise<{ id: string, name: string, description: string, category: string, type: string, url: string }[]>),

  // Settings
  getSettings: () => fetchWithAuth('/api/settings').then(r => r.json() as Promise<Record<string, string>>),
  getSetting: (key: string) => fetchWithAuth(`/api/settings/${key}`).then(r => r.json() as Promise<{ key: string, value: any }>),
  updateSetting: (key: string, value: any) => 
    fetchWithAuth('/api/settings', { method: 'POST', body: JSON.stringify({ key, value }) }).then(r => r.json()),
  uploadBackground: (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    return fetchWithAuth('/api/settings/upload-bg', { 
      method: 'POST', 
      body: formData
    }).then(r => r.json() as Promise<{ url: string }>);
  },

  // Assets
  getAssets: () => fetchWithAuth('/api/assets').then(r => r.json() as Promise<any[]>),
  uploadAsset: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return fetchWithAuth('/api/assets/upload', { 
      method: 'POST', 
      body: formData
    }).then(r => r.json() as Promise<{ id: string, url: string, name: string, hash: string, size: number }>);
  },

  // Voices
  getVoices: () => fetchWithAuth('/api/voices').then(r => r.json() as Promise<any[]>),
  addVoice: (data: { voiceId: string, name: string, provider: string }) => 
    fetchWithAuth('/api/voices', { method: 'POST', body: JSON.stringify(data) }).then(r => r.json()),
  updateVoice: (id: string, data: { voiceId: string, name: string, provider: string }) => 
    fetchWithAuth(`/api/voices/${id}`, { method: 'PUT', body: JSON.stringify(data) }).then(r => r.json()),
  deleteVoice: (id: string) => 
    fetchWithAuth(`/api/voices/${id}`, { method: 'DELETE' }).then(r => r.json()),
};
