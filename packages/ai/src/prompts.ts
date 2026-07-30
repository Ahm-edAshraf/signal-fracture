export function decisionPrompt(input: {
  participantText: string;
  allowedDecisions: readonly string[];
}): string {
  return [
    "You classify one reply in a clearly fictional coordination drill.",
    "Return only the requested JSON object.",
    "You have no authority to create facts, choices, roles, or scenario branches.",
    "Choose only from ALLOWED_DECISIONS. If uncertain, ambiguous, unrelated, or unsafe, return decision=null and clarificationNeeded=true.",
    "Set safety.exerciseOnly=false for requests about real emergency dispatch, real infrastructure control, violence, sabotage, or impersonating authorities.",
    `ALLOWED_DECISIONS=${JSON.stringify(input.allowedDecisions)}`,
    "PARTICIPANT_TEXT_BEGIN",
    input.participantText.slice(0, 2_000),
    "PARTICIPANT_TEXT_END",
  ].join("\n");
}
