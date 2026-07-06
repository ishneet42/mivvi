import { Button } from '@/components/ui/button'
import { Reimbursement } from '@/lib/balances'
import { Currency } from '@/lib/currency'
import { formatCurrency } from '@/lib/utils'
import { Participant } from '@prisma/client'
import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'

type Props = {
  reimbursements: Reimbursement[]
  participants: Participant[]
  currency: Currency
  groupId: string
}

export function ReimbursementList({
  reimbursements,
  participants,
  currency,
  groupId,
}: Props) {
  const locale = useLocale()
  const t = useTranslations('Balances.Reimbursements')
  if (reimbursements.length === 0) {
    return (
      <p className="text-sm font-mono text-label-soft pb-6">
        {t('noImbursements')}
      </p>
    )
  }

  const getParticipant = (id: string) => participants.find((p) => p.id === id)
  return (
    <div className="text-sm">
      {reimbursements.map((reimbursement, index) => (
        <div
          className="py-4 flex justify-between gap-2 border-b-[1.5px] border-dashed border-[#DCD0B4] last:border-b-0"
          key={index}
        >
          <div className="flex flex-col gap-2 items-start sm:flex-row sm:items-baseline sm:gap-4">
            <div className="text-ink">
              {t.rich('owes', {
                from: getParticipant(reimbursement.from)?.name ?? '',
                to: getParticipant(reimbursement.to)?.name ?? '',
                strong: (chunks) => <strong>{chunks}</strong>,
              })}
            </div>
            <Button
              asChild
              className="h-auto rounded-md bg-ink px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-[#F7F1E3] hover:bg-ink-deep"
            >
              <Link
                href={`/groups/${groupId}/expenses/create?reimbursement=yes&from=${reimbursement.from}&to=${reimbursement.to}&amount=${reimbursement.amount}`}
              >
                {t('markAsPaid')}
              </Link>
            </Button>
          </div>
          <div className="font-mono font-bold tabular-nums text-ink">
            {formatCurrency(currency, reimbursement.amount, locale)}
          </div>
        </div>
      ))}
    </div>
  )
}
