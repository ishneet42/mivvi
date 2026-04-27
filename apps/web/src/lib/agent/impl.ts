// Mivvi: agent-tool wrappers over the shared core helpers.
// The tool-call API is just a thin adapter so both tap-UI (REST) and chat-UI
// (agent tools) go through the same ledger code.
import { p } from '@/lib/prisma'
import * as core from '@/lib/snapsplit/core'

export interface ToolContext {
  receiptId: string
  groupId: string
}

type Args = Record<string, unknown>

async function listItems(ctx: ToolContext) {
  const r = await core.loadReceipt(ctx.receiptId)
  return r.items.map((it) => ({
    id: it.id,
    name: it.name,
    qty: it.qty,
    line_total_cents: it.lineTotal,
    parsed_confidence: it.parsedConfidence,
    assignments: it.assignments.map((a) => ({ person_id: a.participantId, weight: a.weight })),
  }))
}

async function listPeople(ctx: ToolContext) {
  const ps = await p.participant.findMany({ where: { groupId: ctx.groupId } })
  return ps.map((pp) => ({ id: pp.id, name: pp.name }))
}

export async function executeTool(name: string, args: Args, ctx: ToolContext) {
  switch (name) {
    case 'list_items':
      return listItems(ctx)
    case 'list_people':
      return listPeople(ctx)
    case 'assign_item':
      return core.setAssignments(
        String(args.item_id),
        (args.person_ids as string[]) ?? [],
        args.weights as number[] | undefined,
      )
    case 'unassign_item':
      return core.setAssignments(String(args.item_id), [])
    case 'split_remaining_evenly':
      return core.splitRemainingEvenly(ctx.receiptId, ctx.groupId, args.person_ids as string[] | undefined)
    case 'mark_person_absent':
      return { ok: true, note: 'tracked client-side for now' }
    case 'set_tip':
      return core.setTip(
        ctx.receiptId,
        typeof args.amount === 'number' ? args.amount : undefined,
        typeof args.percent === 'number' ? args.percent : undefined,
      )
    case 'get_summary':
      return core.getSummary(ctx.receiptId)
    case 'rename_receipt': {
      const raw = typeof args.title === 'string' ? args.title.trim() : ''
      if (!raw) return { ok: false, error: 'title required' }
      if (raw.length > 80) return { ok: false, error: 'title too long (max 80 chars)' }
      const updated = await p.receipt.update({
        where: { id: ctx.receiptId },
        data: { title: raw },
        select: { id: true, title: true },
      })
      return { ok: true, receipt_id: updated.id, title: updated.title }
    }
    case 'finalize':
      return core.finalizeReceipt(ctx.receiptId, ctx.groupId)
    default:
      return { ok: false, error: `unknown tool ${name}` }
  }
}
