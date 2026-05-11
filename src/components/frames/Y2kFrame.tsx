import { motion } from "motion/react";
import { type FrameProps } from "./CyberpunkFrame";
import { cn } from "../../utils/cn";
import { getTopPercent, getLeftPercent, getTransform } from "../../utils/pos";

export function Y2kFrame({
  ratio, title, content, type, bodyText,
  logoText, logoColor, logoTop, logoLeft, logoSize, logoAlign, logoPlacement,
  hookColor, hookSize, bodyColor, bodySize,
  dividerColor, showLogo, showTag, tagText, tagBg, tagColor,
  tagTop, tagLeft, tagSize, tagAlign, tagPlacement,
  mainTop, mainLeft, mainAlign, mainPlacement
}: FrameProps) {
  const primaryColor = logoColor || '#3b82f6'; // blue-500
  const accentColor = dividerColor || '#f472b6'; // pink-400
  
  return (
    <div 
      className="absolute inset-0 pointer-events-none select-none z-10 w-full h-full overflow-hidden"
      style={{ containerType: 'size' } as any}
    >
      
      {/* Brand Logo - Styled as Y2K button/badge */}
      {showLogo !== false && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute z-40 whitespace-nowrap"
          style={{ 
            top: getTopPercent(logoTop, logoPlacement || 'top'),
            left: getLeftPercent(logoLeft, logoAlign || 'center'),
            transform: getTransform(logoAlign || 'center', logoPlacement || 'top')
          }}
        >
          <div 
            className="bg-[#333] border-2 border-white px-6 py-2 rounded-full font-black uppercase tracking-widest shadow-[4px_4px_0_#ff66cc]"
            style={{ 
              color: primaryColor,
              fontSize: `calc(1cqmin * ${(logoSize || 24) / 7.2})`,
              boxShadow: `4px 4px 0px ${accentColor}`
            }}
          >
            {logoText || 'AUTOREELS'}
          </div>
        </motion.div>
      )}

      {/* Content Area */}
      <div 
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
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white border-4 border-black p-6 rounded-[2.5rem] shadow-[12px_12px_0px_#ff66cc] w-full"
          style={{ boxShadow: `12px 12px 0px ${accentColor}` }}
        >
          <h2 
            className="font-black leading-tight uppercase mb-4 w-full" 
            style={{ 
              color: textColor || (type === 'hook' ? (hookColor || '#333') : (bodyColor || '#333')), 
              fontSize: type === 'hook' ? `calc(1cqmin * ${(hookSize || 64) / 7.2})` : `calc(1cqmin * ${(bodySize || 48) / 7.2})`
            }}
          >
            {bodyText || title}
          </h2>
          <div className="w-full h-1 bg-black/10 rounded-full mb-4" />
          <p className="font-bold leading-relaxed w-full" style={{ color: bodyColor || '#333', fontSize: `calc(1cqmin * ${(bodySize || 32) / 7.2})` }}>
            {content}
          </p>
        </motion.div>
      </div>

      {/* Bottom Tag */}
      <div 
        className="absolute z-40 flex items-center justify-center whitespace-nowrap"
        style={{ 
          top: getTopPercent(tagTop, tagPlacement || 'bottom'),
          left: getLeftPercent(tagLeft, tagAlign || 'center'),
          transform: getTransform(tagAlign || 'center', tagPlacement || 'bottom')
        }}
      >
        {showTag !== false && (
          <div 
            className="bg-white border-2 border-black px-4 py-1 font-bold uppercase tracking-tighter shadow-[2px_2px_0_#000]"
            style={{ 
              backgroundColor: tagBg || '#fff000',
              color: tagColor || '#000000',
              fontSize: `calc(1cqmin * ${(tagSize || 20) / 7.2})`
            }}
          >
            {tagText || 'MUST WATCH'}
          </div>
        )}
      </div>
    </div>
  );
}
