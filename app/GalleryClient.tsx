"use client";

import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";

interface Media {
  src: string;
  title: string;
  date: string;
  isVideo: boolean;
}

interface DisplayMedia extends Media {
  rotate: number;
  id: string;
}

// ==========================================
// 獨立的照片卡片元件 (已修復 Android 微抖動與 PC 誤觸 Bug)
// ==========================================
const PhotoCard = ({
  pic,
  zIndex,
  bringToFront,
  isMobile,
  onSelect,
  setGlobalScrollLock,
}: {
  pic: DisplayMedia;
  zIndex: number;
  bringToFront: (id: string) => void;
  isMobile: boolean;
  onSelect: (pic: DisplayMedia) => void;
  setGlobalScrollLock: (locked: boolean) => void;
}) => {
  const [rotate, setRotate] = useState(pic.rotate);
  const [isReadyToDrag, setIsReadyToDrag] = useState(false); 
  const [isDragging, setIsDragging] = useState(false);
  
  const dragControls = useDragControls();
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const hasMovedRef = useRef(false); 
  const startPos = useRef({ x: 0, y: 0 }); // 新增：精準紀錄按下去的座標
  const videoRef = useRef<HTMLVideoElement>(null); 

  useEffect(() => {
    if (pic.isVideo && videoRef.current) {
      videoRef.current.currentTime = 0.001;
    }
  }, [pic.isVideo]);

  const handlePointerDown = (e: React.PointerEvent) => {
    bringToFront(pic.id);
    // 紀錄按下去的初始位置
    startPos.current = { x: e.clientX, y: e.clientY };
    
    if (isMobile) {
      hasMovedRef.current = false;
      setIsReadyToDrag(false);
      
      timerRef.current = setTimeout(() => {
        if (!hasMovedRef.current) {
          setIsReadyToDrag(true);
          setGlobalScrollLock(true); 
          if (typeof window !== "undefined" && window.navigator && window.navigator.vibrate) {
            window.navigator.vibrate(50);
          }
        }
      }, 300); // 300ms 是體驗最好的長按時間
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isMobile) {
      if (isReadyToDrag && !isDragging) {
        // 長按完成，正式啟動拖曳！
        setIsDragging(true);
        try {
          dragControls.start(e, { snapToCursor: false });
        } catch (err) {
          console.error("Drag start failed", err);
        }
      } else if (!isReadyToDrag && !isDragging) {
        // 【修復 Android Bug】：容忍 10px 內的微抖動
        const dx = Math.abs(e.clientX - startPos.current.x);
        const dy = Math.abs(e.clientY - startPos.current.y);
        if (dx > 10 || dy > 10) {
          hasMovedRef.current = true;
          if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
          }
        }
      }
    }
  };

  const endInteraction = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (isReadyToDrag || isDragging) {
      setIsReadyToDrag(false);
      setIsDragging(false);
      setGlobalScrollLock(false);
      setRotate(Math.floor(Math.random() * 20) - 10); 
    }
  };

  return (
    <motion.div
      drag
      dragListener={!isMobile} 
      dragControls={dragControls}
      dragConstraints={{ top: 0, left: 0, right: 0, bottom: 0 }}
      dragElastic={0.4}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endInteraction}       
      onPointerCancel={endInteraction}   
      onDragEnd={endInteraction}         
      onContextMenu={(e) => {
        if (isMobile) e.preventDefault(); 
      }}
      whileDrag={{ scale: 1.05, zIndex: 1000 }}
      animate={{ rotate: rotate, scale: isDragging ? 1.05 : 1 }}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      style={{ 
        zIndex: isDragging ? 1000 : zIndex,
        WebkitTouchCallout: "none",
        WebkitUserSelect: "none",
        userSelect: "none"
      }}
      className={`bg-white p-2 pb-4 md:p-4 md:pb-6 shadow-lg select-none flex flex-col items-center
        w-[156px] md:w-[282px] /* <--- 這裡控制外層白色相框寬度 */
        ${!isMobile ? "cursor-grab active:cursor-grabbing" : ""}
        ${isDragging ? "cursor-grabbing shadow-2xl ring-4 ring-black/10" : ""}
      `}
    >
      <div
        className="relative overflow-hidden bg-gray-100 
          w-[140px] h-[140px] md:w-[250px] md:h-[250px]" /* <--- 這裡控制內部照片/影片的尺寸 */
        onClick={(e) => {
          // 【修復 PC 誤觸 Bug】：精準計算距離，超過 5px 視為拖曳，拒絕放大
          const dx = Math.abs(e.clientX - startPos.current.x);
          const dy = Math.abs(e.clientY - startPos.current.y);
          if (dx > 5 || dy > 5 || isDragging) {
            return;
          }
          onSelect(pic);
        }}
      >
        {pic.isVideo ? (
          <>
            <video 
              ref={videoRef}
              src={`${pic.src}#t=0.001`} 
              preload="metadata" 
              playsInline 
              muted 
              className="object-cover w-full h-full pointer-events-none bg-gray-200" 
            />
            <div className="absolute bottom-2 right-2 bg-black/50 backdrop-blur-md rounded-full p-2 shadow-sm">
              <svg className="w-4 h-4 md:w-5 md:h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </>
        ) : (
          <Image
            src={pic.src}
            alt={pic.title || pic.date}
            fill
            sizes="(max-width: 768px) 140px, 250px"
            className="object-cover pointer-events-none"
            priority={false}
          />
        )}
      </div>

      <div className="mt-3 text-center flex flex-col justify-start items-center w-full
        h-[40px] md:h-[48px]">
        <h1 className="text-[10px] md:text-sm font-bold text-gray-700 truncate w-full px-1">
          {pic.title || "\u00A0"}
        </h1>
        <p className="text-[10px] md:text-xs text-gray-400 mt-1 font-mono w-full">
          {pic.date || "\u00A0"}
        </p>
      </div>
    </motion.div>
  );
};

// ==========================================
// 主要 Gallery 容器
// ==========================================
export default function GalleryClient({ initialPictures }: { initialPictures: Media[] }) {
  const [pics, setPics] = useState<DisplayMedia[]>([]);
  const [visibleCount, setVisibleCount] = useState(15);
  const [zIndexes, setZIndexes] = useState<Record<string, number>>({});
  const [selectedPic, setSelectedPic] = useState<DisplayMedia | null>(null);
  
  const [isMobile, setIsMobile] = useState(false);
  const [globalScrollLock, setGlobalScrollLock] = useState(false);
  
  const observerTarget = useRef(null);

  useEffect(() => {
    const processed = initialPictures.map((p, i) => ({
      ...p,
      id: `pic-${i}`,
      rotate: Math.floor(Math.random() * 10) - 5,
    }));
    const shuffled = processed.sort(() => 0.5 - Math.random());
    setPics(shuffled);

    const initialZ: Record<string, number> = {};
    shuffled.forEach((p, i) => { initialZ[p.id] = i; });
    setZIndexes(initialZ);

    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, [initialPictures]);

  useEffect(() => {
    const preventNativeScroll = (e: TouchEvent) => {
      e.preventDefault();
    };

    if (selectedPic || globalScrollLock) {
      document.body.style.overflow = "hidden";
      document.addEventListener("touchmove", preventNativeScroll, { passive: false });
    } else {
      document.body.style.overflow = "auto";
      document.removeEventListener("touchmove", preventNativeScroll);
    }
    
    return () => { 
      document.body.style.overflow = "auto"; 
      document.removeEventListener("touchmove", preventNativeScroll);
    };
  }, [selectedPic, globalScrollLock]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < pics.length) {
          setVisibleCount((prev) => prev + 15);
        }
      },
      { threshold: 1.0 }
    );
    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [pics, visibleCount]);

  const bringToFront = (id: string) => {
    setZIndexes((prev) => {
      const maxZ = Math.max(...Object.values(prev), 0);
      return { ...prev, [id]: maxZ + 1 };
    });
  };

  return (
    <div className="min-h-screen bg-[#f0f0f0] bg-[url('/black-linen.png')] py-12 px-4">
      <div className="max-w-6xl mx-auto flex flex-wrap justify-center gap-6 md:gap-12">
        {pics.slice(0, visibleCount).map((pic) => (
          <PhotoCard
            key={pic.id}
            pic={pic}
            zIndex={zIndexes[pic.id] || 1}
            bringToFront={bringToFront}
            isMobile={isMobile}
            onSelect={setSelectedPic}
            setGlobalScrollLock={setGlobalScrollLock}
          />
        ))}
      </div>

      <div ref={observerTarget} className="h-10 w-full flex justify-center items-center mt-10">
        {visibleCount < pics.length && <p className="text-gray-400 text-sm tracking-widest">載入中...</p>}
      </div>

      <AnimatePresence>
        {selectedPic && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 md:p-12 cursor-pointer"
            onClick={() => setSelectedPic(null)} 
          >
            <button 
              className="absolute top-6 right-6 md:top-10 md:right-10 text-white/70 hover:text-white transition-colors p-2 z-50"
              onClick={() => setSelectedPic(null)}
            >
              <svg className="w-8 h-8 md:w-10 md:h-10" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>

            {selectedPic.isVideo ? (
              <video 
                src={selectedPic.src} 
                controls 
                autoPlay 
                playsInline 
                className="max-w-full max-h-[85vh] rounded-md shadow-2xl outline-none cursor-default" 
                onClick={(e) => e.stopPropagation()} 
              />
            ) : (
              <img
                src={selectedPic.src}
                alt="Full view"
                className="max-w-full max-h-[85vh] object-contain drop-shadow-2xl cursor-default"
                onClick={(e) => e.stopPropagation()} 
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}