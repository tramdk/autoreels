import React from 'react';

interface PlatformCardProps {
  name: string;
  icon: React.ReactNode;
  isConnected: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
  channelName?: string;
  brandColor: string;
}

export const PlatformCard: React.FC<PlatformCardProps> = ({ 
  name, 
  icon, 
  isConnected, 
  onConnect, 
  onDisconnect, 
  channelName, 
  brandColor 
}) => {
  return (
    <div className="glass p-6 sm:p-8 rounded-[32px] sm:rounded-[40px] border border-white/5 flex flex-col justify-between group hover:border-white/10 transition-all">
      <div className="flex items-center justify-between mb-8 sm:mb-10">
        <div className="flex items-center gap-4 sm:gap-6">
          <div className={`w-14 h-14 sm:w-20 sm:h-20 ${brandColor} text-white rounded-[20px] sm:rounded-[28px] flex items-center justify-center shadow-2xl shrink-0`}>
            {React.cloneElement(icon as React.ReactElement, { className: 'w-6 h-6 sm:w-8 sm:h-8' })}
          </div>
          <div className="min-w-0">
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-1 truncate">{name}</h3>
            {isConnected ? (
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shrink-0" />
                <p className="text-[10px] sm:text-xs font-black text-green-500 uppercase tracking-widest truncate">{channelName || 'Connected'}</p>
              </div>
            ) : (
              <p className="text-[10px] sm:text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Awaiting Link</p>
            )}
          </div>
        </div>
      </div>
      {isConnected ? (
        <button onClick={onDisconnect} className="w-full py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 hover:text-white hover:bg-white/5 rounded-xl sm:rounded-2xl transition-all border border-white/5">Disconnect Account</button>
      ) : (
        <button onClick={onConnect} className="w-full py-4 sm:py-5 bg-white text-black rounded-xl sm:rounded-2xl font-black uppercase tracking-[0.1em] text-xs sm:text-sm shadow-xl hover:bg-slate-200 active:scale-95 transition-all">Link Professional Page</button>
      )}
    </div>
  );
};
