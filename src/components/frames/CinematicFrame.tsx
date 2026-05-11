import { motion } from "motion/react";
import { type FrameProps } from "./CyberpunkFrame";
import { cn } from "../../utils/cn";
import { getTopPercent, getLeftPercent, getTransform } from "../../utils/pos";

export function CinematicFrame(props: FrameProps) {
  const { ratio, title, content, type } = props;
  const s = props.settings || props;
  const {
    logoText, logoColor, logoTop, logoLeft, logoSize, logoAlign, logoPlacement,
    hookColor, hookSize, bodyColor, bodySize, textColor, bodyText,
    showLogo, showDatetime, showTag, tagText, tagBg, tagColor,
    tagTop, tagLeft, tagSize, tagAlign, tagPlacement,
    mainTop, mainLeft, mainAlign, mainPlacement
  } = s;
  const isWidescreen = ratio === "16:9";
  const primaryColor = logoColor || '#ffffff';
  

  return (
    <div 
      className="absolute inset-0 pointer-events-none select-none z-10 w-full h-full flex flex-col justify-between overflow-hidden"
      style={{ containerType: 'size' } as any}
    >

      {/* Film Grain Overall Overlay */}
      <motion.div
        animate={{
          x: [0, -5, 5, -2, 0],
          y: [0, 5, -5, 2, 0]
        }}
        transition={{ repeat: Infinity, duration: 0.2, ease: "linear" }}
        className="absolute inset-0 opacity-[0.12] mix-blend-overlay z-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
        }}
      />

      {/* Letterboxing Top */}
      <motion.div
        initial={{ height: 0 }}
        animate={{ height: isWidescreen ? '15%' : '10%' }}
        className="w-full bg-[#050505] z-20 px-[60px] shadow-lg border-b border-white/5 relative flex items-center justify-between"
      >
        <div className="z-40 flex items-center gap-3">
          <span className="font-mono font-bold tracking-widest uppercase text-white" style={{ fontSize: `calc(1cqmin * ${(logoSize || 32) / 7.2})` }}>
            {logoText || 'AUTOREELS PRODUCTION'}
          </span>
        </div>

        <div className="z-40 flex items-center gap-4">
          <span className="font-mono text-white tracking-widest flex items-center gap-3" style={{ fontSize: `calc(1cqmin * ${(tagSize || 18) / 7.2})` }}>
            <motion.div
              animate={{ opacity: [1, 0.3, 1], scale: [1, 0.9, 1] }}
              transition={{ repeat: Infinity, duration: 1 }}
              className="w-4 h-4 rounded-full bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.8)]"
            />
            {new Date().toLocaleDateString('vi-VN').replace(/-/g, '.')}
          </span>
        </div>
      </motion.div>

      {/* Main Content Overlay */}
      <div 
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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full"
        >
          <h2 
            className="text-white font-black uppercase tracking-tight leading-[1.05] drop-shadow-[0_10px_40px_rgba(0,0,0,0.8)] w-full" 
            style={{ 
              color: textColor || (type === 'hook' ? (hookColor || '#ffcc00') : (bodyColor || '#ffffff')), 
              fontSize: type === 'hook' ? `calc(1cqmin * ${(hookSize || 80) / 7.2})` : `calc(1cqmin * ${(bodySize || 48) / 7.2})`
            }}
          >
            {bodyText || title}
            {content && content !== title && <span className="block mt-4">{content}</span>}
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
            className="px-4 py-1 border border-white/20 backdrop-blur-md bg-black/40 font-mono text-[8px] tracking-[0.3em] uppercase"
            style={{ 
              backgroundColor: tagBg,
              color: tagColor || '#ffffff',
              fontSize: `calc(1cqmin * ${(tagSize || 18) / 7.2})`
            }}
          >
            {tagText || 'DIRECTOR CUT'}
          </div>
        )}
      </div>

      {/* Letterboxing Bottom */}
      <motion.div
        initial={{ height: 0 }}
        animate={{ height: isWidescreen ? '15%' : '10%' }}
        className="w-full bg-[#050505] z-20 flex justify-center items-center shadow-lg border-t border-white/5"
      >
        <div className="w-24 h-0.5 bg-white/10 rounded-full" />
      </motion.div>
    </div>
  );
}
