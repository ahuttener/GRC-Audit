// The curated example library, analysed by the grounded demo engine at build time and published as
// /indicators/examples.json. indicators.php?dataset=examples turns it into the baseline indicators.
// Same structured shape as the live telemetry events — no free text.

import { SCENARIOS } from "@/data/scenarios";
import { analyzeLocally } from "@/lib/analyzer";
import { buildTrackEvent } from "@/lib/telemetry";

export const dynamic = "force-static";

export function GET() {
  return Response.json(
    SCENARIOS.map((s) =>
      buildTrackEvent(analyzeLocally(s.description, s.archetype), {
        archetype: s.archetype,
        inputChars: s.description.length,
        fallback: false,
      }),
    ),
  );
}
