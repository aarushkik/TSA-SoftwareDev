import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root — otherwise a package-lock.json in a parent
  // directory (outside this git repo) makes Turbopack guess wrong.
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
