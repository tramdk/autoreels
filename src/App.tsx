import React from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { DashboardView } from './features/dashboard/DashboardView';
import { StudioView } from './features/studio/StudioView';
import { SourcesView } from './features/sources/SourcesView';
import { VideosView } from './features/videos/VideosView';
import { SocialView } from './features/social/SocialView';
import { SettingsView } from './features/settings/SettingsView';
import { LoginView, ChangePasswordView } from './features/auth/AuthViews';
import { VoicesView } from './features/voices/VoicesView';
import { MobileNav } from './components/layout/MobileNav';
import { MobileHeader } from './components/layout/MobileHeader';
import { useAppLogic } from './hooks/useAppLogic';
import { Toaster } from 'react-hot-toast';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';

export default function App() {
  const location = useLocation();
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
    handleDeleteVoice,
    updateArticle
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

  return (
    <div className="min-h-screen bg-background flex font-sans selection:bg-primary/30 selection:text-white">
      <Toaster position="top-right" />
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLogout={handleLogout}
        renderingVideos={renderingVideos}
      />

      <main className="flex-1 min-w-0 bg-background overflow-hidden h-screen flex flex-col relative">
        <MobileHeader onLogout={handleLogout} />
        <div className="flex-1 w-full min-h-0 overflow-hidden">
          <Routes>
            <Route path="/dashboard" element={
              <div className="overflow-y-auto h-full pb-24 lg:pb-0 custom-scrollbar">
                <DashboardView 
                  sources={sources}
                  articles={articles}
                  videos={videos}
                  loading={loading}
                  onScrape={handleScrape}
                  onSummarize={handleSummarize}
                  onRefresh={reloadCurrentView}
                  onUpdateArticle={updateArticle}
                  onGenerateVideo={handleGenerateVideo}
                  onUpdateScript={handleUpdateScript}
                  onCreateManualArticle={handleCreateManualArticle}
                  onCreateManualScript={handleCreateManualScript}
                  renderingVideos={renderingVideos}
                  stats={stats}
                  page={articlesPage}
                  setPage={setArticlesPage}
                  totalPages={articlesTotalPages}
                />
              </div>
            } />
            <Route path="/studio" element={
              <div className="h-full overflow-hidden">
                <StudioView 
                  onCreateManualScript={handleCreateManualScript}
                  onGenerateVideo={handleGenerateVideo}
                  loading={loading}
                />
              </div>
            } />
            <Route path="/sources" element={
              <div className="overflow-y-auto h-full pb-24 lg:pb-0 custom-scrollbar">
                <SourcesView 
                  sources={sources}
                  loading={loading}
                  onAdd={handleAddSource}
                  onUpdate={handleUpdateSource}
                  onDelete={handleDeleteSource}
                />
              </div>
            } />
            <Route path="/videos" element={
              <div className="overflow-y-auto h-full pb-24 lg:pb-0 custom-scrollbar">
                <VideosView 
                  videos={videos}
                  loading={loading}
                  onPost={handlePost}
                  onCheckStatus={handleCheckStatus}
                  onDelete={handleDeleteVideo}
                  onStartPipeline={() => setActiveTab('dashboard')}
                  page={videosPage}
                  setPage={setVideosPage}
                  totalPages={videosTotalPages}
                />
              </div>
            } />
            <Route path="/social" element={
              <div className="overflow-y-auto h-full pb-24 lg:pb-0 custom-scrollbar">
                <SocialView 
                  isTikTokConnected={isTikTokConnected}
                  onConnectTikTok={handleConnectTikTok}
                  onDisconnectTikTok={handleDisconnectTikTok}
                />
              </div>
            } />
            <Route path="/voices" element={
              <div className="overflow-y-auto h-full pb-24 lg:pb-0 custom-scrollbar">
                <VoicesView 
                  voices={voices}
                  loading={loading}
                  onAdd={handleAddVoice}
                  onUpdate={handleUpdateVoice}
                  onDelete={handleDeleteVoice}
                />
              </div>
            } />
            <Route path="/settings" element={
              <div className="overflow-y-auto h-full pb-24 lg:pb-0 custom-scrollbar">
                <SettingsView />
              </div>
            } />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </main>
      <MobileNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}
