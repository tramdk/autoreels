import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Video as VideoIcon, RefreshCw, X, Check } from 'lucide-react';
import { api } from '../../services/api';

interface GenerateVideoActionProps {
  articleId: string;
  loading: boolean;
  onGenerate: (articleId: string, templateId: string, options?: { ttsProvider?: string, ttsVoiceId?: string }) => void;
  t: (key: string) => string;
}

export const GenerateVideoAction: React.FC<GenerateVideoActionProps> = ({
  articleId,
  loading,
  onGenerate,
  t
}) => {
  const [showPicker, setShowPicker] = React.useState(false);
  const [selectedTemplate, setSelectedTemplate] = React.useState('classic');
  const [templateData, setTemplateData] = React.useState<any>(null);
  const [loadingTemplate, setLoadingTemplate] = React.useState(false);

  const [customVoices, setCustomVoices] = React.useState<any[]>([]);
  const [selectedProvider, setSelectedProvider] = React.useState<string>('all');
  const [selectedVoiceId, setSelectedVoiceId] = React.useState<string>('default');

  React.useEffect(() => {
    if (showPicker) {
      setLoadingTemplate(true);

      // 1. Fetch Template
      api.getSetting(`video_template_${selectedTemplate}`)
        .then(res => {
          if (res.value) {
            setTemplateData(res.value);
          } else {
            return api.getSetting('video_template').then(globalRes => setTemplateData(globalRes.value));
          }
        })
        .catch(() => setTemplateData(null))
        .finally(() => setLoadingTemplate(false));
    }
  }, [selectedTemplate, showPicker]);

  // 2. Fetch Voices and Priority (Specific to Template)
  React.useEffect(() => {
    if (showPicker) {
      Promise.all([
        api.getVoices(),
        api.getSetting(`tts_priority_${selectedTemplate}`).then(res => res.value ? res : api.getSetting('tts_priority'))
      ]).then(([voices, priorityRes]) => {
        setCustomVoices(voices);

        let topProvider = 'ohfree';
        if (priorityRes && priorityRes.value) {
          const p = priorityRes.value;
          // Robust extraction: handle both raw string and pre-parsed array
          let priorityArray: string[] = [];
          if (Array.isArray(p)) {
            priorityArray = p;
          } else if (typeof p === 'string' && p.trim()) {
            try {
              const parsed = JSON.parse(p);
              if (Array.isArray(parsed)) priorityArray = parsed;
              else if (typeof parsed === 'string') priorityArray = parsed.split(',').map(s => s.trim());
            } catch (e) {
              // Fallback for simple comma-separated strings
              priorityArray = p.split(',').map(s => s.trim());
            }
          }

          if (priorityArray.length > 0) {
            topProvider = priorityArray[0];
          }
        }

        // Apply to dropdowns
        setSelectedProvider(topProvider);
        const providerVoices = voices.filter((v: any) => v.provider === topProvider);
        if (providerVoices.length > 0) {
          setSelectedVoiceId(providerVoices[0].id);
        } else if (voices.length > 0) {
          setSelectedProvider(voices[0].provider);
          setSelectedVoiceId(voices[0].id);
        }
      }).catch(err => console.error('[DEBUG] Priority fetch failed:', err));
    }
  }, [showPicker, selectedTemplate]);

  const SCALE = 240 / 1080;

  const filteredVoices = customVoices.filter(v =>
    selectedProvider === 'all' || v.provider === selectedProvider
  );

  const handleConfirm = () => {
    let options = {};
    if (selectedVoiceId !== 'default') {
      const v = customVoices.find(v => v.id === selectedVoiceId);
      if (v) {
        options = { ttsProvider: v.provider, ttsVoiceId: v.voiceId };
      }
    }
    onGenerate(articleId, selectedTemplate, options);
    setShowPicker(false);
  };

  return (
    <>
      <button
        onClick={() => setShowPicker(true)}
        disabled={loading}
        className="bg-purple-600/10 text-purple-400 hover:bg-purple-600/20 px-4 py-2 rounded-xl text-sm font-bold border border-purple-500/20 transition-all flex items-center gap-2 font-mono"
      >
        <VideoIcon className="w-4 h-4" /> {t('dashboard.generate')}
      </button>

      <AnimatePresence>
        {showPicker && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowPicker(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="glass w-full max-w-5xl bg-slate-900/50 rounded-[40px] border border-white/10 shadow-3xl relative z-10 overflow-hidden flex flex-col h-[80vh] max-h-[800px]"
            >
              {/* Header */}
              <div className="px-10 py-8 border-b border-white/5 bg-white/5 flex items-center justify-between shrink-0">
                <div className="space-y-1">
                  <h2 className="text-2xl font-black text-white tracking-tighter uppercase flex items-center gap-3">
                    <div className="w-2 h-8 bg-primary rounded-full shadow-[0_0_15px_rgba(0,242,255,0.5)]"></div>
                    Cấu hình <span className="text-primary">Render</span>
                  </h2>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] ml-5">Studio Production Suite</p>
                </div>
                <button
                  onClick={() => setShowPicker(false)}
                  className="w-12 h-12 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-2xl text-slate-400 hover:text-white transition-all border border-white/5"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Main Content */}
              <div className="flex-1 flex overflow-hidden">
                {/* Left Sidebar - Settings */}
                <div className="w-80 border-r border-white/5 p-10 space-y-10 overflow-y-auto custom-scrollbar bg-black/20">
                  {/* Template Section */}
                  <div className="space-y-5">
                    <label className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">
                      <div className="w-1 h-1 rounded-full bg-primary"></div>
                      Giao diện (Template)
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { id: 'classic', label: 'Classic' },
                        { id: 'modern', label: 'Modern' },
                        { id: 'cinematic', label: 'Cinematic' },
                        { id: 'bold', label: 'Bold' }
                      ].map(tpl => (
                        <div
                          key={tpl.id}
                          onClick={() => setSelectedTemplate(tpl.id)}
                          className={`px-4 py-4 rounded-2xl border cursor-pointer transition-all flex flex-col items-center justify-center text-center gap-1 group ${selectedTemplate === tpl.id ? 'bg-primary/10 border-primary shadow-[0_0_20px_rgba(0,242,255,0.1)]' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                        >
                          <span className={`text-[10px] font-black uppercase tracking-widest ${selectedTemplate === tpl.id ? 'text-primary' : 'text-slate-400 group-hover:text-slate-200'}`}>{tpl.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Provider Filter */}
                  <div className="space-y-5">
                    <label className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">
                      <div className="w-1 h-1 rounded-full bg-primary"></div>
                      Lọc theo Model
                    </label>
                    <div className="relative group">
                      <select
                        value={selectedProvider}
                        onChange={e => {
                          const p = e.target.value;
                          setSelectedProvider(p);
                          if (p === 'all') {
                            setSelectedVoiceId('default');
                          } else {
                            const firstVoice = customVoices.find(v => v.provider === p);
                            if (firstVoice) setSelectedVoiceId(firstVoice.id);
                            else setSelectedVoiceId('default');
                          }
                        }}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-xs text-white focus:outline-none focus:border-primary/50 transition-all appearance-none cursor-pointer group-hover:bg-white/10"
                      >
                        <option value="all" className="bg-slate-900">Tất cả Model</option>
                        <option value="ohfree" className="bg-slate-900">OhFree TTS (Free)</option>
                        <option value="edge" className="bg-slate-900">Edge TTS (High Quality)</option>
                        <option value="lucylab" className="bg-slate-900">LucyLab (ViVibe)</option>
                        <option value="elevenlabs" className="bg-slate-900">ElevenLabs (Premium)</option>
                        <option value="gemini" className="bg-slate-900">Gemini 2.5 Flash</option>
                      </select>
                      <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                        <RefreshCw className="w-3 h-3" />
                      </div>
                    </div>
                  </div>

                  {/* Voice Section */}
                  <div className="space-y-5">
                    <label className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">
                      <div className="w-1 h-1 rounded-full bg-primary"></div>
                      Giọng đọc (Voice)
                    </label>
                    <select
                      value={selectedVoiceId}
                      onChange={e => setSelectedVoiceId(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-xs text-white focus:outline-none focus:border-primary/50 transition-all appearance-none cursor-pointer"
                    >
                      <option value="default" className="bg-slate-900 italic font-medium">-- Theo cấu hình mặc định --</option>
                      {filteredVoices.map(v => (
                        <option key={v.id} value={v.id} className="bg-slate-900">{v.name} ({v.provider})</option>
                      ))}
                    </select>
                    <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10">
                      <p className="text-[9px] text-primary/70 leading-relaxed font-medium">
                        Hệ thống sẽ tự động chuyển sang giọng dự phòng nếu model được chọn gặp sự cố kỹ thuật.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right Panel - Live Preview */}
                <div className="flex-1 bg-black/40 flex flex-col items-center justify-center p-12 relative overflow-hidden">
                  {/* Decorative Elements */}
                  <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/20 blur-[120px] rounded-full"></div>
                  </div>

                  <div className="text-[10px] font-black uppercase text-slate-600 mb-10 tracking-[0.5em] z-10 flex items-center gap-4">
                    <div className="w-8 h-[1px] bg-slate-800"></div>
                    Live Visual Preview
                    <div className="w-8 h-[1px] bg-slate-800"></div>
                  </div>

                  {/* Loading Overlay */}
                  {loadingTemplate && (
                    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-sm">
                      <RefreshCw className="w-10 h-10 text-primary animate-spin mb-4" />
                      <span className="text-[10px] font-black text-white uppercase tracking-widest">Loading Styles...</span>
                    </div>
                  )}

                  <div className="z-10 transform scale-110 lg:scale-125 transition-transform duration-500">
                    {templateData ? (
                      <div className="relative w-[220px] aspect-[9/16] rounded-[3rem] border-[8px] border-slate-800 shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden bg-black select-none">
                        {/* Background */}
                        <div className="absolute inset-0">
                          {templateData.backgroundImage ? (
                            <img
                              src={templateData.backgroundImage}
                              className="absolute inset-0 w-full h-full object-contain transition-opacity duration-700"
                              style={{
                                filter: `brightness(${templateData.backgroundBrightness || 0.4}) saturate(1.2)`,
                                opacity: loadingTemplate ? 0.3 : 1
                              }}
                              alt=""
                            />
                          ) : (
                            <div className="absolute inset-0 bg-slate-900 flex items-center justify-center">
                              <VideoIcon className="w-12 h-12 text-white/5" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/90" />
                        </div>

                        {/* Content Layer */}
                        <div className="absolute inset-0 z-10 pointer-events-none p-6 flex flex-col justify-end pb-12">
                          {templateData.showLogo !== false && (
                            <div className="absolute" style={{ top: (templateData.logoTop || 100) * SCALE, left: '50%', transform: `translateX(-50%)` }}>
                              <span className="font-black text-center uppercase whitespace-nowrap" style={{
                                fontFamily: 'Anton, sans-serif',
                                color: templateData.logoColor || '#ffffff',
                                fontSize: (templateData.logoSize || 60) * SCALE,
                                letterSpacing: (templateData.logoLetterSpacing || 4) * SCALE,
                                textShadow: '0 2px 10px rgba(0,0,0,0.5)'
                              }}>
                                {templateData.logoText || 'AUTOREELS'}
                              </span>
                            </div>
                          )}

                          <div className="space-y-4">
                            <h3 className="font-black uppercase tracking-tighter" style={{
                              fontFamily: 'Anton, sans-serif',
                              color: templateData.hookColor || '#ffffff',
                              fontSize: (templateData.hookSize || 120) * SCALE,
                              lineHeight: 0.9,
                              textShadow: '0 5px 20px rgba(0,0,0,0.8)'
                            }}>
                              {selectedTemplate.toUpperCase()}<br />COLLECTION
                            </h3>
                            <div className="h-1 rounded-full shadow-lg" style={{ width: (templateData.dividerWidth || 150) * SCALE, backgroundColor: templateData.dividerColor || '#00f2ff' }}></div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="w-[220px] aspect-[9/16] rounded-[3rem] bg-white/5 border border-white/5 flex flex-col items-center justify-center gap-4">
                        <VideoIcon className="w-8 h-8 text-slate-700" />
                        <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">No Preview</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-10 py-8 border-t border-white/5 bg-black/40 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4 text-slate-500">
                  <div className="flex -space-x-2">
                    {['ohfree', 'edge', 'gemini'].map(p => (
                      <div key={p} className="w-6 h-6 rounded-full border border-slate-900 bg-slate-800 flex items-center justify-center text-[8px] font-black uppercase">{p[0]}</div>
                    ))}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest">Multi-Model Engine Active</span>
                </div>
                <div className="flex gap-4">
                  <button
                    onClick={() => setShowPicker(false)}
                    className="px-8 py-4 text-slate-500 hover:text-white font-black uppercase text-[10px] tracking-widest transition-all"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    onClick={handleConfirm}
                    className="bg-primary text-white px-12 py-4 rounded-[20px] font-black uppercase text-xs tracking-[0.2em] shadow-[0_10px_30px_rgba(0,242,255,0.3)] glow-primary hover:opacity-90 transition-all flex items-center gap-4"
                  >
                    Bắt đầu Render <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
