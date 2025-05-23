/** @type {import('next').NextConfig} */
const nextConfig = {
    webpack: (config, { isServer }) => {
      // Handle Node.js modules in browser context
      if (!isServer) {
        config.resolve.fallback = {
          ...config.resolve.fallback,
          fs: false,
          path: false,
          crypto: false,
          stream: false,
          assert: false,
          http: false,
          https: false,
          os: false,
          url: false,
          zlib: false,
          // Handle node: protocol imports
          'node:fs': false,
          'node:path': false,
          'node:crypto': false,
          'node:stream': false,
          'node:http': false,
          'node:https': false,
          'node:os': false,
          'node:url': false,
          'node:zlib': false,
          'node:buffer': false,
          'node:process': false,
          'node:module': false,
        }
        
        // Add externals to prevent Node.js modules from being bundled
        config.externals = [...(config.externals || []), 'fs', 'path', 'crypto']
      }
      
      return config;
    },
    // Disable static page generation for routes using face-api.js
    output: 'standalone',
    // Experimental features for better compatibility
    experimental: {
      esmExternals: 'loose',
    },
  }
  
  module.exports = nextConfig