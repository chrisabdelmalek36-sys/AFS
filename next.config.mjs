/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // pg is a server-only dependency; keep it out of the client bundle.
  experimental: {
    serverComponentsExternalPackages: ["pg"],
    // The runtime bootstrap (src/lib/bootstrap.ts) reads these SQL files on the
    // first request, so they must be traced into the serverless function bundle.
    outputFileTracingIncludes: {
      "/**": ["./db/migrations/**"],
    },
  },
};
export default nextConfig;
