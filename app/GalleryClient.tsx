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
// 獨立的照片卡片元件 (解決手機版拖曳與狀態管理的關鍵)
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
  const [isDragging, setIsDragging] = useState(false);
  
  // 用來精準控制何時啟動拖曳
  const dragControls = useDragControls();
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const hasDraggedRef = useRef(false); // 防止拖曳結束時誤觸點擊放大

  const handlePointerDown = (e: React.PointerEvent) => {
    bringToFront(pic.id);
    if (isMobile) {
      // 啟動長按計時器 (250ms)
      timerRef.current = setTimeout(() => {
        setIsDragging(true);
        setGlobalScrollLock(true); // 鎖定背景滾動
        try {
          // 手動將原本的觸控事件交給 Framer Motion 啟動拖曳
          dragControls.start(e, { snapToCursor: false });
          // 若手機支援，給予微小的震動回饋，提升手感
          if (typeof window !== "undefined" && window.navigator && window.navigator.vibrate) {
            window.navigator.vibrate(50);
          }
        } catch (err) {
          console.error("Drag start failed", err);
        }
      }, 250); 
    }
  };

  const handlePointerMove = () => {
    // 如果在 400ms 內手指移動了 (代表用戶想滾動網頁)，就取消長按判定
    if (isMobile && !isDragging && timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handlePointerUp = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleDragStart = () => {
    hasDraggedRef.current = true;
  };

  const handleDragEnd = () => {
    if (isMobile) {
      setIsDragging(false);
      setGlobalScrollLock(false); // 解除背景滾動鎖定
    }
    // 放開時隨機改變旋轉角度
    setRotate(Math.floor(Math.random() * 20) - 10);
    
    // 延遲重置點擊防護，避免放開瞬間觸發 Lightbox
    setTimeout(() => {
      hasDraggedRef.current = false;
    }, 100);
  };

  return (
    <motion.div
      drag
      // 電腦版使用預設拖曳，手機版關閉預設，改用 dragControls 手動觸發
      dragListener={!isMobile} 
      dragControls={dragControls}
      dragConstraints={{ top: 0, left: 0, right: 0, bottom: 0 }}
      dragElastic={0.4}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onContextMenu={(e) => {
        // 防止手機長按時跳出瀏覽器的「儲存圖片」選單干擾拖曳
        if (isMobile) e.preventDefault();
      }}
      whileDrag={{ scale: 1.05, zIndex: 1000 }}
      animate={{ rotate: rotate, scale: isDragging ? 1.05 : 1 }}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      style={{ zIndex: isDragging ? 1000 : zIndex }}
      className={`bg-white p-2 pb-4 md:p-4 md:pb-6 shadow-lg select-none
        ${!isMobile ? "cursor-grab active:cursor-grabbing" : ""}
        ${isDragging ? "cursor-grabbing shadow-2xl ring-4 ring-black/10" : ""}
      `}
    >
      {/* 縮圖區 */}
      <div
        className="relative overflow-hidden bg-gray-100 w-[140px] h-[140px] md:w-[250px] md:h-[250px]"
        onClick={() => {
          // 確保不是在拖曳結束的瞬間才觸發放大
          if (!hasDraggedRef.current && !isDragging) onSelect(pic);
        }}
      >
        {pic.isVideo ? (
          <>
            {/* 【修復 iOS Bug】：加上 #t=0.001 強迫 Safari 渲染第一幀縮圖，並加入 playsInline muted */}
            <video 
              src={`${pic.src}#t=0.001`} 
              preload="metadata" 
              playsInline 
              muted 
              className="object-cover w-full h-full pointer-events-none" 
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

      {/* 文字區塊 - 修改重點：設定固定高度 (h-[40px] / md:h-[48px]) 保證畫框大小一致 */}
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
  
  // 全域狀態
  const [isMobile, setIsMobile] = useState(false);
  const [globalScrollLock, setGlobalScrollLock] = useState(false);
  
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

    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, [initialPictures]);

  // 統一管理背景滾動鎖定 (包含 Lightbox 放大與手機長按拖曳時)
  useEffect(() => {
    // 解決手機端「滑動脫手」的關鍵：強制阻擋原生 touchmove
    const preventNativeScroll = (e: TouchEvent) => {
      e.preventDefault();
    };

    if (selectedPic || globalScrollLock) {
      document.body.style.overflow = "hidden";
      // { passive: false } 是必須的，這樣瀏覽器才會允許我們使用 preventDefault() 來取消滾動
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

      {/* Lightbox 放大檢視 */}
      <AnimatePresence>
        {selectedPic && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            // 在背景加上 cursor-pointer，提示用戶這裡可以點擊
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 md:p-12 cursor-pointer"
            onClick={() => setSelectedPic(null)} // 點擊背景任何地方即可關閉
          >
            <button 
              className="absolute top-6 right-6 md:top-10 md:right-10 text-white/70 hover:text-white transition-colors p-2 z-50"
              onClick={() => setSelectedPic(null)}
            >
              <svg className="w-8 h-8 md:w-10 md:h-10" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>

            {/* 移除原本的 w-full 容器，讓圖片/影片自由決定寬度。
                並將 e.stopPropagation() 綁定在媒體元件上，這樣點擊影像本體才不會關閉視窗 */}
            {selectedPic.isVideo ? (
              <video 
                src={selectedPic.src} 
                controls 
                autoPlay 
                playsInline // 加上 playsInline 讓手機端不會強制全螢幕播放
                className="max-w-full max-h-[85vh] rounded-md shadow-2xl outline-none cursor-default" 
                onClick={(e) => e.stopPropagation()} 
              />
            ) : (
              // 放大檢視原本就不需要 Next.js 的 Image 優化，直接用 <img> 標籤最簡單乾淨，也能完美貼合大小
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