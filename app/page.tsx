// app/page.tsx
import { v2 as cloudinary } from 'cloudinary';
import GalleryClient from "./GalleryClient";

// 載入 Cloudinary 設定 (會自動讀取你設定好的環境變數)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// 告訴 Next.js 不要快取這個頁面，確保每次都能抓到最新的照片
export const revalidate = 0;

export default async function Page() {
  let mediaFiles: any[] = [];

  try {
    // 搜尋你命名為 Gallery 的資料夾，最多抓取 500 張
    const results = await cloudinary.search
      .expression('folder:Gallery')
      .sort_by('public_id', 'desc')
      .max_results(500)
      .execute();

    mediaFiles = results.resources.map((resource: any) => {
      // resource.public_id 的格式會是 "Gallery/20240401_標題"
      // 我們把 "Gallery/" 刪掉，留下檔名進行解析
      const fileName = resource.public_id.replace('Gallery/', '');
      const parts = fileName.split("_");
      const isVideo = resource.resource_type === 'video';

      return {
        src: resource.secure_url, // Cloudinary 生成的圖片/影片直連網址
        date: parts[0] || "",
        title: parts.length > 1 ? parts[1] : "",
        isVideo,
      };
    });
  } catch (error) {
    console.error("Cloudinary 抓取失敗:", error);
  }

  return <GalleryClient initialPictures={mediaFiles} />;
}