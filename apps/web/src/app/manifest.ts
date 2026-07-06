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
    background_color: '#E8DCC4',
    theme_color: '#20242B',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
    ],
  }
}
