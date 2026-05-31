/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@legion/gasless"],
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      os: false,
      path: false,
      crypto: false,
    };
    return config;
  },
};

export default nextConfig;
