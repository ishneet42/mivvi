'use client'

// Mivvi: floating Scan button. Always visible on group pages. Snap is the
// product's center-of-gravity action — the FAB makes that obvious from
// every tab (Expenses, Balances, Activity, etc.) without making the user
// hunt for the Scan tab in the overflow scroller.
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Camera } from 'lucide-react'

export function ScanFab({ groupId }: { groupId: string }) {
  const pathname = usePathname()
  // Hide on the scan/snap pages themselves — would be redundant noise.
  if (pathname?.includes('/scan') || pathname?.includes('/snap')) return null

  return (
    <Link
      href={`/groups/${groupId}/scan`}
      aria-label="Scan a receipt"
      className="
        fixed bottom-6 right-6 z-40
        h-14 px-5 rounded-full
        bg-redpen text-white
        flex items-center gap-2
        shadow-ticket
        hover:translate-y-[-1px] active:translate-y-0.5 active:shadow-ticket-press
        transition-[transform,box-shadow]
        font-mono font-bold text-[13px] tracking-[0.05em] uppercase
      "
    >
      <Camera className="w-5 h-5" />
      Scan a receipt
    </Link>
  )
}
