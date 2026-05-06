import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  // Local file: dependency that ships TypeScript sources directly. Next
  // needs to transpile it through SWC like first-party code.
  transpilePackages: ['@synapse/contracts'],
};

export default nextConfig;
