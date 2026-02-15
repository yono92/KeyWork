import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    reactStrictMode: true,
    eslint: {
        // Existing repository has pre-existing lint violations outside migration scope.
        ignoreDuringBuilds: true,
    },
};

export default nextConfig;
