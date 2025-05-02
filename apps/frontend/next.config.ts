import type { NextConfig } from "next";
import * as dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/graphql',
        destination: `${process.env.BACKEND_URL}/graphql`,
      },
    ];
  },
};

export default nextConfig;
