export const EXERCISE_BANNER =
  "EXERCISE — FICTIONAL SCENARIO — NOT A REAL EMERGENCY" as const;

export function participantMessage(body: string): string {
  return `${EXERCISE_BANNER}\n\n${body}`;
}
