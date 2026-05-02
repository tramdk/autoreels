import React from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { DashboardView } from './features/dashboard/DashboardView';
import { SourcesView } from './features/sources/SourcesView';
import { VideosView } from './features/videos/VideosView';
import { SocialView } from './features/social/SocialView';
import { SettingsView } from './features/settings/SettingsView';
import { LoginView, ChangePasswordView } from './features/auth/AuthViews';
import { useAppLogic } from './hooks/useAppLogic';

import { Toaster } from 'react-hot-toast';

export default function App() {
  const {
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
  } = useAppLogic();

  if (authChecking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <LoginView onLogin={handleLogin} loading={loading} />
        <Toaster position="top-right" />
      </>
    );
  }

  if (mustChangePassword) {
    return (
      <>
        <ChangePasswordView onChangePassword={handleChangePassword} loading={loading} />
        <Toaster position="top-right" />
      </>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardView 
            sources={sources}
            articles={articles}
            videos={videos}
            loading={loading}
            onScrape={handleScrape}
            onSummarize={handleSummarize}
            onGenerateVideo={handleGenerateVideo}
            onUpdateScript={handleUpdateScript}
            onCreateManualArticle={handleCreateManualArticle}
            renderingVideos={renderingVideos}
          />
        );
      case 'sources':
        return (
          <SourcesView 
            sources={sources} 
            onAdd={handleAddSource}
            onUpdate={handleUpdateSource}
            onDelete={handleDeleteSource}
          />
        );
      case 'videos':
        return (
          <VideosView 
            videos={videos}
            loading={loading}
            onPost={handlePost}
            onCheckStatus={handleCheckStatus}
            onDelete={handleDeleteVideo}
            onStartPipeline={() => setActiveTab('dashboard')}
          />
        );
      case 'social':
        return (
          <SocialView 
            isTikTokConnected={isTikTokConnected}
            onConnectTikTok={handleConnectTikTok}
            onDisconnectTikTok={() => setIsTikTokConnected(false)}
          />
        );
      case 'settings':
        return <SettingsView />;
      default:
        return <div>Coming soon</div>;
    }
  };

  return (
    <div className="min-h-screen bg-background flex font-sans selection:bg-primary/30 selection:text-white">
      <Toaster position="top-right" />
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLogout={handleLogout}
      />

      <main className="flex-1 min-w-0 bg-background overflow-x-hidden">
        <div className="max-w-7xl mx-auto px-6 py-12 md:px-12 md:py-20">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
