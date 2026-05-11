import { motion } from "motion/react";
import { type FrameProps } from "./CyberpunkFrame";
import { cn } from "../../utils/cn";
import { getTopPercent, getLeftPercent, getTransform } from "../../utils/pos";

export function BoldFrame({
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
          animate={{ opacity: 1 }}
          className="absolute z-40 whitespace-nowrap"
          style={{ 
            top: getTopPercent(logoTop, logoPlacement || 'top'),
            left: getLeftPercent(logoLeft, logoAlign || 'center'),
            transform: getTransform(logoAlign || 'center', logoPlacement || 'top')
          }}
        >
          <span 
            className="font-black tracking-tighter uppercase transform skew-x-[-10deg]" 
            style={{ 
              color: primaryColor,
              fontSize: `calc(1cqmin * ${(logoSize || 40) / 7.2})`
            }}
          >
            {logoText || 'AUTOREELS'}
          </span>
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
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="flex flex-col items-center text-center w-full"
        >
          <h2 
            className="font-black uppercase tracking-tighter leading-none w-full" 
            style={{ 
              color: type === 'hook' ? (hookColor || '#ff3e3e') : (bodyColor || '#ffffff'), 
              fontSize: type === 'hook' ? `calc(1cqmin * ${(hookSize || 90) / 7.2})` : `calc(1cqmin * ${(bodySize || 80) / 7.2})`,
              transform: type === 'hook' ? 'skewX(-5deg)' : 'none'
            }}
          >
            {bodyText || title}
            {content && content !== title && <span className="block mt-4 opacity-90 leading-tight" style={{ fontSize: '0.6em' }}>{content}</span>}
          </h2>
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
            className="px-8 py-3 font-black uppercase transform skew-x-[-15deg]"
            style={{ 
              backgroundColor: tagBg || '#ff0033', 
              color: tagColor || '#ffffff',
              fontSize: `calc(1cqmin * ${(tagSize || 32) / 7.2})`
            }}
          >
            {tagText || 'MUST WATCH'}
          </div>
        )}
      </div>

    </div>
  );
}
