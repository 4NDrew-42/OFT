/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_ORION_API_URL: process.env.NEXT_PUBLIC_ORION_API_URL,
    NEXT_PUBLIC_ORION_TEMPLATE_ENDPOINT: process.env.NEXT_PUBLIC_ORION_TEMPLATE_ENDPOINT
  }
};

module.exports = nextConfig;
