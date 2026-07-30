import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@signal-fracture/shared"],
};

export default nextConfig;
