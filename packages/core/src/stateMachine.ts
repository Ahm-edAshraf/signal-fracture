import type { InjectStatus, SessionStatus } from "./domain";

const sessionTransitions: Record<SessionStatus, readonly SessionStatus[]> = {
  draft: ["ready", "aborted"],
  ready: ["running", "aborted"],
  running: ["paused", "resolving", "completed", "aborted", "failed"],
  paused: ["running", "resolving", "aborted", "failed"],
  resolving: ["paused", "completed", "aborted", "failed"],
  completed: [],
  aborted: [],
  failed: [],
};

const injectTransitions: Record<InjectStatus, readonly InjectStatus[]> = {
  planned: ["queued", "cancelled"],
  queued: ["sent", "open", "retrying", "failed", "cancelled"],
  sent: ["delivered", "open", "retrying", "failed", "cancelled"],
  delivered: ["open", "cancelled"],
  open: ["answered", "expired", "cancelled"],
  answered: ["closed"],
  closed: [],
  retrying: ["sent", "failed", "cancelled"],
  failed: [],
  expired: [],
  cancelled: [],
};

export function canTransitionSession(
  from: SessionStatus,
  to: SessionStatus,
): boolean {
  return sessionTransitions[from].includes(to);
}

export function canTransitionInject(
  from: InjectStatus,
  to: InjectStatus,
): boolean {
  return injectTransitions[from].includes(to);
}
