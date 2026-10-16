/** @type {import('next').NextConfig} */
// Default: dynamic app (Node host / Vercel) with the optional LLM API route.
// With STATIC_EXPORT=1: a fully static site for shared hosting (e.g. Hostinger),
// served under BASE_PATH (default /grcaudit). The analysis runs client-side.
const isExport = process.env.STATIC_EXPORT === "1";
const basePath = process.env.BASE_PATH ?? "/grcaudit";

const nextConfig = {
  reactStrictMode: true,
  // Lets plain <img> tags reference files in /public under the same sub-path.
  env: { NEXT_PUBLIC_BASE_PATH: isExport ? basePath : "" },
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
