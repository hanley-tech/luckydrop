/** @type {import('next').NextConfig} */
const nextConfig = {
  // When deploying under a sub-path (e.g. hanley.world/htai/luckydrop)
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
  async headers() {
    return [
      {
        // Mobile join page — never cache, always fetch fresh
        source: "/join",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate" },
          { key: "Pragma", value: "no-cache" },
        ],
      },
    ];
  },
};

export default nextConfig;
