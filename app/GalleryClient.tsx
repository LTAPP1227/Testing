"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import Image from "next/image"; // 引入 Next.js 核心優化組件

interface Picture {
  src: string;
  title: string;
  date: string;
}

interface DisplayPicture extends Picture {
  rotate: number;
  id: string; // 增加唯一 ID
}

export default function GalleryClient({ initialPictures }: { initialPictures: Picture[] }) {
  const [pics, setPics] = useState<DisplayPicture[]>([]);
  const [visibleCount, setVisibleCount] = useState(15); // 控制顯示數量
  const [zIndexes, setZIndexes] = useState<Record<string, number>>({});
  const [selectedPic, setSelectedPic] = useState<DisplayPicture | null>(null);
  
  const observerTarget = useRef(null); // 用於偵測捲動到底部的指標

  // 初始化資料
  useEffect(() => {
    const processed = initialPictures.map((p, i) => ({
      ...p,
      id: `pic-${i}`,
      rotate: Math.floor(Math.random() * 10) - 5,
    }));
    const shuffled = processed.sort(() => 0.5 - Math.random());
    setPics(shuffled);

    // 初始化 zIndex 對照表
    const initialZ: Record<string, number> = {};
    shuffled.forEach((p, i) => { initialZ[p.id] = i; });
    setZIndexes(initialZ);
  }, [initialPictures]);

  // 無限捲動邏輯 (Intersection Observer)
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < pics.length) {
          setVisibleCount((prev) => prev + 15); // 每次增加 15 張
        }
      },
      { threshold: 1.0 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [pics, visibleCount]);

  const bringToFront = (id: string) => {
    setZIndexes((prev) => {
      const maxZ = Math.max(...Object.values(prev), 0);
      return { ...prev, [id]: maxZ + 1 };
    });
  };

  // 拖拽結束後改變角度
  const handleDragEnd = (id: string) => {
    setPics((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, rotate: Math.floor(Math.random() * 20) - 10 } : p
      )
    );
  };

  return (
    <div className="min-h-screen bg-[#f0f0f0] bg-[url('https://www.transparenttextures.com/patterns/black-linen.png')] py-12 px-4">
      <div className="max-w-6xl mx-auto flex flex-wrap justify-center gap-6 md:gap-12">
        {pics.slice(0, visibleCount).map((pic) => (
          <motion.div
            key={pic.id}
            drag
            dragConstraints={{ top: 0, left: 0, right: 0, bottom: 0 }}
            dragElastic={0.4}
            onDragStart={() => bringToFront(pic.id)}
            onDragEnd={() => handleDragEnd(pic.id)}
            onClick={() => setSelectedPic(pic)}
            whileDrag={{ scale: 1.1, rotate: 0, zIndex: 1000 }}
            animate={{ rotate: pic.rotate }} // 讓角度變化有平滑動畫
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }} // 當照片進入視窗才顯現
            viewport={{ once: true }}
            style={{ zIndex: zIndexes[pic.id] || 1 }}
            className="bg-white p-2 pb-6 md:p-4 md:pb-10 shadow-lg cursor-grab active:cursor-grabbing select-none"
          >
            <div className="relative overflow-hidden bg-gray-100 w-[140px] h-[140px] md:w-[250px] md:h-[250px]">
              {/* 使用 Next.js Image 進行優化 */}
              <Image
                src={pic.src}
                alt={pic.title || pic.date}
                fill
                sizes="(max-width: 768px) 140px, 250px"
                className="object-cover pointer-events-none"
                priority={false} // 讓它 lazy load
              />
            </div>
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

      {/* 無限捲動的偵測點 */}
      <div ref={observerTarget} className="h-10 w-full flex justify-center items-center mt-10">
        {visibleCount < pics.length && <p className="text-gray-400 text-sm">載入中...</p>}
      </div>

      {/* Lightbox 放大檢視 */}
      <AnimatePresence>
        {selectedPic && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedPic(null)}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <div className="relative w-full h-full flex items-center justify-center">
               <Image
                  src={selectedPic.src}
                  alt="Full view"
                  fill
                  className="object-contain"
                  unoptimized={true} // 放大檢視時顯示原圖品質
               />
               <button className="absolute top-5 right-5 text-white text-3xl">&times;</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}