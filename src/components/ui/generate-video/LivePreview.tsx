import React from 'react';
import { Video as VideoIcon, RefreshCw } from 'lucide-react';

interface LivePreviewProps {
  templateId: string;
  templateData: any;
  loading: boolean;
  scale?: number;
}

export const LivePreview: React.FC<LivePreviewProps> = ({ 
  templateId, 
  templateData, 
  loading,
  scale = 240 / 1080
}) => {
  return (
    <div className="w-full lg:flex-1 bg-black/40 flex flex-col items-center justify-center p-8 lg:p-12 relative overflow-hidden shrink-0 min-h-[400px] lg:min-h-0">
      {/* Decorative Background Glows */}
      <div className="absolute top-0 left-0 w-full h-full opacity-30 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-primary/10 blur-[100px] rounded-full animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-purple-500/10 blur-[80px] rounded-full animate-pulse delay-1000"></div>
      </div>

      <div className="text-[10px] font-black uppercase text-slate-600 mb-10 tracking-[0.5em] z-10 flex items-center gap-4">
        <div className="w-8 h-[1px] bg-slate-800"></div>
        Live Visual Preview
        <div className="w-8 h-[1px] bg-slate-800"></div>
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/40 backdrop-blur-[2px] transition-all">
          <div className="relative">
            <RefreshCw className="w-12 h-12 text-primary animate-spin" />
            <div className="absolute inset-0 bg-primary/20 blur-xl animate-pulse" />
          </div>
        </div>
      )}

      <div className="z-10 transform scale-110 lg:scale-125 transition-all duration-700">
        {templateData ? (
          <div className="relative w-[220px] aspect-[9/16] rounded-[3rem] border-[8px] border-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden bg-black select-none">
            {/* Background Layer */}
            <div className="absolute inset-0">
              {templateData.backgroundImage ? (
                <img
                  src={templateData.backgroundImage}
                  className="absolute inset-0 w-full h-full object-contain transition-all duration-1000"
                  style={{
                    filter: `brightness(${templateData.backgroundBrightness || 0.4}) saturate(1.2)`,
                    opacity: loading ? 0.4 : 1,
                    transform: loading ? 'scale(1.1)' : 'scale(1)'
                  }}
                  alt=""
                />
              ) : (
                <div className="absolute inset-0 bg-slate-950 flex items-center justify-center">
                  <VideoIcon className="w-12 h-12 text-white/5" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/90" />
            </div>

            {/* Content Layer */}
            <div className="absolute inset-0 z-10 pointer-events-none p-6 flex flex-col justify-end pb-12 transition-all duration-500"
                 style={{ opacity: loading ? 0.5 : 1 }}>
              
              {templateData.showLogo !== false && (
                <div className="absolute" style={{ top: (templateData.logoTop || 100) * scale, left: '50%', transform: `translateX(-50%)` }}>
                  <span className="font-black text-center uppercase whitespace-nowrap block" style={{
                    fontFamily: 'Anton, sans-serif',
                    color: templateData.logoColor || '#ffffff',
                    fontSize: (templateData.logoSize || 60) * scale,
                    letterSpacing: (templateData.logoLetterSpacing || 4) * scale,
                    textShadow: '0 2px 10px rgba(0,0,0,0.5)'
                  }}>
                    {templateData.logoText || 'AUTOREELS'}
                  </span>
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-1">
                   <div className="h-0.5 bg-primary/50 w-8 rounded-full mb-2" />
                   <h3 className="font-black uppercase tracking-tighter" style={{
                    fontFamily: 'Anton, sans-serif',
                    color: templateData.hookColor || '#ffffff',
                    fontSize: (templateData.hookSize || 120) * scale,
                    lineHeight: 0.9,
                    textShadow: '0 5px 20px rgba(0,0,0,0.8)'
                  }}>
                    {templateId.toUpperCase()}<br />COLLECTION
                  </h3>
                </div>
                <div className="h-1 rounded-full shadow-lg" style={{ width: (templateData.dividerWidth || 150) * scale, backgroundColor: templateData.dividerColor || '#00f2ff' }}></div>
              </div>
            </div>
            
            {/* Glossy Overlay Reflecting light */}
            <div className="absolute inset-0 pointer-events-none border border-white/10 rounded-[2.5rem] m-1" />
          </div>
        ) : (
          <div className="w-[220px] aspect-[9/16] rounded-[3.5rem] bg-white/5 border border-white/5 flex flex-col items-center justify-center gap-4 backdrop-blur-md">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center border border-white/5">
               <VideoIcon className="w-8 h-8 text-slate-600" />
            </div>
            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">No Preview Available</span>
          </div>
        )}
      </div>
    </div>
  );
};
