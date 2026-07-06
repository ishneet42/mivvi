'use client'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useTranslations } from 'next-intl'
import { usePathname, useRouter } from 'next/navigation'

type Props = {
  groupId: string
}

// Receipt-diner segmented control: dark ink pill on a warm paper track.
const tabTriggerClassName =
  'rounded-lg px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.06em] text-[#8A8470] data-[state=active]:bg-ink data-[state=active]:text-[#F7F1E3] data-[state=active]:shadow-none'

export function GroupTabs({ groupId }: Props) {
  const t = useTranslations()
  const pathname = usePathname()
  const value =
    pathname.replace(/\/groups\/[^\/]+\/([^/]+).*/, '$1') || 'expenses'
  const router = useRouter()

  return (
    <Tabs
      value={value}
      className="overflow-x-auto"
      onValueChange={(value) => {
        router.push(`/groups/${groupId}/${value}`)
      }}
    >
      <TabsList className="h-auto rounded-[11px] bg-[#EFE6D2] p-1 text-[#8A8470]">
        <TabsTrigger value="expenses" className={tabTriggerClassName}>
          {t('Expenses.title')}
        </TabsTrigger>
        <TabsTrigger value="scan" className={tabTriggerClassName}>
          Scan
        </TabsTrigger>
        <TabsTrigger value="snap" className={tabTriggerClassName}>
          Snap
        </TabsTrigger>
        <TabsTrigger value="members" className={tabTriggerClassName}>
          Members
        </TabsTrigger>
        <TabsTrigger value="balances" className={tabTriggerClassName}>
          {t('Balances.title')}
        </TabsTrigger>
        <TabsTrigger value="edit" className={tabTriggerClassName}>
          {t('Settings.title')}
        </TabsTrigger>
      </TabsList>
    </Tabs>
  )
}
