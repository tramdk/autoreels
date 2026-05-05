export type Source = {
  id: string;
  name: string;
  url: string;
  type: string;
};

export type Article = {
  id: string;
  title: string;
  link: string;
  source: string;
  status: string;
  script?: any;
  videoId?: string;
};

export type VideoItem = {
  id: string;
  title: string;
  videoUrl: string;
  audioUrl?: string;
  status: string;
  platforms?: string[];
  publishId?: string;
};

export type Voice = {
  id: string;
  voiceId: string;
  name: string;
  provider: string;
};

export type TabType = 'dashboard' | 'sources' | 'videos' | 'social' | 'settings' | 'studio' | 'voices';
