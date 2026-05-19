import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Video as VideoIcon, RefreshCw, X, Music } from 'lucide-react';
import { api } from '../../services/api';
import { cn } from '../../utils/cn';

// Sub-components
import { TemplateGrid } from './generate-video/TemplateGrid';
import { BGMSection } from './generate-video/BGMSection';
import { VoiceSelector } from './generate-video/VoiceSelector';
import { LivePreview } from './generate-video/LivePreview';
import { RatioSelector, Ratio } from './generate-video/RatioSelector';

interface GenerateVideoActionProps {
  articleId: string;
  loading: boolean;
  onGenerate: (articleId: string, templateId: string, options: any) => void;
  t: (key: string) => string;
  compact?: boolean;
}

export const GenerateVideoAction: React.FC<GenerateVideoActionProps> = ({
  articleId,
  loading,
  onGenerate,
  t,
  compact = false
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('classic');
  const [templateData, setTemplateData] = useState<any>(null);
  const [loadingData, setLoadingData] = useState(false);

  const [customVoices, setCustomVoices] = useState<any[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>('all');
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>('default');
  const [selectedRatio, setSelectedRatio] = useState<Ratio>('9:16');
  const [currentArticle, setCurrentArticle] = useState<any>(null);

  // BGM State
  const [bgmPresets, setBgmPresets] = useState<any[]>([]);
  const [selectedBgmId, setSelectedBgmId] = useState<string>('none');
  const [bgmVolume, setBgmVolume] = useState(0.15);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [isUploadingBgm, setIsUploadingBgm] = useState(false);

  // Optimized Data Fetching (Parallel)
  useEffect(() => {
    if (!showPicker) return;

    setLoadingData(true);

    const fetchData = async () => {
      try {
        const [voices, bgmList, templateRes, priorityRes, articleRes] = await Promise.all([
          api.getVoices(),
          api.getBgmPresets().catch(() => []),
          api.getSetting(`video_template_${selectedTemplate}`).then(res => res.value ? res : api.getSetting('video_template')),
          api.getSetting(`tts_priority_${selectedTemplate}`).then(res => res.value ? res : api.getSetting('tts_priority')),
          api.getArticle(articleId).catch(() => null)
        ]);

        setCustomVoices(voices);
        setBgmPresets(bgmList || []);
        
        // Safe parsing for template settings
        let settings = templateRes.value;
        if (typeof settings === 'string') {
          try { settings = JSON.parse(settings); } catch { settings = {}; }
        }

        // Safe parsing for script
        const articleScript = articleRes?.script 
          ? (typeof articleRes.script === 'string' ? JSON.parse(articleRes.script) : articleRes.script)
          : {};

        const combinedData = {
          settings: settings,
          ...articleScript,
          title: articleRes?.title,
          content: articleRes?.contentSnippet,
          backgroundImage: articleRes?.imageUrl || settings?.backgroundImage
        };
        setTemplateData(combinedData);
        setCurrentArticle(articleRes);
        
        // Auto-select the default ratio from settings if available
        if (settings?.defaultRatio) {
          setSelectedRatio(settings.defaultRatio);
        }

        // Priority logic with safe parsing
        let topProvider = 'ohfree';
        let priorityValue = priorityRes?.value;
        if (priorityValue) {
          let priorityArray: string[] = [];
          if (typeof priorityValue === 'string') {
            try { priorityArray = JSON.parse(priorityValue); } catch { priorityArray = priorityValue.split(',').map(s => s.trim()); }
          } else if (Array.isArray(priorityValue)) {
            priorityArray = priorityValue;
          }
          if (priorityArray.length > 0) topProvider = priorityArray[0];
        }

        setSelectedProvider(topProvider);
        const providerVoices = voices.filter((v: any) => v.provider === topProvider);
        if (providerVoices.length > 0) {
          setSelectedVoiceId(providerVoices[0].id);
        } else if (voices.length > 0) {
          setSelectedProvider(voices[0].provider);
          setSelectedVoiceId(voices[0].id);
        }
      } catch (err) {
        console.error('[GenerateVideoAction] Fetch error:', err);
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();

    return () => {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
        setIsPreviewPlaying(false);
      }
    };
  }, [showPicker, selectedTemplate]);

  // Audio Handlers (Memoized)
  const stopPreview = useCallback(() => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
      setIsPreviewPlaying(false);
    }
  }, []);

  const handlePreviewBgm = useCallback((url: string) => {
    if (previewAudioRef.current) previewAudioRef.current.pause();
    const audio = new Audio(url);
    audio.volume = bgmVolume * 3; // Preview boost
    audio.loop = true;
    audio.play();
    previewAudioRef.current = audio;
    setIsPreviewPlaying(true);
    audio.onended = () => setIsPreviewPlaying(false);
  }, [bgmVolume]);

  // Sync volume
  useEffect(() => {
    if (previewAudioRef.current) previewAudioRef.current.volume = Math.min(1, bgmVolume * 3);
  }, [bgmVolume]);

  const handleUploadBGM = async (file: File) => {
    setIsUploadingBgm(true);
    try {
      const asset = await api.uploadAsset(file);
      // Construct a bgm item similar to presets
      const newBgm = {
        id: asset.id,
        name: asset.name,
        url: asset.url,
        type: 'uploaded'
      };
      setBgmPresets(prev => [newBgm, ...prev]);
      setSelectedBgmId(asset.id);
      stopPreview();
    } catch (error: any) {
      console.error('BGM Upload failed:', error);
    } finally {
      setIsUploadingBgm(false);
    }
  };

  const handleConfirm = () => {
    stopPreview();
    
    // Construct the complete render payload
    const options: any = {
      ratio: selectedRatio,
      bgmAssetId: selectedBgmId !== 'none' ? selectedBgmId : undefined,
      bgmVolume: selectedBgmId !== 'none' ? bgmVolume : undefined,
      imageUrl: templateData?.backgroundImage || currentArticle?.imageUrl,
      settings: templateData?.settings,
      // Pass latest script and title to ensure 1:1 parity with what user sees
      customScript: currentArticle?.script ? (typeof currentArticle.script === 'string' ? JSON.parse(currentArticle.script) : currentArticle.script) : undefined,
      title: currentArticle?.title
    };

    if (selectedVoiceId !== 'default') {
      const v = customVoices.find(v => v.id === selectedVoiceId);
      if (v) {
        options.ttsProvider = v.provider;
        options.ttsVoiceId = v.voiceId;
      }
    }

    console.log('[Studio] Dispatching Generate with Payload:', options);
    onGenerate(articleId, selectedTemplate, options);
    setShowPicker(false);
  };

  return (
    <>
      <button
        onClick={() => setShowPicker(true)}
        disabled={loading}
        title={t('dashboard.generate')}
        className="h-9 sm:h-10 px-2 sm:px-4 rounded-xl bg-emerald-600/10 text-emerald-400 hover:bg-emerald-600/20 border border-emerald-500/20 text-[10px] font-black uppercase tracking-widest btn-tactile flex items-center gap-2 whitespace-nowrap group relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
        <VideoIcon data-icon="inline-start" className="size-4 group-hover:rotate-12 transition-transform relative z-10 shrink-0" /> 
        <span className={cn("relative z-10 line-clamp-1", compact ? "hidden md:inline" : "hidden sm:inline")}>{t('dashboard.generate')}</span>
      </button>

      {createPortal(
        <AnimatePresence>
          {showPicker && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-2 sm:p-4 md:p-6">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => { stopPreview(); setShowPicker(false); }}
              className="absolute inset-0 bg-black/90 backdrop-blur-xl"
            />
            
             <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 30 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.95, opacity: 0, y: 30 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="generate-dialog-title"
              className="w-full max-w-6xl bg-slate-900/60 rounded-[24px] sm:rounded-[40px] border border-white/10 shadow-2xl relative z-10 overflow-hidden flex flex-col h-[98vh] sm:h-[95vh] md:h-[85vh] max-h-[900px] backdrop-blur-3xl"
            >
              {/* Header */}
              <div className="px-6 sm:px-8 md:px-12 py-6 sm:py-8 border-b border-white/5 bg-white/5 flex items-center justify-between shrink-0">
                <div className="space-y-1">
                  <h2 id="generate-dialog-title" className="text-xl sm:text-2xl font-black text-white tracking-tighter uppercase flex items-center gap-3">
                    <div className="w-1.5 sm:w-2 h-6 sm:h-8 bg-primary rounded-full shadow-[0_0_20px_rgba(236,72,153,0.5)]"></div>
                    Cấu hình <span className="text-primary">Studio</span>
                  </h2>
                  <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em] ml-4 sm:ml-5 whitespace-nowrap">Professional Rendering Suite</p>
                </div>
                <button
                  onClick={() => { stopPreview(); setShowPicker(false); }}
                  className="size-10 sm:size-12 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-xl sm:rounded-2xl text-slate-400 hover:text-white transition-all border border-white/5 group"
                >
                  <X className="size-5 sm:size-6 group-hover:rotate-90 transition-transform" />
                </button>
              </div>

              {/* Main Body */}
              <div className="flex-1 flex flex-col-reverse lg:flex-row overflow-y-auto lg:overflow-hidden">
                {/* Left Sidebar */}
                <div className="w-full lg:w-96 lg:border-r border-white/5 p-6 sm:p-8 lg:p-12 space-y-10 lg:overflow-y-auto custom-scrollbar bg-black/30 shrink-0">
                  <TemplateGrid selected={selectedTemplate} onSelect={setSelectedTemplate} />
                  
                  <div className="h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />

                  <RatioSelector selected={selectedRatio} onSelect={setSelectedRatio} />
                  
                  <div className="h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />
                  
                  <VoiceSelector 
                    voices={customVoices}
                    provider={selectedProvider}
                    voiceId={selectedVoiceId}
                    onProviderChange={setSelectedProvider}
                    onVoiceIdChange={setSelectedVoiceId}
                  />

                  <div className="h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />

                  <BGMSection 
                    presets={bgmPresets}
                    selectedId={selectedBgmId}
                    onSelect={(id) => { setSelectedBgmId(id); stopPreview(); }}
                    volume={bgmVolume}
                    onVolumeChange={setBgmVolume}
                    isPlaying={isPreviewPlaying}
                    onUpload={handleUploadBGM}
                    isUploading={isUploadingBgm}
                    onTogglePlay={() => {
                      if (isPreviewPlaying) stopPreview();
                      else {
                        const bgm = bgmPresets.find(b => b.id === selectedBgmId);
                        if (bgm) handlePreviewBgm(bgm.url);
                      }
                    }}
                  />
                </div>

                {/* Right Panel - Live Preview */}
                <LivePreview 
                  templateId={selectedTemplate}
                  templateData={templateData}
                  loading={loadingData}
                  ratio={selectedRatio}
                />
              </div>

              {/* Footer */}
              <div className="px-6 sm:px-8 md:px-12 py-6 sm:py-8 border-t border-white/5 bg-black/60 flex flex-col md:flex-row items-center justify-between shrink-0 gap-6 md:gap-0">
                <div className="flex items-center gap-8">
                   <div className="hidden sm:flex items-center gap-3">
                      <div className="flex -space-x-2">
                        {['ohfree', 'edge', 'gemini'].map(p => (
                          <div key={p} className="w-8 h-8 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center text-[10px] font-black uppercase text-slate-400 shadow-xl">{p[0]}</div>
                        ))}
                      </div>
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Multi-Model Engine</span>
                   </div>
                   {selectedBgmId !== 'none' && (
                     <div className="px-4 py-2 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center gap-3 animate-in fade-in zoom-in duration-500">
                        <Music className="w-3.5 h-3.5 text-purple-400" />
                        <span className="text-[11px] font-black text-purple-400 uppercase tracking-widest">BGM ACTIVE: {Math.round(bgmVolume * 100)}%</span>
                     </div>
                   )}
                </div>

                <div className="flex gap-4 sm:gap-6 w-full md:w-auto">
                   <button
                    onClick={() => { stopPreview(); setShowPicker(false); }}
                    className="flex-1 md:flex-none px-4 sm:px-8 py-4 text-slate-500 hover:text-white font-black uppercase text-[10px] sm:text-[11px] tracking-[0.2em] transition-all"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={loading || loadingData}
                    className="flex-1 md:flex-none bg-primary text-on-primary px-8 sm:px-16 py-4 rounded-[16px] sm:rounded-[24px] font-black uppercase text-xs sm:text-sm tracking-[0.2em] shadow-[0_15px_30px_rgba(16,185,129,0.15)] hover:shadow-[0_20px_40px_rgba(16,185,129,0.25)] hover:brightness-110 btn-tactile flex items-center justify-center gap-3 sm:gap-4 disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none"
                  >
                    <span className="whitespace-nowrap">Bắt đầu Render</span> <RefreshCw data-icon="inline-end" className={cn("size-4 sm:size-5", loading && "animate-spin")} />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
};
