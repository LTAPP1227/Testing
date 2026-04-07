// app/page.tsx
import fs from "fs";
import path from "path";
import GalleryClient from "./GalleryClient";

export default function Page() {
  const imagesDirectory = path.join(process.cwd(), "public/Images");

  let fileNames: string[] = [];
  try {
    fileNames = fs.readdirSync(imagesDirectory);
  } catch (error) {
    console.error("找不到 public/Images 資料夾！");
  }

  // 優化：支援圖片與影片格式，並預先判斷檔案類型
  const mediaFiles = fileNames
    .filter((file) => /\.(jpg|jpeg|png|gif|webp|mp4|mov|webm)$/i.test(file))
    .map((file) => {
      const nameWithoutExt = file.replace(/\.[^/.]+$/, "");
      const parts = nameWithoutExt.split("_");
      const isVideo = /\.(mp4|mov|webm)$/i.test(file);

      return {
        src: `/Images/${file}`,
        date: parts[0] || "",
        title: parts.length > 1 ? parts[1] : "",
        isVideo, // 傳遞給 Client 判斷
      };
    });

  return <GalleryClient initialPictures={mediaFiles} />;
}