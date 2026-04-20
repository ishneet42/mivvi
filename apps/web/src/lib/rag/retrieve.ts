// Mivvi RAG: retrieval. Top-K by cosine + last-N by recency,
// scoped to expenses in groups owned by the signed-in user.
import { p } from '@/lib/prisma'
import { embed } from './embed'

export type RetrievedExpense = {
  id: string
  title: string
  amount_cents: number
  expenseDate: string
  groupId: string
  groupName: string
  paidByName: string
  paidFor: string[]
  similarity: number | null
}

const TOP_K_SEMANTIC = 20
const LAST_N_RECENT = 30

type Row = {
  id: string
  title: string
  amount: number
  expenseDate: Date
  groupId: string
  group_name: string
  paid_by_name: string
  paid_for: string[]
  distance: number | null
}

export async function retrieveForUser(userId: string, question: string): Promise<RetrievedExpense[]> {
  const vec = await embed(question)
  const lit = `[${vec.join(',')}]`

  // Top-K by cosine distance. pgvector's <=> is cosine-distance (0 = identical).
  const semantic = await p.$queryRawUnsafe<Row[]>(
    `
    SELECT e.id, e.title, e.amount, e."expenseDate",
           e."groupId", g.name as group_name,
           pb.name as paid_by_name,
           COALESCE(array_agg(DISTINCT pf.name) FILTER (WHERE pf.name IS NOT NULL), '{}') AS paid_for,
           (e."embedding" <=> $1::vector) AS distance
    FROM "Expense" e
    JOIN "Group" g           ON g.id = e."groupId"
    JOIN "Participant" pb    ON pb.id = e."paidById"
    LEFT JOIN "ExpensePaidFor" epf ON epf."expenseId" = e.id
    LEFT JOIN "Participant" pf     ON pf.id = epf."participantId"
    WHERE g."ownerId" = $2 AND e."embedding" IS NOT NULL
    GROUP BY e.id, g.name, pb.name
    ORDER BY distance ASC
    LIMIT ${TOP_K_SEMANTIC}
    `,
    lit, userId,
  )

  // Last-N by recency, so we never miss very-recent items regardless of cosine.
  const recent = await p.$queryRawUnsafe<Row[]>(
    `
    SELECT e.id, e.title, e.amount, e."expenseDate",
           e."groupId", g.name as group_name,
           pb.name as paid_by_name,
           COALESCE(array_agg(DISTINCT pf.name) FILTER (WHERE pf.name IS NOT NULL), '{}') AS paid_for,
           NULL::float8 AS distance
    FROM "Expense" e
    JOIN "Group" g ON g.id = e."groupId"
    JOIN "Participant" pb ON pb.id = e."paidById"
    LEFT JOIN "ExpensePaidFor" epf ON epf."expenseId" = e.id
    LEFT JOIN "Participant" pf ON pf.id = epf."participantId"
    WHERE g."ownerId" = $1
    GROUP BY e.id, g.name, pb.name
    ORDER BY e."expenseDate" DESC
    LIMIT ${LAST_N_RECENT}
    `,
    userId,
  )

  // Merge, prefer semantic distance when available.
  const byId = new Map<string, Row>()
  for (const r of semantic) byId.set(r.id, r)
  for (const r of recent) if (!byId.has(r.id)) byId.set(r.id, r)

  return Array.from(byId.values()).map((r) => ({
    id: r.id,
    title: r.title,
    amount_cents: r.amount,
    expenseDate: r.expenseDate.toISOString().slice(0, 10),
    groupId: r.groupId,
    groupName: r.group_name,
    paidByName: r.paid_by_name,
    paidFor: r.paid_for ?? [],
    similarity: r.distance == null ? null : 1 - r.distance,
  }))
}
