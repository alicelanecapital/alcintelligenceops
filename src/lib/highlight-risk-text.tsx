import { Fragment } from "react";

// Bolds the words/phrases in a red-flag sentence that actually signal risk, so a reader
// skimming a long list of flags can spot the concerning part of each line without reading
// every word. Free-form AI-generated text has no structured markup to key off, so this is a
// curated keyword match rather than true semantic understanding -- good enough for skimming,
// not a substitute for reading the full sentence when it matters.
const RISK_PHRASES = [
  // Longer, more specific phrases first so they win over a shorter word they contain
  // (e.g. "health is unproven" should bold as a whole, not just "unproven").
  "health is unproven", "health resilience for a restart is unverified", "health resilience",
  "technical difficulties", "slow hardware", "high technical complexity",
  "total business loss", "business loss", "capacity to scale",
  "difficult to replicate", "disconnected from modern customer acquisition", "disconnected from",
  "domestic disputes", "complex stakeholder dynamics", "complex stakeholder",
  "significant distraction", "distraction", "struggling",
  "lack of immediate urgency", "lacks a clear", "lack of", "lacks", "lacking",
  "high entry costs", "capital-intensive", "heavily reliant on", "reliant on", "dependent on", "dependency",
  "may complicate", "complicate", "uncertain about", "uncertain",
  "no audited", "not audited", "unaudited", "unverified", "self-reported", "unproven",
  "unclear", "unresolved", "unknown", "undisclosed", "unconfirmed",
  "no clear", "no finalized", "no finalised",
  "concentrated", "concentration", "high-stakes", "unfinished",
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
