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
    <div className="glass p-8 rounded-[40px] border border-white/5 flex flex-col justify-between group hover:border-white/10 transition-all">
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-6">
          <div className={`w-20 h-20 ${brandColor} text-white rounded-[28px] flex items-center justify-center shadow-2xl`}>
            {icon}
          </div>
          <div>
            <h3 className="text-2xl font-bold text-white mb-1">{name}</h3>
            {isConnected ? (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <p className="text-sm font-bold text-green-500 uppercase tracking-widest">{channelName || 'Connected'}</p>
              </div>
            ) : (
              <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Awaiting Link</p>
            )}
          </div>
        </div>
      </div>
      {isConnected ? (
        <button onClick={onDisconnect} className="w-full py-4 text-xs font-black uppercase tracking-[0.2em] text-slate-600 hover:text-white hover:bg-white/5 rounded-2xl transition-all">Disconnect Account</button>
      ) : (
        <button onClick={onConnect} className="w-full py-5 bg-white text-black rounded-2xl font-black uppercase tracking-[0.1em] shadow-xl hover:bg-slate-200 active:scale-95 transition-all">Link Professional Page</button>
      )}
    </div>
  );
};
