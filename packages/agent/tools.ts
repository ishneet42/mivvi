// OpenAI function-calling tool definitions for the assignment agent.
// Implementations live in runner.ts and call into the spliit Prisma client.

import type { ChatCompletionTool } from "openai/resources/chat/completions";

export const tools: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "list_items",
      description: "List parsed receipt items and their current assignments.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "list_people",
      description: "List group members eligible to be assigned items.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "assign_item",
      description: "Assign an item to one or more people, optionally with weights.",
      parameters: {
        type: "object",
        properties: {
          item_id: { type: "string" },
          person_ids: { type: "array", items: { type: "string" } },
          weights: {
            type: "array",
            items: { type: "number" },
            description: "Optional per-person weights, same length as person_ids.",
          },
        },
        required: ["item_id", "person_ids"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "unassign_item",
      description: "Clear all assignments on an item.",
      parameters: {
        type: "object",
        properties: { item_id: { type: "string" } },
        required: ["item_id"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "split_remaining_evenly",
      description: "Assign every still-unassigned item evenly across the given people (or everyone present).",
      parameters: {
        type: "object",
        properties: {
          person_ids: { type: "array", items: { type: "string" } },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "mark_person_absent",
      description: "Exclude a person from default even-splits for this receipt.",
      parameters: {
        type: "object",
        properties: { person_id: { type: "string" } },
        required: ["person_id"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "set_tip",
      description: "Set the tip as either an absolute amount or a percent of subtotal.",
      parameters: {
        type: "object",
        properties: {
          amount: { type: "number" },
          percent: { type: "number" },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_summary",
      description: "Return each person's running total for this receipt.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "finalize",
      description: "Write the assignments to the spliit ledger as Expense rows. Returns updated group balances.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
];

export type ToolName =
  | "list_items"
  | "list_people"
  | "assign_item"
  | "unassign_item"
  | "split_remaining_evenly"
  | "mark_person_absent"
  | "set_tip"
  | "get_summary"
  | "finalize";
