import { motion } from "motion/react";
import { type FrameProps } from "./CyberpunkFrame";
import { cn } from "../../utils/cn";
import { getTopPercent, getLeftPercent, getTransform } from "../../utils/pos";

export function ClassicFrame({
  ratio, title, content, type, bodyText,
  logoText, logoColor, logoTop, logoLeft, logoSize, logoAlign, logoPlacement,
  hookColor, hookSize, bodyColor, bodySize, textColor,
  showLogo, showDatetime, showTag, tagText, tagBg, tagColor,
  tagTop, tagLeft, tagSize, tagAlign, tagPlacement,
  mainTop, mainLeft, mainAlign, mainPlacement, dividerColor
}: FrameProps) {
  const primaryColor = logoColor || '#ffffff';
  
  return (
    <div 
      className="absolute inset-0 pointer-events-none select-none z-10 w-full h-full overflow-hidden"
      style={{ containerType: 'size' } as any}
    >
      {/* Classic Gradient Overlay (as per classic/index.html) */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#8ba9ef8c] via-[#5ce48abf] to-[#b2d75dec] opacity-30 z-0" />

      {/* Brand Logo */}
      {showLogo !== false && (
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="absolute z-40 font-black tracking-widest uppercase whitespace-nowrap"
          style={{ 
            top: getTopPercent(logoTop, logoPlacement || 'top'), 
            left: getLeftPercent(logoLeft, logoAlign || 'center'),
            transform: getTransform(logoAlign || 'center', logoPlacement || 'top'),
            color: primaryColor,
            fontSize: `calc(1cqmin * ${(logoSize || 60) / 7.2})`,
            textShadow: `0 0 30px ${primaryColor}88`
          }}
        >
          {logoText || 'AUTOREELS'}
        </motion.div>
      )}

      {/* Content Area */}
      <div 
        className={cn(
          "absolute flex flex-col z-30 w-full",
          mainAlign === 'center' ? "items-center text-center" : mainAlign === 'right' ? "items-end text-right" : "items-start text-left",
          "gap-4"
        )}
        style={{ 
          top: getTopPercent(mainTop, mainPlacement || 'center'), 
          left: getLeftPercent(mainLeft, mainAlign || 'center'),
          transform: getTransform(mainAlign || 'center', mainPlacement || 'center'),
          padding: '0 60px'
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full flex flex-col gap-4"
          style={{ alignItems: mainAlign === 'center' ? 'center' : mainAlign === 'right' ? 'flex-end' : 'flex-start' }}
        >
          {type === 'hook' && (
             <div className="text-[1.5cqmin] font-black tracking-[0.4em] text-white opacity-60 uppercase mb-2">TRENDING</div>
          )}
          
          <h2 
            className="font-black leading-[1.1] uppercase w-full" 
            style={{ 
              color: textColor || (type === 'hook' ? (hookColor || '#ffffff') : (bodyColor || '#ffffff')), 
              fontSize: type === 'hook' ? `calc(1cqmin * ${(hookSize || 90) / 7.2})` : `calc(1cqmin * ${(bodySize || 70) / 7.2})`
            }}
          >
            {bodyText || title}
          </h2>

          <div className="w-16 h-1 bg-white/20 rounded-full" style={{ backgroundColor: dividerColor }} />

          <p className="font-bold leading-relaxed w-full" style={{ color: bodyColor || '#ffffff', fontSize: `calc(1cqmin * ${(bodySize || 48) / 7.2})` }}>
            {content}
          </p>
        </motion.div>
      </div>

      {/* Bottom Info */}
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
            className="px-6 py-2 font-black uppercase tracking-wider rounded-md"
            style={{ 
              backgroundColor: tagBg || '#fff000', 
              color: tagColor || '#000000',
              fontSize: `calc(1cqmin * ${(tagSize || 32) / 7.2})`
            }}
          >
            {tagText || 'MUST WATCH'}
          </div>
        )}
        {showDatetime !== false && (
          <div className="text-white/60 text-[1.5cqmin] font-bold tracking-widest uppercase">
            {new Date().toLocaleDateString('vi-VN').replace(/-/g, '.')}
          </div>
        )}
      </div>
    </div>
  );
}
