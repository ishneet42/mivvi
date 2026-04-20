// Mivvi: Gemini function-declaration form of our 9 assignment-agent tools.
// Mirrors src/lib/agent/tools.ts (OpenAI shape) — same names, same semantics,
// different JSON wrapping. Server-side executor in impl.ts is shared.
import { Type, type FunctionDeclaration } from '@google/genai'

export const geminiTools: FunctionDeclaration[] = [
  {
    name: 'list_items',
    description: 'List parsed receipt items and their current assignments.',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'list_people',
    description: 'List group members eligible to be assigned items.',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'assign_item',
    description: 'Assign an item to one or more people, optionally with weights.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        item_id: { type: Type.STRING },
        person_ids: { type: Type.ARRAY, items: { type: Type.STRING } },
        weights: {
          type: Type.ARRAY,
          items: { type: Type.NUMBER },
          description: 'Optional per-person weights, same length as person_ids.',
        },
      },
      required: ['item_id', 'person_ids'],
    },
  },
  {
    name: 'unassign_item',
    description: 'Clear all assignments on an item.',
    parameters: {
      type: Type.OBJECT,
      properties: { item_id: { type: Type.STRING } },
      required: ['item_id'],
    },
  },
  {
    name: 'split_remaining_evenly',
    description: 'Assign every still-unassigned item evenly across the given people (or everyone present).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        person_ids: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
    },
  },
  {
    name: 'mark_person_absent',
    description: 'Exclude a person from default even-splits for this receipt.',
    parameters: {
      type: Type.OBJECT,
      properties: { person_id: { type: Type.STRING } },
      required: ['person_id'],
    },
  },
  {
    name: 'set_tip',
    description: 'Set the tip as either an absolute amount or a percent of subtotal.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        amount: { type: Type.NUMBER },
        percent: { type: Type.NUMBER },
      },
    },
  },
  {
    name: 'get_summary',
    description: "Return each person's running total for this receipt.",
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'finalize',
    description: 'Write the assignments to the ledger as Expense rows. Returns updated group balances.',
    parameters: { type: Type.OBJECT, properties: {} },
  },
]

export const STATE_CHANGING_TOOLS = new Set([
  'assign_item', 'unassign_item', 'split_remaining_evenly',
  'mark_person_absent', 'set_tip', 'finalize',
])
