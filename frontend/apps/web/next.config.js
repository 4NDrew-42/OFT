/** @type {import('next').NextConfig} */
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig = {
  experimental: {
    optimizePackageImports: ['framer-motion', 'gsap', 'lucide-react'],
    serverComponentsExternalPackages: ['sharp', 'onnxruntime-node'],
  },

  // Image optimization for artwork
  images: {
    domains: [
      'localhost',
      '192.168.50.79',
      'example.com',
      'ai-marketplace.vercel.app'
    ],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [320, 420, 768, 1024, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 7, // 7 days
  },

  // Headers for security and performance
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          }
        ]
      },
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.NODE_ENV === 'development' ? '*' : 'https://ai-marketplace.vercel.app'
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS'
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, X-Requested-With'
          }
        ]
      }
    ];
  },

  // Environment variables for API connections
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3002',
    NEXT_PUBLIC_ORION_API_URL: process.env.NEXT_PUBLIC_ORION_API_URL || 'http://192.168.50.79:8081',
    NEXT_PUBLIC_VERCEL_ENV: process.env.VERCEL_ENV || 'development',
  },

  // Webpack configuration for motion libraries
  webpack: (config, { isServer }) => {
    // Optimize for client-side motion libraries
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }

    // Optimize GSAP loading
    config.module.rules.push({
      test: /gsap/,
      use: {
        loader: 'babel-loader',
        options: {
          presets: ['@babel/preset-env'],
        },
      },
    });

    // Add support for WebAssembly (for future AI model loading)
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };

    return config;
  },

  // Compiler options for better performance
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn']
    } : false,
  },

  // Static export configuration (for Vercel deployment)
  output: 'standalone',

  // Redirects for clean URLs
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
      {
        source: '/feed',
        destination: '/dashboard/feed',
        permanent: true,
      }
    ];
  },

  // Rewrites for API proxying during development
  async rewrites() {
    if (process.env.NODE_ENV === 'development') {
      return [
        {
          source: '/api/backend/:path*',
          destination: 'http://localhost:3001/api/:path*'
        },
        {
          source: '/api/ai/:path*',
          destination: 'http://localhost:3003/api/:path*'
        }
      ];
    }
    return [];
  },

  // Transpile workspace packages
  transpilePackages: [
    '@ai-marketplace/ui',
    '@ai-marketplace/api-client',
    '@ai-marketplace/ai-features',
    '@ai-marketplace/motion'
  ],

  // Power pack features
  poweredByHeader: false,
  reactStrictMode: true,
  swcMinify: true,
};

module.exports = withBundleAnalyzer(nextConfig);