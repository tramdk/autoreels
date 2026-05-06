import React from 'react';
import { motion } from 'motion/react';
import { PlatformCard } from '../../components/ui/PlatformCard';

interface SocialViewProps {
  isTikTokConnected: boolean;
  onConnectTikTok: () => void;
  onDisconnectTikTok: () => void;
}

export const SocialView: React.FC<SocialViewProps> = ({
  isTikTokConnected,
  onConnectTikTok,
  onDisconnectTikTok
}) => {
  return (
    <div className="flex flex-col">
      {/* Sticky Header */}
      <div className="sticky top-[76px] lg:top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-white/5 px-6 py-6 md:px-12 md:py-8 shrink-0">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white mb-1 uppercase">Kênh <span className="text-primary">Mạng xã hội</span></h1>
          <p className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-[0.2em]">Kết nối tài khoản để tự động phân phối video</p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="px-6 py-8 md:px-12 md:py-10">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          <PlatformCard 
            name="TikTok"
            icon={
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 0 1-5.201 1.743l-.002-.001.002.001a2.895 2.895 0 0 1 3.183-4.51v-3.5a6.329 6.329 0 0 0-5.394 10.692 6.33 6.33 0 0 0 10.857-4.424V8.687a8.182 8.182 0 0 0 4.773 1.526V6.79a4.831 4.831 0 0 1-1.003-.104z" />
              </svg>
            }
            isConnected={isTikTokConnected}
            onConnect={onConnectTikTok}
            onDisconnect={onDisconnectTikTok}
            brandColor="bg-[#FE2C55]"
          />

          <PlatformCard 
            name="YouTube Shorts"
            icon={
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19.812 5.418c.861.23 1.538.907 1.768 1.768C21.998 8.746 22 12 22 12s0 3.255-.418 4.814a2.504 2.504 0 0 1-1.768 1.768c-1.56.419-7.814.419-7.814.419s-6.255 0-7.814-.419a2.505 2.505 0 0 1-1.768-1.768C2 15.255 2 12 2 12s0-3.255.417-4.814a2.507 2.507 0 0 1 1.768-1.768C5.744 5 11.998 5 11.998 5s6.255 0 7.814.418ZM15.194 12 10 15V9l5.194 3Z" />
              </svg>
            }
            isConnected={true}
            channelName="AutoReels Official"
            brandColor="bg-[#FF0000]"
          />
        </div>
      </div>
    </div>
  );
};
