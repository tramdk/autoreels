import { motion } from "motion/react";
import { type FrameProps } from "./CyberpunkFrame";
import { cn } from "../../utils/cn";
import { getTopPercent, getLeftPercent, getTransform } from "../../utils/pos";

export function ModernFrame(props: FrameProps) {
  const { ratio, title, content, type } = props;
  const s = props.settings || props;
  const {
    logoText, logoColor, logoTop, logoLeft, logoSize, logoAlign, logoPlacement,
    hookColor, hookSize, bodyColor, bodySize, textColor, bodyText, dividerColor, showDatetime,
    showLogo, showTag, tagText, tagBg, tagColor,
    tagTop, tagLeft, tagSize, tagAlign, tagPlacement,
    mainTop, mainLeft, mainAlign, mainPlacement
  } = s;
  
  const primaryColor = logoColor || '#ffffff';
  
  // Convert px to % based on 1080x1920 standard

  return (
    <div 
      className="absolute inset-0 pointer-events-none select-none z-10 w-full h-full overflow-hidden"
      style={{ containerType: 'size' } as any}
    >
      
      {/* Top Header */}
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
            fontSize: `calc(1cqmin * ${(logoSize || 60) / 7.2})`
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
        {type === 'hook' && (
           <motion.div 
             initial={{ x: -20, opacity: 0 }}
             animate={{ x: 0, opacity: 1 }}
             className="px-4 py-1.5 bg-primary/20 border-l-2 border-primary text-[2cqmin] font-black tracking-[0.3em] text-primary uppercase mb-2"
           >
             TRENDING NOW
           </motion.div>
        )}
        
        <motion.h2 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="font-black leading-[1.1] tracking-tighter uppercase w-full"
          style={{ 
            color: textColor || (hookColor || '#ffffff'), 
            fontSize: `calc(1cqmin * ${(hookSize || 120) / 7.2})` 
          }}
        >
          {bodyText || title}
        </motion.h2>

        <div className="w-12 h-1 bg-primary rounded-full" style={{ backgroundColor: dividerColor }} />

        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="font-bold leading-relaxed opacity-80 w-full"
          style={{ 
            color: bodyColor || '#ffffff', 
            fontSize: `calc(1cqmin * ${(bodySize || 48) / 7.2})` 
          }}
        >
          {content}
        </motion.p>
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
            className="px-6 py-2 font-black uppercase tracking-wider transform skew-x-[-12deg]"
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
          <div className="text-white/40 text-[1.5cqmin] font-bold tracking-widest uppercase">
            {new Date().toLocaleDateString('vi-VN').replace(/-/g, '.')}
          </div>
        )}
      </div>
    </div>
  );
}
