/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Property photos are uploaded through server actions
    serverActions: { bodySizeLimit: "25mb" },
  },
  images: { unoptimized: true },
};

export default nextConfig;
