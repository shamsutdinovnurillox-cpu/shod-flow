import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Server Action'lar uchun standart chegara 1MB. Fayl yuklash oqimi
    // (hujjatlar, sug'urta sertifikatlari) 10MB gacha ruxsat berishini
    // va'da qiladi — chegara ko'tarilmasa, undan kattasi tushunarsiz
    // xato bilan uzilardi. Sarlavhalar uchun ozgina zaxira qoldiramiz.
    serverActions: { bodySizeLimit: "12mb" },
  },
};

export default nextConfig;
