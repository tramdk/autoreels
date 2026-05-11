import { motion } from "motion/react";
import { type FrameProps } from "./CyberpunkFrame";
import { cn } from "../../utils/cn";
import { getTopPercent, getLeftPercent, getTransform } from "../../utils/pos";

export function GlassmorphismFrame({
  ratio, title, content, type, bodyText,
  logoText, logoColor, logoTop, logoLeft, logoSize, logoAlign, logoPlacement,
  hookColor, hookSize, bodyColor, bodySize,
  dividerColor, showLogo, showTag, tagText, tagBg, tagColor,
  tagTop, tagLeft, tagSize, tagAlign, tagPlacement,
  mainTop, mainLeft, mainAlign, mainPlacement
}: FrameProps) {
  const accentColor = dividerColor || '#22d3ee'; // cyan-400
  const primaryColor = logoColor || '#ffffff';

  return (
    <div 
      className="absolute inset-0 pointer-events-none select-none z-10 w-full h-full overflow-hidden"
      style={{ containerType: 'size' } as any}
    >

      {/* Decorative Blur Orbs */}
      <motion.div
        animate={{
          x: [0, 30, 0],
          y: [0, 20, 0]
        }}
        transition={{ repeat: Infinity, duration: 10, ease: "easeInOut" }}
        className="absolute -top-20 -left-20 w-64 h-64 bg-purple-500/20 rounded-full blur-[80px]"
      />
      <motion.div
        animate={{
          x: [0, -40, 0],
          y: [0, -30, 0]
        }}
        transition={{ repeat: Infinity, duration: 12, ease: "easeInOut" }}
        className="absolute -bottom-20 -right-20 w-80 h-80 bg-cyan-500/20 rounded-full blur-[100px]"
      />

      <div className="relative w-full h-full">
        {/* Top Header - Branding */}
        {showLogo !== false && (
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="absolute backdrop-blur-xl bg-white/5 border border-white/20 h-10 px-6 rounded-full shadow-xl shadow-black/10 flex items-center gap-3 whitespace-nowrap"
            style={{ 
              top: getTopPercent(logoTop, logoPlacement || 'top'),
              left: getLeftPercent(logoLeft, logoAlign || 'center'),
              transform: getTransform(logoAlign || 'center', logoPlacement || 'top')
            }}
          >
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accentColor }} />
            <span className="font-black uppercase tracking-widest" style={{ color: primaryColor, fontSize: `calc(1cqmin * ${(logoSize || 24) / 7.2})` }}>
              {logoText || 'AUTOREELS'}
            </span>
          </motion.div>
        )}

        {/* Content Card */}
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", damping: 20 }}
          className={cn(
            "absolute flex flex-col z-30 w-full",
            mainAlign === 'center' ? "items-center text-center" : mainAlign === 'right' ? "items-end text-right" : "items-start text-left"
          )}
          style={{ 
            top: getTopPercent(mainTop, mainPlacement || 'center'),
            left: getLeftPercent(mainLeft, mainAlign || 'center'),
            transform: getTransform(mainAlign || 'center', mainPlacement || 'center'),
            padding: '0 60px'
          }}
        >
          <div className="backdrop-blur-2xl bg-white/10 border border-white/20 border-b-white/10 border-r-white/10 p-6 rounded-[2rem] shadow-2xl flex flex-col gap-3 w-full backdrop-saturate-200">
            <h2 
              className="text-white font-bold leading-tight uppercase w-full" 
              style={{ 
                color: textColor || (type === 'hook' ? (hookColor || '#ffffff') : (bodyColor || '#ffffff')), 
                fontSize: type === 'hook' ? `calc(1cqmin * ${(hookSize || 64) / 7.2})` : `calc(1cqmin * ${(bodySize || 48) / 7.2})`
              }}
            >
              {bodyText || title}
            </h2>
            <p className="font-medium opacity-80 w-full" style={{ color: bodyColor || '#ffffffcc', fontSize: `calc(1cqmin * ${(bodySize || 32) / 7.2})` }}>
              {content}
            </p>
          </div>
        </motion.div>

        {/* Tag Info */}
        <div 
          className="absolute z-40 flex items-center gap-4 whitespace-nowrap"
          style={{ 
            top: getTopPercent(tagTop, tagPlacement || 'bottom'),
            left: getLeftPercent(tagLeft, tagAlign || 'center'),
            transform: getTransform(tagAlign || 'center', tagPlacement || 'bottom')
          }}
        >
          {showTag !== false && (
            <div 
              className="px-6 py-2 font-black uppercase tracking-wider rounded-full backdrop-blur-xl bg-white/10 border border-white/20"
              style={{ 
                backgroundColor: tagBg || 'transparent',
                color: tagColor || '#ffffff',
                fontSize: `calc(1cqmin * ${(tagSize || 24) / 7.2})`
              }}
            >
              {tagText || 'MUST WATCH'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
