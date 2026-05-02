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
  getSources: () => fetchWithAuth('/api/sources').then(r => r.json() as Promise<Source[]>),
  getArticles: () => fetchWithAuth('/api/articles').then(r => r.json() as Promise<Article[]>),
  getVideos: () => fetchWithAuth('/api/videos').then(r => r.json() as Promise<VideoItem[]>),
  
  deleteManyArticles: () => fetchWithAuth('/api/articles/clear', { method: 'POST' }).then(r => r.json()),
  createManualArticle: (data: { title: string, content: string, imageUrl?: string }) => 
    fetchWithAuth('/api/articles/manual', { method: 'POST', body: JSON.stringify(data) }).then(r => r.json()),

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
  
  generateVideo: (id: string) => fetchWithAuth(`/api/videos/generate/${id}`, { method: 'POST' }).then(r => r.json()),
  getVideoProgressUrl: (id: string) => `/api/videos/progress/${id}`, // For EventSource
  
  deleteVideo: (id: string) => fetchWithAuth(`/api/videos/${id}`, { method: 'DELETE' }).then(r => r.json()),
  postToTikTok: (videoId: string) => fetchWithAuth(`/api/videos/post/${videoId}`, { method: 'POST' }).then(r => r.json()),
  getTikTokStatus: (videoId: string) => fetchWithAuth(`/api/videos/post/status/${videoId}`).then(r => r.json()),
  getTikTokAuthUrl: () => fetchWithAuth('/api/auth/tiktok/url').then(r => r.json() as Promise<{ url: string }>),

  // Settings
  getSettings: () => fetchWithAuth('/api/settings').then(r => r.json() as Promise<Record<string, string>>),
  updateSetting: (key: string, value: any) => 
    fetchWithAuth('/api/settings', { method: 'POST', body: JSON.stringify({ key, value }) }).then(r => r.json()),
  uploadBackground: (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    return fetchWithAuth('/api/settings/upload-bg', { 
      method: 'POST', 
      body: formData
    }).then(r => r.json() as Promise<{ url: string }>);
  }
};
