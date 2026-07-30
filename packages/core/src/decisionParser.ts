import type { DecisionKey } from "./domain";

const aliases: Readonly<Record<string, DecisionKey>> = {
  "SEAL BAY 3": "SEAL_BAY_3",
  INSPECT: "INSPECT",
  WAIT: "WAIT",
  "ROUTE BAY 3": "ROUTE_BAY_3",
  "ROUTE BAY 5": "ROUTE_BAY_5",
  "NOTIFY COMMANDER": "NOTIFY_COMMANDER",
  "WAIT FOR CONFIRMATION": "WAIT_FOR_CONFIRMATION",
  "PASSAGE BLOCKED": "PASSAGE_BLOCKED",
  "PASSAGE AVAILABLE": "PASSAGE_AVAILABLE",
  "REROUTE BAY 5": "REROUTE_BAY_5",
  "REQUEST OVERRIDE": "REQUEST_OVERRIDE",
  "ESCALATE NOW": "ESCALATE_NOW",
  HOLD: "HOLD",
};

const phrases: Readonly<Record<string, DecisionKey>> = {
  "seal it immediately": "SEAL_BAY_3",
  "use bay three": "ROUTE_BAY_3",
  "use bay five": "ROUTE_BAY_5",
  "wait for more information": "WAIT_FOR_CONFIRMATION",
  "tell the commander": "NOTIFY_COMMANDER",
  "the passage is blocked": "PASSAGE_BLOCKED",
  "move them to bay five": "REROUTE_BAY_5",
  "escalate immediately": "ESCALATE_NOW",
};

function normalize(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function parseDeterministicDecision(
  text: string,
  allowed: readonly DecisionKey[],
): { decision: DecisionKey; method: "command" | "phrase" } | null {
  const normalized = normalize(text);
  const command = aliases[normalized.toUpperCase()];
  if (command !== undefined && allowed.includes(command)) {
    return { decision: command, method: "command" };
  }
  const phrase = phrases[normalized.toLowerCase()];
  if (phrase !== undefined && allowed.includes(phrase)) {
    return { decision: phrase, method: "phrase" };
  }
  return null;
}
