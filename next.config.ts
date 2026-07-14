import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Permite builds sem variáveis de ambiente em produção (Vercel define via painel)
  env: {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  },
};

export default nextConfig;
