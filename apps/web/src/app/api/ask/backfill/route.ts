// Re-embed every expense in the current user's groups.
// POST  ->  { embedded: <count>, skipped: <count>, errors: <count> }
import { NextResponse } from 'next/server'
import { p } from '@/lib/prisma'
import { embedExpense } from '@/lib/rag/embed'
import { AuthError, requireUser } from '@/lib/authz'

export const runtime = 'nodejs'

export async function POST() {
  let userId: string
  try {
    userId = await requireUser()
  } catch (e) {
    const err = e as AuthError
    return NextResponse.json({ error: err.message }, { status: err.status ?? 401 })
  }

  const expenses = await p.expense.findMany({
    where: { group: { ownerId: userId } },
    select: { id: true },
  })

  let embedded = 0, errors = 0
  for (const e of expenses) {
    const ok = await embedExpense(e.id)
    if (ok) embedded++; else errors++
  }
  return NextResponse.json({ embedded, skipped: 0, errors, total: expenses.length })
}
