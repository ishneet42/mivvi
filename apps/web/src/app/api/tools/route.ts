// POST /api/tools  { name, args, receiptId, groupId }  ->  tool result
//
// Single endpoint the Gemini Live client calls when Gemini invokes a tool.
// Uses the same executeTool implementation the text-chat agent goes through,
// so tap-UI, text chat, and voice all share identical assignment semantics.
import { NextRequest, NextResponse } from 'next/server'
import { executeTool } from '@/lib/agent/impl'
import { AuthError, requireReceiptOwner } from '@/lib/authz'

export const runtime = 'nodejs'

const VALID_TOOLS = new Set([
  'list_items', 'list_people',
  'assign_item', 'unassign_item', 'split_remaining_evenly',
  'mark_person_absent', 'set_tip', 'get_summary', 'rename_receipt', 'finalize',
])

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    name?: string
    args?: Record<string, unknown>
    receiptId?: string
    groupId?: string
  }
  const { name, receiptId, groupId } = body
  const args = body.args ?? {}
  if (!name || !receiptId || !groupId) {
    return NextResponse.json({ error: 'name, receiptId, groupId required' }, { status: 400 })
  }
  if (!VALID_TOOLS.has(name)) {
    return NextResponse.json({ error: `unknown tool: ${name}` }, { status: 400 })
  }
  try {
    const auth = await requireReceiptOwner(receiptId)
    if (auth.groupId !== groupId) {
      return NextResponse.json({ error: 'groupId mismatch' }, { status: 400 })
    }
  } catch (e) {
    const err = e as AuthError
    return NextResponse.json({ error: err.message }, { status: err.status ?? 401 })
  }

  const result = await executeTool(name, args, { receiptId, groupId })
  return NextResponse.json({ result })
}
