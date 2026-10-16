import { NextResponse } from "next/server";
import { retrieveContext, verify } from "@/lib/grounding";
import { analyzeWithLLM, hasLLMKey } from "@/lib/llm";
import { analyzeLocally } from "@/lib/analyzer";
import { clientIp, createLimiter, limitsFromEnv } from "@/lib/rateLimit";
import type { AuditResponse } from "@/types/grc";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Protects the API credits: 10 AI analyses per visitor per hour and 150 per day by default
// (AI_PER_IP_HOURLY / AI_DAILY_LIMIT). Over the limit, the route answers with the demo engine.
const allowAiCall = createLimiter(limitsFromEnv());

export async function POST(req: Request) {
  let body: { incident?: unknown; archetype?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const incident = typeof body.incident === "string" ? body.incident.trim() : "";
  const archetype = typeof body.archetype === "string" ? body.archetype : undefined;

  if (incident.length < 15) {
    return NextResponse.json(
      { error: "Please describe the incident in a little more detail (at least 15 characters)." },
      { status: 400 }
    );
  }
  if (incident.length > 4000) {
    return NextResponse.json({ error: "Incident text is too long (max 4000 characters)." }, { status: 400 });
  }

  // Retrieve the relevant official-catalog controls to ground the analysis.
  const context = retrieveContext(incident);

  // Prefer the LLM when a key is configured; fall back to the grounded demo engine
  // on any error so the app always returns a useful, verifiable result.
  if (hasLLMKey() && allowAiCall(clientIp(req.headers))) {
    try {
      const { model, result } = await analyzeWithLLM(incident, context);
      if (!result.recommended_strategy) {
        result.recommended_strategy = { strategy: "MITIGATE", rationale: "" };
      }
      const verification = verify(result);
      const resp: AuditResponse = { source: "llm", model, verification, result };
      return NextResponse.json(resp);
    } catch (err) {
      // fall through to demo engine
      console.error("LLM analysis failed, using demo engine:", err);
    }
  }

  const result = analyzeLocally(incident, archetype);
  const verification = verify(result);
  const resp: AuditResponse = { source: "demo", verification, result };
  return NextResponse.json(resp);
}
