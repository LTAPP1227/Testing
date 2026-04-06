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

  // 只過濾圖片，不做隨機處理
  const pictures = fileNames
    .filter((file) => /\.(jpg|jpeg|png|gif|webp)$/i.test(file))
    .map((file) => {
      const nameWithoutExt = file.replace(/\.[^/.]+$/, "");
      const parts = nameWithoutExt.split("_");
      return {
        src: `/Images/${file}`,
        date: parts[0] || "",
        title: parts.length > 1 ? parts[1] : "",
      };
    });

  // 把穩定的圖片清單傳給 Client
  return <GalleryClient initialPictures={pictures} />;
}