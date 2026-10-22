/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: "4mb" },
    // Voltar a uma tela visitada há menos de 30 s é instantâneo (o cache é limpo a cada gravação).
    staleTimes: { dynamic: 30, static: 180 },
  },
};

export default nextConfig;
