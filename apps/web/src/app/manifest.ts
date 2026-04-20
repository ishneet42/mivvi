import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Mivvi',
    short_name: 'Mivvi',
    description:
      'AI-native bill splitter. Snap a receipt, talk to it, and Mivvi handles the math.',
    start_url: '/groups',
    id: '/groups',
    display: 'standalone',
    background_color: '#F4ECDB',
    theme_color: '#1A1410',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
    ],
  }
}
