import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Video as VideoIcon, RefreshCw, X, Music } from 'lucide-react';
import { api } from '../../services/api';

// Sub-components
import { TemplateGrid } from './generate-video/TemplateGrid';
import { BGMSection } from './generate-video/BGMSection';
import { VoiceSelector } from './generate-video/VoiceSelector';
import { LivePreview } from './generate-video/LivePreview';

interface GenerateVideoActionProps {
  articleId: string;
  loading: boolean;
  onGenerate: (articleId: string, templateId: string, options?: { ttsProvider?: string, ttsVoiceId?: string, bgmAssetId?: string, bgmVolume?: number }) => void;
  t: (key: string) => string;
}

export const GenerateVideoAction: React.FC<GenerateVideoActionProps> = ({
  articleId,
  loading,
  onGenerate,
  t
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('classic');
  const [templateData, setTemplateData] = useState<any>(null);
  const [loadingData, setLoadingData] = useState(false);

  const [customVoices, setCustomVoices] = useState<any[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>('all');
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>('default');

  // BGM State
  const [bgmPresets, setBgmPresets] = useState<any[]>([]);
  const [selectedBgmId, setSelectedBgmId] = useState<string>('none');
  const [bgmVolume, setBgmVolume] = useState(0.15);
  const [previewAudio, setPreviewAudio] = useState<HTMLAudioElement | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);

  // Optimized Data Fetching (Parallel)
  useEffect(() => {
    if (!showPicker) return;

    setLoadingData(true);

    const fetchData = async () => {
      try {
        const [voices, bgmList, templateRes, priorityRes] = await Promise.all([
          api.getVoices(),
          api.getBgmPresets().catch(() => []),
          api.getSetting(`video_template_${selectedTemplate}`).then(res => res.value ? res : api.getSetting('video_template')),
          api.getSetting(`tts_priority_${selectedTemplate}`).then(res => res.value ? res : api.getSetting('tts_priority'))
        ]);

        setCustomVoices(voices);
        setBgmPresets(bgmList || []);
        setTemplateData(templateRes.value);

        // Priority logic
        let topProvider = 'ohfree';
        if (priorityRes?.value) {
          const p = priorityRes.value;
          let priorityArray: string[] = Array.isArray(p) ? p : [];
          if (!Array.isArray(p) && typeof p === 'string') {
            try { priorityArray = JSON.parse(p); } catch { priorityArray = p.split(',').map(s => s.trim()); }
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
      if (previewAudio) {
        previewAudio.pause();
        setPreviewAudio(null);
        setIsPreviewPlaying(false);
      }
    };
  }, [showPicker, selectedTemplate]);

  // Audio Handlers (Memoized)
  const stopPreview = useCallback(() => {
    if (previewAudio) {
      previewAudio.pause();
      setPreviewAudio(null);
      setIsPreviewPlaying(false);
    }
  }, [previewAudio]);

  const handlePreviewBgm = useCallback((url: string) => {
    if (previewAudio) previewAudio.pause();
    const audio = new Audio(url);
    audio.volume = bgmVolume * 3; // Preview boost
    audio.loop = true;
    audio.play();
    setPreviewAudio(audio);
    setIsPreviewPlaying(true);
    audio.onended = () => setIsPreviewPlaying(false);
  }, [bgmVolume, previewAudio]);

  // Sync volume
  useEffect(() => {
    if (previewAudio) previewAudio.volume = Math.min(1, bgmVolume * 3);
  }, [bgmVolume, previewAudio]);

  const handleConfirm = () => {
    stopPreview();
    let options: any = {};
    if (selectedVoiceId !== 'default') {
      const v = customVoices.find(v => v.id === selectedVoiceId);
      if (v) options = { ttsProvider: v.provider, ttsVoiceId: v.voiceId };
    }
    if (selectedBgmId !== 'none') {
      options.bgmAssetId = selectedBgmId;
      options.bgmVolume = bgmVolume;
    }
    onGenerate(articleId, selectedTemplate, options);
    setShowPicker(false);
  };

  return (
    <>
      <button
        onClick={() => setShowPicker(true)}
        disabled={loading}
        className="group relative bg-purple-600/10 text-purple-400 hover:bg-purple-600/20 px-5 py-2.5 rounded-xl text-sm font-black border border-purple-500/20 transition-all flex items-center gap-2 overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
        <VideoIcon className="w-4 h-4 group-hover:rotate-12 transition-transform" /> 
        <span className="tracking-tight">{t('dashboard.generate')}</span>
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
              className="w-full max-w-6xl bg-slate-900/40 rounded-[40px] border border-white/10 shadow-2xl relative z-10 overflow-hidden flex flex-col h-[95vh] md:h-[85vh] max-h-[900px] backdrop-blur-3xl"
            >
              {/* Header */}
              <div className="px-8 md:px-12 py-8 border-b border-white/5 bg-white/5 flex items-center justify-between shrink-0">
                <div className="space-y-1">
                  <h2 className="text-2xl font-black text-white tracking-tighter uppercase flex items-center gap-3">
                    <div className="w-2 h-8 bg-primary rounded-full shadow-[0_0_20px_rgba(236,72,153,0.5)]"></div>
                    Cấu hình <span className="text-primary">Studio</span>
                  </h2>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em] ml-5">Professional Rendering Suite</p>
                </div>
                <button
                  onClick={() => { stopPreview(); setShowPicker(false); }}
                  className="w-12 h-12 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-2xl text-slate-400 hover:text-white transition-all border border-white/5 group"
                >
                  <X className="w-6 h-6 group-hover:rotate-90 transition-transform" />
                </button>
              </div>

              {/* Main Body */}
              <div className="flex-1 flex flex-col-reverse lg:flex-row overflow-y-auto lg:overflow-hidden">
                {/* Left Sidebar */}
                <div className="w-full lg:w-96 lg:border-r border-white/5 p-8 lg:p-12 space-y-10 lg:overflow-y-auto custom-scrollbar bg-black/30 shrink-0">
                  <TemplateGrid selected={selectedTemplate} onSelect={setSelectedTemplate} />
                  
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
                />
              </div>

              {/* Footer */}
              <div className="px-8 md:px-12 py-8 border-t border-white/5 bg-black/60 flex flex-col md:flex-row items-center justify-between shrink-0 gap-6 md:gap-0">
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

                <div className="flex gap-6 w-full md:w-auto">
                   <button
                    onClick={() => { stopPreview(); setShowPicker(false); }}
                    className="flex-1 md:flex-none px-8 py-4 text-slate-500 hover:text-white font-black uppercase text-[11px] tracking-[0.2em] transition-all"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={loading || loadingData}
                    className="flex-1 md:flex-none bg-primary text-white px-16 py-4 rounded-[24px] font-black uppercase text-sm tracking-[0.2em] shadow-[0_15px_40px_rgba(236,72,153,0.3)] hover:shadow-[0_20px_50px_rgba(236,72,153,0.5)] hover:-translate-y-1 active:translate-y-0 transition-all flex items-center justify-center gap-4 disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none"
                  >
                    Bắt đầu Render <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
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
