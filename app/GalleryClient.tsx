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
// 獨立的照片卡片元件
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
  const [isReadyToDrag, setIsReadyToDrag] = useState(false); // 新增：是否已經長按完成準備拖曳
  const [isDragging, setIsDragging] = useState(false);
  
  const dragControls = useDragControls();
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const hasMovedRef = useRef(false); // 記錄用戶是否在長按期間偷滑動了
  const hasDraggedRef = useRef(false); 
  const videoRef = useRef<HTMLVideoElement>(null); // 用於修復 iOS 影片縮圖

  // 【修復 iOS 影片縮圖 Bug】
  useEffect(() => {
    if (pic.isVideo && videoRef.current) {
      // 強制觸發 iOS Safari 載入第一幀畫面
      videoRef.current.currentTime = 0.001;
    }
  }, [pic.isVideo]);

  const handlePointerDown = (e: React.PointerEvent) => {
    bringToFront(pic.id);
    if (isMobile) {
      hasMovedRef.current = false;
      setIsReadyToDrag(false);
      
      // 啟動長按計時器 (設定 300ms 體驗最佳)
      timerRef.current = setTimeout(() => {
        // 如果手指沒偷動，才進入拖曳準備狀態
        if (!hasMovedRef.current) {
          setIsReadyToDrag(true);
          setGlobalScrollLock(true); // 鎖定背景滾動
          // 震動回饋
          if (typeof window !== "undefined" && window.navigator && window.navigator.vibrate) {
            window.navigator.vibrate(50);
          }
        }
      }, 300); 
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isMobile) {
      if (isReadyToDrag && !isDragging) {
        // 【修復 Android 拖曳 Bug】：
        // 在「手指真的移動」的這一個瞬間，才把同步事件 (e) 交給 Framer Motion！
        // 這樣能完美繞過 Android Chrome 的安全限制。
        setIsDragging(true);
        hasDraggedRef.current = true;
        try {
          dragControls.start(e, { snapToCursor: false });
        } catch (err) {
          console.error("Drag start failed", err);
        }
      } else if (!isReadyToDrag && !isDragging) {
        // 使用者在計時器結束前就移動手指了（代表他只是想滑網頁）
        hasMovedRef.current = true;
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
      }
    }
  };

  // 統一處理「手指離開螢幕」與「拖曳結束」的復原邏輯
  const endInteraction = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    
    // 【修復卡死 Bug】：只要有進入準備狀態或拖曳狀態，放開時一律解鎖並旋轉
    if (isReadyToDrag || isDragging) {
      setIsReadyToDrag(false);
      setIsDragging(false);
      setGlobalScrollLock(false);
      setRotate(Math.floor(Math.random() * 20) - 10); // 賦予新角度
      
      setTimeout(() => {
        hasDraggedRef.current = false;
      }, 100);
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
      onPointerUp={endInteraction}       // 手指離開時觸發
      onPointerCancel={endInteraction}   // 被系統中斷時觸發
      onDragEnd={endInteraction}         // Framer Motion 拖曳結束時觸發
      onContextMenu={(e) => {
        if (isMobile) e.preventDefault(); // 防止跳出「儲存圖片」選單
      }}
      whileDrag={{ scale: 1.05, zIndex: 1000 }}
      animate={{ rotate: rotate, scale: isDragging ? 1.05 : 1 }}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      // 加入 WebkitUserSelect 徹底防止行動裝置選取干擾
      style={{ 
        zIndex: isDragging ? 1000 : zIndex,
        WebkitTouchCallout: "none",
        WebkitUserSelect: "none",
        userSelect: "none"
      }}
      className={`bg-white p-2 pb-4 md:p-4 md:pb-6 shadow-lg select-none
        ${!isMobile ? "cursor-grab active:cursor-grabbing" : ""}
        ${isDragging ? "cursor-grabbing shadow-2xl ring-4 ring-black/10" : ""}
      `}
    >
      {/* 縮圖區 */}
      <div
        className="relative overflow-hidden bg-gray-100 w-[140px] h-[140px] md:w-[250px] md:h-[250px]"
        onClick={() => {
          if (!hasDraggedRef.current && !isDragging) onSelect(pic);
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

      <div className="mt-3 text-center h-[40px] md:h-[48px] flex flex-col justify-start items-center w-full">
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