import { motion } from "motion/react";
import { type ReactNode } from "react";
import { cn } from "../../utils/cn";

import { getTopPercent, getLeftPercent, getTransform } from "../../utils/pos";

export interface FrameProps {
  children?: ReactNode;
  ratio: "16:9" | "9:16" | "1:1" | "4:3";
  title?: string;
  content?: string;
  type?: string;
  bodyText?: string;
  // Template settings
  logoText?: string;
  logoColor?: string;
  logoTop?: number;
  logoLeft?: number;
  logoSize?: number;
  logoAlign?: 'left' | 'center' | 'right';
  logoPlacement?: 'top' | 'center' | 'bottom';
  logoAnim?: string;
  hookColor?: string;
  hookSize?: number;
  hookAnim?: string;
  bodyColor?: string;
  bodySize?: number;
  bodyAnim?: string;
  textColor?: string;
  dividerColor?: string;
  dividerWidth?: number;
  mainTop?: number;
  mainLeft?: number;
  mainAlign?: 'left' | 'center' | 'right';
  mainPlacement?: 'top' | 'center' | 'bottom';
  tagText?: string;
  tagBg?: string;
  tagColor?: string;
  tagTop?: number;
  tagLeft?: number;
  tagSize?: number;
  tagAlign?: 'left' | 'center' | 'right';
  tagPlacement?: 'top' | 'center' | 'bottom';
  showLogo?: boolean;
  showTag?: boolean;
  showDatetime?: boolean;
  showCard?: boolean;
  settings?: any;
}

export function CyberpunkFrame(props: FrameProps) {
  const { ratio, title, content, type } = props;
  const s = props.settings || props;
  const {
    logoText, logoColor, logoTop, logoLeft, logoSize, logoAlign, logoPlacement,
    hookColor, hookSize, bodyColor, bodySize, textColor, bodyText,
    dividerColor, showLogo, showTag, tagText, tagBg, tagColor,
    tagTop, tagLeft, tagSize, tagAlign, tagPlacement,
    mainTop, mainLeft, mainAlign, mainPlacement
  } = s;
  const accentColor = logoColor || '#22d3ee'; // cyan-400
  const secondaryColor = dividerColor || '#d946ef'; // fuchsia-500
  

  return (
    <div 
      className="absolute inset-0 pointer-events-none select-none z-10 w-full h-full overflow-hidden"
      style={{ containerType: 'size' } as any}
    >
      {/* Container Box with glitch pulse */}
      <motion.div 
        initial={{ opacity: 0, scale: 1.1 }}
        animate={{ opacity: 1, scale: 1 }}
        className="absolute inset-4 border shadow-[0_0_15px_rgba(34,211,238,0.2)_inset,0_0_15px_rgba(34,211,238,0.2)]"
        style={{ borderColor: `${accentColor}80` }}
      >
        {/* Corner Brackets */}
        {[
          "top-0 left-0 border-t-2 border-l-2",
          "top-0 right-0 border-t-2 border-r-2",
          "bottom-0 left-0 border-b-2 border-l-2",
          "bottom-0 right-0 border-b-2 border-r-2"
        ].map((pos, i) => (
          <motion.div
            key={i}
            animate={{ opacity: [1, 0.4, 1, 0.8, 1] }}
            transition={{ repeat: Infinity, duration: 2, delay: i * 0.2 }}
            className={`absolute w-8 h-8 ${pos} ${pos.includes('left') ? '-translate-x-1' : 'translate-x-1'} ${pos.includes('top') ? '-translate-y-1' : 'translate-y-1'}`}
            style={{ borderColor: `${accentColor}cc` }}
          />
        ))}
        
        {/* Top Indicators - Branding */}
        {showLogo !== false && (
          <div 
            className="absolute flex items-center gap-3 whitespace-nowrap"
            style={{ 
              top: getTopPercent(logoTop, logoPlacement || 'top'),
              left: getLeftPercent(logoLeft, logoAlign || 'center'),
              transform: getTransform(logoAlign || 'center', logoPlacement || 'top')
            }}
          >
            <motion.div 
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 1 }}
              className="w-2 h-2 rounded-sm" 
              style={{ backgroundColor: secondaryColor }}
            />
            <span className="font-mono font-black uppercase tracking-widest" style={{ color: accentColor, fontSize: `calc(1cqmin * ${(logoSize || 24) / 7.2})` }}>
              {logoText || 'AUTOREELS'}
            </span>
          </div>
        )}

        {/* Bottom Lower Third */}
        <motion.div 
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className={cn(
            "absolute flex flex-col z-10 w-full",
            mainAlign === 'center' ? "items-center text-center" : mainAlign === 'right' ? "items-end text-right" : "items-start text-left"
          )}
          style={{ 
            top: getTopPercent(mainTop, mainPlacement || 'center'),
            left: getLeftPercent(mainLeft, mainAlign || 'center'),
            transform: getTransform(mainAlign || 'center', mainPlacement || 'center'),
            padding: '0 60px'
          }}
        >
          <div className="backdrop-blur-md bg-black/60 border-l-4 p-4 pr-10 shadow-[4px_0_15px_rgba(217,70,239,0.3)] w-full" style={{ borderLeftColor: secondaryColor }}>
            <h2 
              className="text-white font-black tracking-wider uppercase drop-shadow-md leading-tight w-full" 
              style={{ 
                color: textColor || (type === 'hook' ? (hookColor || '#ffffff') : (bodyColor || '#ffffff')), 
                fontSize: type === 'hook' ? `calc(1cqmin * ${(hookSize || 80) / 7.2})` : `calc(1cqmin * ${(bodySize || 48) / 7.2})`
              }}
            >
              {bodyText || title}
              {content && content !== title && <span className="block mt-2 opacity-90 leading-relaxed" style={{ fontSize: '0.6em' }}>{content}</span>}
            </h2>
          </div>
        </motion.div>

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
              className="px-4 py-1 border-l-2 font-mono text-[8px] tracking-[0.2em] uppercase backdrop-blur-sm"
              style={{ 
                backgroundColor: tagBg || 'rgba(0,0,0,0.5)',
                color: tagColor || accentColor,
                borderLeftColor: secondaryColor,
                fontSize: `calc(1cqmin * ${(tagSize || 18) / 7.2})`
              }}
            >
              {tagText || 'STATUS_ACTIVE'}
            </div>
          )}
        </div>

        {/* Scanning Line overlay */}
        <motion.div 
          animate={{ top: ["-10%", "110%"] }}
          transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
          className="absolute left-0 right-0 h-24 bg-gradient-to-b from-transparent to-transparent opacity-50 z-[-1]" 
          style={{ backgroundImage: `linear-gradient(to bottom, transparent, ${accentColor}1a, transparent)` }}
        />
      </motion.div>
    </div>
  );
}
