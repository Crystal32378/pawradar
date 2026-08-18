import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'PawRadar 寵物散步雷達',
    short_name: 'PawRadar',
    description: '把寵物散步放進粉絲的日曆，異動時再通知。',
    start_url: '/',
    display: 'standalone',
    background_color: '#fff8ef',
    theme_color: '#8f3f2f',
    icons: [{ src: '/logo.svg', sizes: 'any', type: 'image/svg+xml' }],
  };
}
