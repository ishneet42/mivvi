// Dev-only eval scaffolding. Builds an ephemeral group + parsed receipt from
// a scenario payload and returns the ids. Auth via X-Eval-Token header.
import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { p } from '@/lib/prisma'
import { createReceiptFromParsed, type ParsedReceipt } from '@/lib/snapsplit/core'
import { AuthError, EVAL_USER_ID, requireUser } from '@/lib/authz'
import { validatePreferences } from '@/lib/preferences'

export const runtime = 'nodejs'

type SeedBody = {
  group_name: string
  participants: { name: string; preferences?: string[] }[]
  receipt: ParsedReceipt
}

export async function POST(req: NextRequest) {
  let userId: string
  try { userId = await requireUser() } catch (e) {
    const err = e as AuthError
    return NextResponse.json({ error: err.message }, { status: err.status ?? 401 })
  }
  if (userId !== EVAL_USER_ID) {
    return NextResponse.json({ error: 'eval-only endpoint' }, { status: 403 })
  }

  const body = (await req.json()) as SeedBody
  const groupId = `eval_${randomUUID().slice(0, 8)}`
  await p.group.create({
    data: {
      id: groupId,
      name: body.group_name,
      ownerId: EVAL_USER_ID,
      participants: {
        createMany: {
          data: body.participants.map((pp) => ({
            id: randomUUID(),
            name: pp.name,
            preferences:
              pp.preferences && pp.preferences.length > 0
                ? validatePreferences(pp.preferences)
                : undefined,
          })),
        },
      },
      // Multi-user era: OWNER must also be a GroupMember for authz to pass.
      members: {
        create: {
          id: randomUUID(),
          clerkUserId: EVAL_USER_ID,
          role: 'OWNER',
        },
      },
    },
  })
  const people = await p.participant.findMany({ where: { groupId } })
  const { receiptId, items } = await createReceiptFromParsed(groupId, body.receipt)
  return NextResponse.json({
    groupId,
    receiptId,
    participants: people.map((pp) => ({ id: pp.id, name: pp.name })),
    items: items.map((it) => ({ id: it.id, name: it.name, line_total_cents: it.lineTotal })),
  })
}
