import { Fragment } from "react";

// Bolds the words/phrases in a red-flag sentence that actually signal risk, so a reader
// skimming a long list of flags can spot the concerning part of each line without reading
// every word. Free-form AI-generated text has no structured markup to key off, so this is a
// curated keyword match rather than true semantic understanding -- good enough for skimming,
// not a substitute for reading the full sentence when it matters.
const RISK_PHRASES = [
  "no audited", "not audited", "unaudited", "unverified", "self-reported", "unproven",
  "uncertain", "unclear", "unresolved", "unknown", "undisclosed", "unconfirmed",
  "lack of", "lacks", "lacking", "no clear", "no finalized", "no finalised",
  "difficult to replicate", "disconnected from", "reliant on", "dependent on", "dependency",
  "concentrated", "concentration", "significant distraction", "struggling", "distraction",
  "total business loss", "business loss", "capacity to scale", "health resilience",
  "domestic disputes", "complex stakeholder", "complicate", "high entry costs",
  "high-stakes", "high technical complexity", "capital-intensive", "unfinished",
  "risk", "red flag",
];

const PATTERN = new RegExp(`(${RISK_PHRASES.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");

export function highlightRiskText(text: string) {
  const parts = text.split(PATTERN);
  if (parts.length === 1) return text;
  return parts.map((part, i) =>
    RISK_PHRASES.some((p) => p.toLowerCase() === part.toLowerCase())
      ? <strong key={i} className="font-semibold text-foreground">{part}</strong>
      : <Fragment key={i}>{part}</Fragment>
  );
}
