/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  // Ensure knowledge-base markdown files are included in the serverless
  // function bundle on Vercel — the chat API reads them at runtime via fs.
  outputFileTracingIncludes: {
    "/api/chat": ["./knowledge-base/**/*.md"],
  },
};

export default nextConfig;
