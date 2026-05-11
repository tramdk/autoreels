import React from 'react';
import { Music, Play, Pause, Volume2, VolumeX } from 'lucide-react';

interface BGMSectionProps {
  presets: any[];
  selectedId: string;
  onSelect: (id: string) => void;
  volume: number;
  onVolumeChange: (v: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onUpload: (file: File) => Promise<void>;
  isUploading?: boolean;
}

export const BGMSection: React.FC<BGMSectionProps> = ({
  presets,
  selectedId,
  onSelect,
  volume,
  onVolumeChange,
  isPlaying,
  onTogglePlay,
  onUpload,
  isUploading
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">
          <div className="w-1 h-1 rounded-full bg-purple-400 shadow-[0_0_10px_rgba(192,132,252,0.5)]"></div>
          <Music className="w-3 h-3" /> Nhạc nền (BGM)
        </label>
        
        <button 
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="text-[10px] font-black uppercase text-purple-400 hover:text-white transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          {isUploading ? (
            <div className="w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          )}
          Tải lên
        </button>
        <input 
          ref={fileInputRef}
          type="file" 
          accept="audio/*" 
          className="hidden" 
          onChange={handleFileChange}
        />
      </div>
      
      <div className="space-y-4">
        <div className="relative group">
          <select
            value={selectedId}
            onChange={e => onSelect(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-xs text-white focus:outline-none focus:border-purple-400/50 transition-all appearance-none cursor-pointer group-hover:bg-white/10"
          >
            <option value="none" className="bg-slate-900">🔇 Không dùng nhạc nền</option>
            {presets.filter(b => b.type === 'preset').length > 0 && (
              <optgroup label="🎵 Nhạc có sẵn" className="bg-slate-900">
                {presets.filter(b => b.type === 'preset').map(b => (
                  <option key={b.id} value={b.id} className="bg-slate-900">
                    {b.name} — {b.description}
                  </option>
                ))}
              </optgroup>
            )}
            {presets.filter(b => b.type === 'uploaded').length > 0 && (
              <optgroup label="📁 Đã tải lên" className="bg-slate-900">
                {presets.filter(b => b.type === 'uploaded').map(b => (
                  <option key={b.id} value={b.id} className="bg-slate-900">
                    {b.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
          <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
            <Music className="w-3 h-3" />
          </div>
        </div>

        {selectedId !== 'none' && (
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 animate-in fade-in slide-in-from-top-2 duration-300">
            <button
              onClick={onTogglePlay}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all border ${
                isPlaying 
                  ? 'bg-purple-500/20 border-purple-500/30 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.2)]' 
                  : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            
            <div className="flex-1 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Volume</span>
                <span className="text-[10px] font-black text-purple-400 tabular-nums">
                  {Math.round(volume * 100)}%
                </span>
              </div>
              <div className="flex items-center gap-3">
                <VolumeX className="w-3 h-3 text-slate-600 shrink-0" />
                <div className="relative flex-1 h-1.5 flex items-center group">
                   <div className="absolute inset-0 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.5)] transition-all" style={{ width: `${(volume / 0.5) * 100}%` }} />
                   </div>
                   <input
                    type="range"
                    min="0.02"
                    max="0.5"
                    step="0.01"
                    value={volume}
                    onChange={e => onVolumeChange(parseFloat(e.target.value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                </div>
                <Volume2 className="w-3 h-3 text-slate-600 shrink-0" />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 rounded-2xl bg-purple-400/5 border border-purple-400/10 backdrop-blur-sm">
        <p className="text-[9px] text-purple-400/70 leading-relaxed font-medium italic">
          Tip: Nhạc nền sẽ được lặp lại tự động và trộn ở âm lượng thấp để tôn vinh giọng đọc AI.
        </p>
      </div>
    </div>
  );
};
