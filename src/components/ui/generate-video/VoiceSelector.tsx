import React from 'react';
import { RefreshCw, Mic2, ShieldCheck } from 'lucide-react';

interface VoiceSelectorProps {
  voices: any[];
  provider: string;
  voiceId: string;
  onProviderChange: (p: string) => void;
  onVoiceIdChange: (id: string) => void;
}

export const VoiceSelector: React.FC<VoiceSelectorProps> = ({
  voices,
  provider,
  voiceId,
  onProviderChange,
  onVoiceIdChange
}) => {
  const filteredVoices = voices.filter(v =>
    provider === 'all' || v.provider === provider
  );

  return (
    <div className="space-y-6">
      {/* Provider */}
      <div className="space-y-4">
        <label className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">
          <div className="w-1 h-1 rounded-full bg-primary shadow-[0_0_10px_rgba(0,242,255,0.5)]"></div>
          Lọc theo Model (Provider)
        </label>
        <div className="relative group">
          <select
            value={provider}
            onChange={e => onProviderChange(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-xs text-white focus:outline-none focus:border-primary/50 transition-all appearance-none cursor-pointer group-hover:bg-white/10"
          >
            <option value="all" className="bg-slate-900">Tất cả Model</option>
            <option value="ohfree" className="bg-slate-900">OhFree TTS (Miễn phí)</option>
            <option value="edge" className="bg-slate-900">Edge TTS (Chất lượng cao)</option>
            <option value="lucylab" className="bg-slate-900">LucyLab (Giọng đọc VIP)</option>
            <option value="elevenlabs" className="bg-slate-900">ElevenLabs (Premium)</option>
            <option value="gemini" className="bg-slate-900">Gemini 2.5 Flash</option>
          </select>
          <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
            <RefreshCw className="w-3 h-3 group-hover:rotate-180 transition-transform duration-500" />
          </div>
        </div>
      </div>

      {/* Voice */}
      <div className="space-y-4">
        <label className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">
          <div className="w-1 h-1 rounded-full bg-primary shadow-[0_0_10px_rgba(0,242,255,0.5)]"></div>
          <Mic2 className="w-3 h-3" /> Giọng đọc cụ thể
        </label>
        <div className="relative group">
          <select
            value={voiceId}
            onChange={e => onVoiceIdChange(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-xs text-white focus:outline-none focus:border-primary/50 transition-all appearance-none cursor-pointer group-hover:bg-white/10"
          >
            <option value="default" className="bg-slate-900 italic font-medium">-- Theo cấu hình mặc định --</option>
            {filteredVoices.map(v => (
              <option key={v.id} value={v.id} className="bg-slate-900">{v.name} ({v.provider})</option>
            ))}
          </select>
          <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
            <Mic2 className="w-3 h-3" />
          </div>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 flex items-start gap-3">
        <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <p className="text-[9px] text-primary/70 leading-relaxed font-medium">
          Dự án hỗ trợ chuyển đổi giọng đọc thông minh. Nếu model ưu tiên gặp lỗi, hệ thống sẽ tự động dùng giọng tương ứng của các model khác để đảm bảo video luôn được tạo.
        </p>
      </div>
    </div>
  );
};
