import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Hive Settings uploads (logo/promotional banners/gallery photos) and the movie
      // poster/backdrop/trailer-video uploads go straight through a Server Action as
      // multipart form data — well above the 1MB default. Trailer clips are the largest
      // single asset, so this leaves headroom above their own validated size cap.
      bodySizeLimit: "50mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
      {
        protocol: "https",
        hostname: "image.tmdb.org",
      },
    ],
  },
};

export default nextConfig;
