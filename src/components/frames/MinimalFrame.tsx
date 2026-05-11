import { motion } from "motion/react";
import { type FrameProps } from "./CyberpunkFrame";
import { cn } from "../../utils/cn";
import { getTopPercent, getLeftPercent, getTransform } from "../../utils/pos";

export function MinimalFrame({
  ratio, title, content, type, bodyText,
  logoText, logoColor, logoTop, logoLeft, logoSize, logoAlign, logoPlacement,
  hookColor, hookSize, bodyColor, bodySize,
  dividerColor, showLogo, showTag, tagText, tagBg, tagColor,
  tagTop, tagLeft, tagSize, tagAlign, tagPlacement,
  mainTop, mainLeft, mainAlign, mainPlacement
}: FrameProps) {
  const primaryColor = logoColor || '#ffffff';
  

  return (
    <div 
      className="absolute inset-0 pointer-events-none select-none z-10 w-full h-full overflow-hidden"
      style={{ containerType: 'size' } as any}
    >
      
      {/* Brand Logo */}
      {showLogo !== false && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.8 }}
          className="absolute z-40 font-light uppercase tracking-[0.5em] whitespace-nowrap"
          style={{ 
            top: getTopPercent(logoTop, logoPlacement || 'top'),
            left: getLeftPercent(logoLeft, logoAlign || 'center'),
            transform: getTransform(logoAlign || 'center', logoPlacement || 'top'),
            color: primaryColor,
            fontSize: `calc(1cqmin * ${(logoSize || 32) / 7.2})`
          }}
        >
          {logoText || 'AUTOREELS'}
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
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="space-y-4 w-full"
        >
          <h2 
            className="font-light tracking-tight leading-tight uppercase w-full" 
            style={{ 
              color: textColor || (type === 'hook' ? (hookColor || '#ffffff') : (bodyColor || '#ffffff')), 
              fontSize: type === 'hook' ? `calc(1cqmin * ${(hookSize || 56) / 7.2})` : `calc(1cqmin * ${(bodySize || 48) / 7.2})`,
              fontWeight: type === 'hook' ? 700 : 400
            }}
          >
            {bodyText || title}
          </h2>
          <p className="font-light leading-relaxed opacity-60 w-full" style={{ color: bodyColor || '#ffffffcc', fontSize: `calc(1cqmin * ${(bodySize || 32) / 7.2})` }}>
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
            className="font-bold uppercase tracking-[0.2em] opacity-40"
            style={{ 
              backgroundColor: tagBg || 'transparent',
              color: tagColor || '#ffffff',
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
