import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["10.0.0.160"],
  // Confirmation URLs contain token hashes. Do not write incoming URLs to dev logs.
  logging: { incomingRequests: false },
  reactStrictMode: true,
  turbopack: { root: process.cwd() },
};

export default nextConfig;
