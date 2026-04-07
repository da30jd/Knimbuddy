/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Don't fail production builds on lint warnings.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Don't fail production builds on type errors from third-party libs
    // without declaration files (e.g. pdf-parse).
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
