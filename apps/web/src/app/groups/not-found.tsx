import { Button } from '@/components/ui/button'
import { useTranslations } from 'next-intl'
import Link from 'next/link'

export default function NotFound() {
  const t = useTranslations('Groups.NotFound')
  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 py-24 text-center">
      <div
        className="font-display text-2xl text-redpen border-[3px] border-redpen rounded-md px-4 py-1.5 rotate-[-13deg] opacity-80 mb-8"
        aria-hidden="true"
      >
        404
      </div>
      <h1 className="font-display text-3xl text-ink mb-3">{t('text')}</h1>
      <Button asChild variant="secondary">
        <Link href="/groups">{t('link')}</Link>
      </Button>
    </main>
  )
}
