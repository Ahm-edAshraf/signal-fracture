export type ParticipantCommand =
  | { type: "help" }
  | { type: "status" }
  | { type: "abort" }
  | { type: "leave" }
  | {
      type: "join";
      scenario: "ASTERIA";
      role: "field" | "control" | "director";
      code: string;
    };

export function parseParticipantCommand(
  text: string,
): ParticipantCommand | null {
  const normalized = text.trim().replace(/\s+/g, " ");
  switch (normalized.toUpperCase()) {
    case "HELP":
      return { type: "help" };
    case "STATUS":
      return { type: "status" };
    case "ABORT":
      return { type: "abort" };
    case "LEAVE":
      return { type: "leave" };
  }

  const join = /^JOIN\s+(ASTERIA)\s+(FIELD|CONTROL|DIRECTOR)\s+(\S+)$/i.exec(
    normalized,
  );
  if (join === null) return null;
  const role = join[2]?.toLowerCase();
  const code = join[3];
  if (
    code === undefined ||
    (role !== "field" && role !== "control" && role !== "director")
  ) {
    return null;
  }
  return { type: "join", scenario: "ASTERIA", role, code };
}
