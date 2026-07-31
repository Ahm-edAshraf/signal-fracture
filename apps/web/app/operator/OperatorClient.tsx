"use client";

import { useCallback, useEffect, useState, type SyntheticEvent } from "react";

type JoinInstruction = {
  role: "field" | "control" | "director";
  command: string;
};

const roleChannel = {
  field: "Telegram",
  control: "Discord",
  director: "Email",
} as const;

function StatusMark({ active }: { active: boolean }) {
  return <span className={`signal-dot ${active ? "active" : ""}`} />;
}

export function OperatorClient() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [secret, setSecret] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<string | null>(null);
  const [pauseReason, setPauseReason] = useState<string | null>(null);
  const [joins, setJoins] = useState<JoinInstruction[]>([]);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [roleStatuses, setRoleStatuses] = useState<
    { roleKey: JoinInstruction["role"]; status: string }[]
  >([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const checkAuth = useCallback(async () => {
    const response = await fetch("/api/operator/auth", { cache: "no-store" });
    const body = (await response.json()) as { authenticated: boolean };
    setAuthenticated(body.authenticated);
  }, []);

  const loadSession = useCallback(async () => {
    const response = await fetch("/api/operator/session", {
      cache: "no-store",
    });
    if (!response.ok) return;
    const body = (await response.json()) as {
      current: null | {
        sessionId: string;
        status: string;
        pauseReason: "operator" | "delivery_failure" | "deadline" | null;
        roles: { roleKey: JoinInstruction["role"]; status: string }[];
      };
    };
    setSessionId(body.current?.sessionId ?? null);
    setSessionStatus(body.current?.status ?? null);
    setPauseReason(body.current?.pauseReason ?? null);
    setRoleStatuses(body.current?.roles ?? []);
  }, []);

  useEffect(() => void checkAuth(), [checkAuth]);
  useEffect(() => {
    if (!authenticated) return;
    void loadSession();
    const timer = window.setInterval(() => void loadSession(), 2_000);
    return () => window.clearInterval(timer);
  }, [authenticated, loadSession]);

  async function login(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const response = await fetch("/api/operator/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret }),
    });
    setSecret("");
    setAuthenticated(response.ok);
    setNotice(
      response.ok ? "Operator session authenticated." : "Access denied.",
    );
    setBusy(false);
  }

  async function action(
    requested: "create" | "start" | "pause" | "resume" | "abort" | "reset",
  ): Promise<void> {
    if (
      requested === "reset" &&
      !window.confirm(
        "Reset the demo tenant? This permanently removes the current fictional session and its evidence.",
      )
    ) {
      return;
    }
    if (
      requested === "abort" &&
      !window.confirm(
        "Abort the current fictional exercise? Open injects and unsent deliveries will be cancelled.",
      )
    ) {
      return;
    }
    setBusy(true);
    setNotice(null);
    const response = await fetch("/api/operator/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: requested, sessionId }),
    });
    const body = (await response.json().catch(() => ({}))) as {
      error?: string;
      sessionId?: string;
      joins?: JoinInstruction[];
      expiresAt?: number;
      status?: string;
      deletedSessions?: number;
    };
    if (!response.ok) {
      setNotice(body.error ?? "The operator action could not be completed.");
    } else if (requested === "create") {
      setSessionId(body.sessionId ?? null);
      setSessionStatus("draft");
      setPauseReason(null);
      setJoins(body.joins ?? []);
      setRoleStatuses(
        (["field", "control", "director"] as const).map((roleKey) => ({
          roleKey,
          status: "unassigned",
        })),
      );
      setExpiresAt(body.expiresAt ?? null);
      setNotice(
        "Session staged. Send each private command through its assigned channel.",
      );
    } else if (requested === "start") {
      setSessionStatus("running");
      setPauseReason(null);
      setNotice(
        "Scenario started. Initial injects are queued for real delivery.",
      );
    } else if (requested === "pause") {
      setSessionStatus("paused");
      setPauseReason("operator");
      setNotice(
        "Exercise paused. Pending injects and participant decisions are held.",
      );
    } else if (requested === "resume") {
      setSessionStatus(body.status ?? "running");
      setPauseReason(null);
      setNotice("Exercise resumed from its previous phase.");
    } else if (requested === "abort") {
      setSessionStatus("aborted");
      setPauseReason(null);
      setNotice(
        "Exercise aborted. Open injects and deliveries were cancelled.",
      );
    } else {
      setSessionId(null);
      setSessionStatus(null);
      setPauseReason(null);
      setJoins([]);
      setRoleStatuses([]);
      setExpiresAt(null);
      setNotice(
        `Demo tenant reset (${body.deletedSessions ?? 0} session removed).`,
      );
    }
    setBusy(false);
  }

  async function copy(value: string) {
    await navigator.clipboard.writeText(value);
    setNotice(
      "Join command copied. Share it only with the assigned participant.",
    );
  }

  async function logout() {
    await fetch("/api/operator/auth", { method: "DELETE" });
    setAuthenticated(false);
    setSessionId(null);
    setSessionStatus(null);
    setPauseReason(null);
    setJoins([]);
    setRoleStatuses([]);
  }

  return (
    <main className="operator-shell">
      <div className="exercise-band">
        <span>Exercise environment</span>
        <strong>Fictional scenario — not a real emergency</strong>
      </div>
      <header className="site-header">
        <a className="wordmark" href="/">
          <span className="wordmark-signal">SIGNAL</span>
          <span className="wordmark-cut" aria-hidden="true" />
          <span>FRACTURE</span>
        </a>
        <div className="header-meta">
          <span>SECURE OPERATOR PLANE</span>
          <a className="operator-link" href="/">
            Live dashboard
          </a>
        </div>
      </header>

      <section className="operator-content">
        <div className="operator-intro">
          <p className="eyebrow">Asteria Station / Bay 3</p>
          <h1>Run the fracture.</h1>
          <p>
            Stage one demo tenant, privately distribute expiring role commands,
            then begin only after all three real channels show joined.
          </p>
        </div>

        {authenticated === null ? (
          <div className="operator-card">Checking operator session…</div>
        ) : !authenticated ? (
          <form
            className="operator-card auth-card"
            onSubmit={(event) => void login(event)}
          >
            <span className="panel-kicker">AUTHENTICATION REQUIRED</span>
            <h2>Operator access</h2>
            <label htmlFor="operator-secret">Operator secret</label>
            <input
              id="operator-secret"
              type="password"
              autoComplete="current-password"
              value={secret}
              onChange={(event) => setSecret(event.target.value)}
              required
            />
            <button className="primary-action" disabled={busy} type="submit">
              {busy ? "Checking…" : "Authenticate"}
            </button>
          </form>
        ) : (
          <div className="operator-workspace">
            <div className="operator-actions">
              <button
                className="primary-action"
                disabled={busy || sessionId !== null}
                onClick={() => void action("create")}
              >
                1 · Stage session
              </button>
              <button
                className="primary-action start-action"
                disabled={
                  busy ||
                  sessionId === null ||
                  roleStatuses.length !== 3 ||
                  roleStatuses.some(({ status }) => status !== "joined")
                }
                onClick={() => void action("start")}
              >
                2 · Start when joined
              </button>
              <button
                className="secondary-action"
                disabled={
                  busy ||
                  (sessionStatus !== "running" && sessionStatus !== "resolving")
                }
                onClick={() => void action("pause")}
              >
                Pause exercise
              </button>
              <button
                className="secondary-action"
                disabled={
                  busy ||
                  sessionStatus !== "paused" ||
                  pauseReason !== "operator"
                }
                onClick={() => void action("resume")}
              >
                Resume exercise
              </button>
              <button
                className="danger-action"
                disabled={
                  busy ||
                  sessionId === null ||
                  sessionStatus === "aborted" ||
                  sessionStatus === "completed" ||
                  sessionStatus === "failed"
                }
                onClick={() => void action("abort")}
              >
                Abort exercise
              </button>
              <button
                className="danger-action"
                disabled={busy}
                onClick={() => void action("reset")}
              >
                Reset demo tenant
              </button>
              <button
                className="secondary-action"
                disabled={busy || sessionStatus !== "completed"}
                onClick={() => window.location.assign("/api/operator/report")}
              >
                Export report
              </button>
              <button className="text-action" onClick={() => void logout()}>
                Sign out
              </button>
            </div>

            <p className="operator-session-status" role="status">
              Session state: {sessionStatus?.toUpperCase() ?? "NONE"}
              {pauseReason === "delivery_failure"
                ? " · DELIVERY FAILURE — RESET REQUIRED"
                : pauseReason === "deadline"
                  ? " · DEADLINE MISSED — RESET REQUIRED"
                  : ""}
            </p>

            <section className="join-board" aria-labelledby="join-heading">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Private participant access</p>
                  <h2 id="join-heading">Role join commands</h2>
                </div>
                <span className="version-tag">
                  {expiresAt
                    ? `EXPIRES ${new Date(expiresAt).toLocaleTimeString()}`
                    : "NOT GENERATED"}
                </span>
              </div>
              {roleStatuses.length > 0 ? (
                <div
                  className="role-status-strip"
                  aria-label="Role join status"
                >
                  {roleStatuses.map((role) => (
                    <span key={role.roleKey}>
                      <StatusMark active={role.status === "joined"} />
                      {role.roleKey} · {role.status}
                    </span>
                  ))}
                </div>
              ) : null}
              {joins.length === 0 ? (
                <p className="empty-copy">
                  Stage a session to generate single-use, channel-bound
                  commands. They are shown once and are never stored in
                  plaintext.
                </p>
              ) : (
                <div className="join-grid">
                  {joins.map((join) => (
                    <article className="join-card" key={join.role}>
                      <span>{roleChannel[join.role]}</span>
                      <h3>{join.role}</h3>
                      <code>{join.command}</code>
                      <button onClick={() => void copy(join.command)}>
                        Copy private command
                      </button>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
        {notice ? (
          <p className="operator-notice" role="status">
            {notice}
          </p>
        ) : null}
      </section>
    </main>
  );
}
