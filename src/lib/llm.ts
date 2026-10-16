// Provider-agnostic LLM call (Anthropic default, OpenAI alternative) via fetch only.
// Returns an AuditResult in the grounded schema, or throws; the API route falls back
// to the local demo engine on any error or when no key is configured.

import type { AuditResult } from "@/types/grc";
import { SYSTEM_PROMPT, buildUserPrompt } from "@/lib/prompt";

export function hasLLMKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY);
}

function extractJson(text: string): AuditResult {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("Model did not return a JSON object.");
  }
  return JSON.parse(text.slice(start, end + 1)) as AuditResult;
}

export async function analyzeWithLLM(
  incident: string,
  context: string
): Promise<{ model: string; result: AuditResult }> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const model =
    process.env.LLM_MODEL || (anthropicKey ? "claude-sonnet-5-5" : "gpt-4o-mini");
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
        max_tokens: 3000,
        system: SYSTEM_PROMPT,
        messages: [
          { role: "user", content: user },
          { role: "assistant", content: "{" }, // prefill → pure JSON continuation
        ],
      }),
    });
    if (!res.ok) throw new Error(`Anthropic API error ${res.status}: ${await res.text()}`);
    const data = await res.json();
    const text = "{" + (data?.content?.[0]?.text ?? "");
    return { model, result: extractJson(text) };
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
