"use client";

import { motion, AnimatePresence } from "framer-motion";
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

export default function GalleryClient({ initialPictures }: { initialPictures: Media[] }) {
  const [pics, setPics] = useState<DisplayMedia[]>([]);
  const [visibleCount, setVisibleCount] = useState(15);
  const [zIndexes, setZIndexes] = useState<Record<string, number>>({});
  const [selectedPic, setSelectedPic] = useState<DisplayMedia | null>(null);
  
  // 手機版互動相關狀態
  const [isMobile, setIsMobile] = useState(false);
  const [dragEnabledId, setDragEnabledId] = useState<string | null>(null);
  const pressTimer = useRef<NodeJS.Timeout | null>(null);
  
  const observerTarget = useRef(null);

  // 初始化資料與偵測裝置
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

    // 偵測是否為手機螢幕
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, [initialPictures]);

  // 鎖定背景滾動 (要求 1)
  useEffect(() => {
    if (selectedPic) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => { document.body.style.overflow = "auto"; };
  }, [selectedPic]);

  // 無限捲動邏輯
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

  const handleDragEnd = (id: string) => {
    setPics((prev) =>
      prev.map((p) => p.id === id ? { ...p, rotate: Math.floor(Math.random() * 20) - 10 } : p)
    );
  };

  // 手機版長按邏輯 (要求 2)
  const handlePointerDown = (id: string) => {
    bringToFront(id);
    if (isMobile) {
      pressTimer.current = setTimeout(() => {
        setDragEnabledId(id); // 按住 500ms 後解鎖拖曳
      }, 500);
    }
  };

  const handlePointerUpOrCancel = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    if (isMobile) setDragEnabledId(null); // 放開後鎖回拖曳
  };

  return (
    <div className="min-h-screen bg-[#f0f0f0] bg-[url('/black-linen.png')] py-12 px-4">
      <div className="max-w-6xl mx-auto flex flex-wrap justify-center gap-6 md:gap-12">
        {pics.slice(0, visibleCount).map((pic) => (
          <motion.div
            key={pic.id}
            // 只有電腦版，或是手機版且被長按解鎖時，才允許拖曳
            drag={!isMobile || dragEnabledId === pic.id} 
            dragConstraints={{ top: 0, left: 0, right: 0, bottom: 0 }}
            dragElastic={0.4}
            onPointerDown={() => handlePointerDown(pic.id)}
            onPointerUp={handlePointerUpOrCancel}
            onPointerCancel={handlePointerUpOrCancel}
            onDragEnd={() => handleDragEnd(pic.id)}
            whileDrag={{ scale: 1.1, zIndex: 1000 }}
            animate={{ rotate: pic.rotate }}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            style={{ zIndex: zIndexes[pic.id] || 1 }}
            className={`bg-white p-2 pb-6 md:p-4 md:pb-10 shadow-lg select-none 
              ${(!isMobile || dragEnabledId === pic.id) ? 'cursor-grab active:cursor-grabbing' : ''}`}
          >
            {/* 縮圖區 */}
            <div 
              className="relative overflow-hidden bg-gray-100 w-[140px] h-[140px] md:w-[250px] md:h-[250px]"
              onClick={() => {
                // 如果不是在拖曳狀態才觸發點擊放大
                if (!isMobile || dragEnabledId !== pic.id) setSelectedPic(pic);
              }}
            >
              {pic.isVideo ? (
                <>
                  <video src={pic.src} preload="metadata" className="object-cover w-full h-full pointer-events-none" />
                  {/* 影片播放提示 Icon (要求 5) */}
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
            
            {/* 文字區塊 */}
            <div className="mt-3 text-center">
              <h1 className="text-[10px] md:text-sm font-bold text-gray-700 truncate px-1 max-w-[140px] md:max-w-[250px]">
                {pic.title || " "}
              </h1>
              <p className="text-[10px] md:text-xs text-gray-400 mt-1 font-mono">
                {pic.date}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      <div ref={observerTarget} className="h-10 w-full flex justify-center items-center mt-10">
        {visibleCount < pics.length && <p className="text-gray-400 text-sm tracking-widest">載入中...</p>}
      </div>

      {/* Lightbox 放大檢視 (要求 4 & 5) */}
      <AnimatePresence>
        {selectedPic && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 md:p-12"
            onClick={() => setSelectedPic(null)}
          >
            {/* 獨立的關閉按鈕 */}
            <button 
              className="absolute top-6 right-6 md:top-10 md:right-10 text-white/70 hover:text-white transition-colors p-2 z-50"
              onClick={() => setSelectedPic(null)}
            >
              <svg className="w-8 h-8 md:w-10 md:h-10" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>

            {/* 內容容器：限制最大長寬 */}
            <div 
              className="relative w-full max-w-5xl max-h-[85vh] flex items-center justify-center"
              onClick={(e) => e.stopPropagation()} // 防止點到圖片/影片本體關閉視窗
            >
              {selectedPic.isVideo ? (
                <video 
                  src={selectedPic.src} 
                  controls 
                  autoPlay 
                  className="max-w-full max-h-[85vh] rounded-md shadow-2xl outline-none" 
                />
              ) : (
                <div className="relative w-full h-[85vh]">
                  <Image
                    src={selectedPic.src}
                    alt="Full view"
                    fill
                    className="object-contain drop-shadow-2xl"
                    unoptimized={true}
                  />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}