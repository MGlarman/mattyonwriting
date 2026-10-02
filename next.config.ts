import type { NextConfig } from "next";
const config: NextConfig = {
  serverExternalPackages: ["argon2", "pg"],
  images: { remotePatterns: [{ protocol: "https", hostname: "covers.openlibrary.org" }] },
};
export default config;
