// Mivvi: full-screen receipt scanner (Dribbble-inspired UI).
import { notFound } from 'next/navigation'
import { p } from '@/lib/prisma'
import { ScanClient } from './scan-client'

export default async function ScanPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params
  const group = await p.group.findUnique({ where: { id: groupId } })
  if (!group) notFound()
  return <ScanClient groupId={group.id} groupName={group.name} currency={group.currency} />
}
