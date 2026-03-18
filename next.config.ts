import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevent Airtable SDK from being bundled client-side — server-only access
  serverExternalPackages: ["airtable"],
};

export default nextConfig;
