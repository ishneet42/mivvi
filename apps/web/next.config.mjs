import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin()

/**
 * Undefined entries are not supported. Push optional patterns to this array only if defined.
 * @type {import('next/dist/shared/lib/image-config').RemotePattern}
 */
const remotePatterns = []

// S3 Storage
if (process.env.S3_UPLOAD_ENDPOINT) {
  const url = new URL(process.env.S3_UPLOAD_ENDPOINT)
  remotePatterns.push({ hostname: url.hostname })
} else if (process.env.S3_UPLOAD_BUCKET && process.env.S3_UPLOAD_REGION) {
  remotePatterns.push({
    hostname: `${process.env.S3_UPLOAD_BUCKET}.s3.${process.env.S3_UPLOAD_REGION}.amazonaws.com`,
  })
}

// Allow Clerk-hosted user avatars (used by the header user menu and members list).
remotePatterns.push({ hostname: 'img.clerk.com' })
remotePatterns.push({ hostname: 'images.clerk.dev' })

// Server Actions need to know which origins are legitimate. In dev we want
// localhost; in prod Vercel provides VERCEL_URL. MIVVI_PUBLIC_ORIGIN can be
// set manually for custom domains.
const allowedOrigins = ['localhost:3000']
if (process.env.VERCEL_URL) allowedOrigins.push(process.env.VERCEL_URL)
if (process.env.MIVVI_PUBLIC_ORIGIN) {
  try {
    allowedOrigins.push(new URL(process.env.MIVVI_PUBLIC_ORIGIN).host)
  } catch { /* ignore malformed */ }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { remotePatterns },
  experimental: {
    serverActions: { allowedOrigins },
  },
}

export default withNextIntl(nextConfig)
