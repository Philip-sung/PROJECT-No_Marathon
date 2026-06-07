/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Vultr 자체호스팅(Docker) 대비: standalone 출력으로 런타임 의존 최소화 (Phase 9에서 사용)
  output: 'standalone',
  poweredByHeader: false,
};

export default nextConfig;
