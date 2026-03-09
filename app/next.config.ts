import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "**",
      },
    ],
  },
  async rewrites() {
    const checkinServiceUrl = process.env.CHECKIN_SERVICE_URL || "http://localhost:8090";
    return [
      // Proxy /weekly-check-in/* to EPM check-in FastAPI service
      {
        source: "/weekly-check-in/:path*",
        destination: `${checkinServiceUrl}/checkin/:path*`,
      },
      // Proxy /coach/:path* to EPM coach dashboard
      {
        source: "/coach/:path*",
        destination: `${checkinServiceUrl}/coach/:path*`,
      },
      // Proxy /checkin-admin to EPM admin hub
      {
        source: "/checkin-admin",
        destination: `${checkinServiceUrl}/admin`,
      },
    ];
  },
};

export default nextConfig;
