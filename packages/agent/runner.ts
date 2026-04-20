// Tool-call loop for the assignment agent. Streaming, capped at MAX_ROUNDS.
// Wire `executeTool` into the spliit Prisma client when you drop this into apps/web.

import OpenAI from "openai";
import type {
  ChatCompletionMessageParam,
  ChatCompletionMessageToolCall,
} from "openai/resources/chat/completions";
import { tools, type ToolName } from "./tools";
import { ASSIGNER_SYSTEM_V1 } from "./prompts";

const MAX_ROUNDS = 8;
const MODEL = "gpt-4o-mini";

export interface ToolContext {
  receiptId: string;
  groupId: string;
  // inject prisma client + spliit helpers here
}

// Concrete tool implementations live in apps/web/src/lib/agent/impl.ts.
// This is the contract: name + args -> JSON-serializable result.
export type ToolExecutor = (
  name: ToolName,
  args: Record<string, unknown>,
  ctx: ToolContext,
) => Promise<unknown>;

export async function* runAgent(
  userMessage: string,
  history: ChatCompletionMessageParam[],
  ctx: ToolContext,
  execute: ToolExecutor,
  client: OpenAI,
): AsyncGenerator<string, ChatCompletionMessageParam[]> {
  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: ASSIGNER_SYSTEM_V1 },
    ...history,
    { role: "user", content: userMessage },
  ];

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const stream = await client.chat.completions.create({
      model: MODEL,
      messages,
      tools,
      stream: true,
    });

    let content = "";
    const toolCalls: ChatCompletionMessageToolCall[] = [];

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      if (delta?.content) {
        content += delta.content;
        yield delta.content;
      }
      for (const tc of delta?.tool_calls ?? []) {
        const idx = tc.index;
        toolCalls[idx] ??= { id: "", type: "function", function: { name: "", arguments: "" } };
        if (tc.id) toolCalls[idx].id = tc.id;
        if (tc.function?.name) toolCalls[idx].function.name = tc.function.name;
        if (tc.function?.arguments) toolCalls[idx].function.arguments += tc.function.arguments;
      }
    }

    if (toolCalls.length === 0) {
      messages.push({ role: "assistant", content });
      return messages;
    }

    messages.push({ role: "assistant", content: content || null, tool_calls: toolCalls });

    for (const call of toolCalls) {
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(call.function.arguments || "{}");
      } catch {
        /* fall through with empty args */
      }
      const result = await execute(call.function.name as ToolName, args, ctx);
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(result),
      });
    }
  }

  yield "\n[agent stopped: hit max tool-call rounds]";
  return messages;
}
