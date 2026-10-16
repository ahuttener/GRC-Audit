// Provider-agnostic LLM call (Anthropic default, OpenAI alternative) via fetch only.
// Returns an AuditResult in the grounded schema, or throws; the API route falls back
// to the local demo engine on any error or when no key is configured.
//
// Anthropic notes (current models, e.g. claude-haiku-5-5 / claude-sonnet-5-5):
// - Assistant-message prefill is rejected with a 400, so the JSON shape is enforced with
//   structured outputs (output_config.format = json_schema) instead.
// - No temperature/top_p: non-default sampling values return a 400 on these models.
// - Thinking may run by default, so the reply is read from the first `text` block and
//   max_tokens leaves room for thinking + the JSON.

import type { AuditResult } from "@/types/grc";
import { SYSTEM_PROMPT, buildUserPrompt } from "@/lib/prompt";
import auditSchema from "@/data/audit-schema.json";

export const DEFAULT_ANTHROPIC_MODEL = "claude-haiku-5-5";

export function hasLLMKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY);
}

function extractJson(text: string): AuditResult {
  try {
    return JSON.parse(text) as AuditResult;
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1 || end < start) {
      throw new Error("Model did not return a JSON object.");
    }
    return JSON.parse(text.slice(start, end + 1)) as AuditResult;
  }
}

type AnthropicBlock = { type: string; text?: string };

export async function analyzeWithLLM(
  incident: string,
  context: string
): Promise<{ model: string; result: AuditResult }> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const model =
    process.env.LLM_MODEL || (anthropicKey ? DEFAULT_ANTHROPIC_MODEL : "gpt-4o-mini");
  const user = buildUserPrompt(incident, context);

  if (anthropicKey) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 8000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: user }],
        output_config: { format: { type: "json_schema", schema: auditSchema } },
      }),
    });
    if (!res.ok) throw new Error(`Anthropic API error ${res.status}: ${await res.text()}`);
    const data = await res.json();
    if (data?.stop_reason === "refusal" || data?.stop_reason === "max_tokens") {
      throw new Error(`Anthropic stop_reason=${data.stop_reason}`);
    }
    const textBlock = (data?.content as AnthropicBlock[] | undefined)?.find((b) => b.type === "text");
    return { model, result: extractJson(textBlock?.text ?? "") };
  }

  if (openaiKey) {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: user },
        ],
      }),
    });
    if (!res.ok) throw new Error(`OpenAI API error ${res.status}: ${await res.text()}`);
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content ?? "";
    return { model, result: extractJson(text) };
  }

  throw new Error("No LLM key configured.");
}
