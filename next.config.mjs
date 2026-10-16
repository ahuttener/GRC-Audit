/** @type {import('next').NextConfig} */
// Default: dynamic app (Node host / Vercel) with the optional LLM API route.
// With STATIC_EXPORT=1: a fully static site for shared hosting (e.g. Hostinger),
// served under BASE_PATH (default /grcaudit). The analysis runs client-side.
const isExport = process.env.STATIC_EXPORT === "1";
const basePath = process.env.BASE_PATH ?? "/grcaudit";

const nextConfig = {
  reactStrictMode: true,
  ...(isExport
    ? {
        output: "export",
        basePath,
        images: { unoptimized: true },
        trailingSlash: true,
      }
    : {}),
};

export default nextConfig;
