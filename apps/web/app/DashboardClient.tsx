"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type ChannelHealth = { channel: string; status: string; checkedAt: number };
type DashboardState = {
  channelHealth: ChannelHealth[];
  session: null | {
    scenarioId: string;
    publicCode: string;
    status: string;
    pauseReason: string | null;
    version: number;
    startedAt: number | null;
    completedAt: number | null;
    updatedAt: number;
  };
  roles?: {
    roleKey: string;
    displayName: string;
    publicAlias: string;
    status: string;
    channel: string | null;
  }[];
  worldFacts?: {
    factKey: string;
    value: unknown;
    version: number;
    validFrom: number;
  }[];
  roleKnowledge?: {
    roleKey: string;
    factKey: string;
    observedValue: unknown;
    worldVersionObserved: number;
    learnedAt: number;
    stale: boolean;
  }[];
  injects?: {
    injectKey: string;
    roleKey: string;
    status: string;
    faultType: string | null;
    deadlineAt?: number | null;
    updatedAt: number;
  }[];
  decisions?: {
    roleKey: string;
    decision: string | null;
    status: string;
    parseMethod: string;
    modelLatencyMs: number | null;
    modelUsed: string | null;
    at: number;
  }[];
  contradictions?: {
    contradictionKey: string;
    type: string;
    status: string;
    factRefs: string[];
    detectedAt: number;
    notifiedAt: number | null;
    resolvedAt: number | null;
  }[];
  deliveries?: {
    semanticType: string;
    roleKey: string;
    channel: string;
    status: string;
    attempts: number;
    latencyMs: number | null;
    updatedAt: number;
  }[];
  inboundEvents?: {
    eventRef: string;
    channel: string;
    mediaCount: number;
    status: string;
    duplicateCount: number;
    receivedAt: number;
    processedAt: number | null;
  }[];
  report?: null | {
    metrics: Record<string, unknown>;
    deterministicSummary: string;
    narrative: string | null;
    narrativeModelLatencyMs: number | null;
    narrativeModelUsed: string | null;
    generatedAt: number;
  };
  reliability?: {
    duplicateCount: number;
    retryCount: number;
    failedDeliveryCount: number;
  };
};

const channelMeta = {
  telegram: { code: "TG", role: "Field Engineer" },
  discord: { code: "DC", role: "Mission Control" },
  email: { code: "EM", role: "Operations Director" },
} as const;

function valueText(value: unknown): string {
  if (typeof value === "string") return value.replaceAll("_", " ");
  return JSON.stringify(value);
}

function timeText(value: number | null | undefined): string {
  if (value == null) return "—";
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(value);
}

function relativeMs(value: number | null | undefined): string {
  if (typeof value !== "number") return "—";
  if (value < 1_000) return `${value} ms`;
  return `${(value / 1_000).toFixed(value < 10_000 ? 1 : 0)} s`;
}

function formatKey(value: string): string {
  return value.replaceAll(".", " / ").replaceAll("_", " ");
}

function StatusMark({ active }: { active: boolean }) {
  return <span className={`signal-dot ${active ? "active" : ""}`} />;
}

function ShellHeader({ state }: { state: DashboardState | null }) {
  const phase = state?.session?.status ?? "STANDBY";
  return (
    <>
      <div className="exercise-band">
        <span>Exercise environment</span>
        <strong>Fictional scenario — not a real emergency</strong>
      </div>
      <header className="site-header dashboard-header">
        <a className="wordmark" href="#top" aria-label="Signal Fracture home">
          <span className="wordmark-signal">SIGNAL</span>
          <span className="wordmark-cut" aria-hidden="true" />
          <span>FRACTURE</span>
        </a>
        <div className="header-meta">
          <span>ASTERIA / BAY 3</span>
          <span
            className={`phase phase-${phase}`}
            title={state?.session?.pauseReason ?? undefined}
          >
            {phase}
          </span>
          <a className="operator-link" href="/operator">
            Operator console
          </a>
        </div>
      </header>
    </>
  );
}

function ChannelRail({ state }: { state: DashboardState | null }) {
  const byChannel = new Map(
    (state?.channelHealth ?? []).map((item) => [item.channel, item]),
  );
  return (
    <section className="channel-rail" aria-label="Channel health">
      {(Object.keys(channelMeta) as (keyof typeof channelMeta)[]).map(
        (channel) => {
          const health = byChannel.get(channel);
          const active = health?.status === "active";
          return (
            <div className="rail-item" key={channel}>
              <span className="rail-code">{channelMeta[channel].code}</span>
              <span>
                <strong>{channel}</strong>
                <small>{channelMeta[channel].role}</small>
              </span>
              <span className="rail-state">
                <StatusMark active={active} />
                {active ? "LIVE" : "CHECKING"}
              </span>
            </div>
          );
        },
      )}
    </section>
  );
}

function EmptyState() {
  return (
    <section className="standby-grid">
      <div>
        <p className="eyebrow">All message paths qualified</p>
        <h1>
          The channels are live.
          <br />
          <span>The fault is waiting.</span>
        </h1>
        <p className="hero-summary">
          Email, Telegram, and Discord have each passed real inbound, reply, and
          proactive-send tests. Stage the Asteria drill from the operator
          console to watch three partial truths diverge in real time.
        </p>
        <a className="primary-action" href="/operator">
          Open operator console
        </a>
      </div>
      <div className="standby-diagram" aria-label="Drill topology waiting">
        <div className="standby-node">FIELD / TELEGRAM</div>
        <div className="standby-node">CONTROL / DISCORD</div>
        <div className="standby-node">DIRECTOR / EMAIL</div>
        <div className="standby-core">
          <span>WORLD STATE</span>
          <strong>ARMED</strong>
        </div>
      </div>
    </section>
  );
}

function Topology({ state }: { state: DashboardState }) {
  const contradiction = state.contradictions?.[0];
  const roles = state.roles ?? [];
  return (
    <section className="topology-section" aria-labelledby="topology-heading">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">One world · separate knowledge</p>
          <h2 id="topology-heading">Role topology</h2>
        </div>
        <span className="version-tag">STATE V{state.session?.version}</span>
      </div>
      <div className={`topology ${contradiction ? "fractured" : ""}`}>
        {roles.map((role) => (
          <article
            className={`role-card role-${role.roleKey}`}
            key={role.roleKey}
          >
            <div className="role-card-top">
              <span>{role.publicAlias}</span>
              <span>{role.status}</span>
            </div>
            <h3>{role.displayName}</h3>
            <p>{role.channel ?? "Awaiting channel binding"}</p>
            <div className="knowledge-count">
              {
                (state.roleKnowledge ?? []).filter(
                  (item) => item.roleKey === role.roleKey,
                ).length
              }
              <small> known facts</small>
            </div>
          </article>
        ))}
        <div className={`fault-core ${contradiction ? "detected" : ""}`}>
          <span>
            {contradiction ? contradiction.contradictionKey : "C-BAY3"}
          </span>
          <strong>
            {contradiction ? contradiction.status : "NO FAULT YET"}
          </strong>
          <small>
            {contradiction
              ? formatKey(contradiction.type)
              : "Deterministic predicate waiting"}
          </small>
        </div>
      </div>
    </section>
  );
}

function KnowledgePanels({ state }: { state: DashboardState }) {
  const roles = state.roles ?? [];
  return (
    <section className="evidence-grid" aria-label="World and role knowledge">
      <article className="evidence-panel truth-panel">
        <div className="panel-kicker">AUTHORITATIVE</div>
        <h2>Global world truth</h2>
        <div className="fact-list">
          {(state.worldFacts ?? []).map((fact) => (
            <div className="fact-row" key={fact.factKey}>
              <span>{formatKey(fact.factKey)}</span>
              <strong>{valueText(fact.value)}</strong>
              <small>V{fact.version}</small>
            </div>
          ))}
        </div>
      </article>
      <article className="evidence-panel knowledge-panel">
        <div className="panel-kicker">EPISTEMIC SNAPSHOT</div>
        <h2>What each role knows</h2>
        <div className="knowledge-columns">
          {roles.map((role) => (
            <div className="knowledge-column" key={role.roleKey}>
              <h3>{role.publicAlias}</h3>
              {(state.roleKnowledge ?? [])
                .filter((item) => item.roleKey === role.roleKey)
                .map((item, index) => (
                  <div
                    className={`knowledge-row ${item.stale ? "stale" : ""}`}
                    key={`${item.factKey}-${index}`}
                  >
                    <span>{formatKey(item.factKey)}</span>
                    <strong>{valueText(item.observedValue)}</strong>
                    <small>
                      WORLD V{item.worldVersionObserved}
                      {item.stale ? " · STALE" : ""}
                    </small>
                  </div>
                ))}
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}

type TimelineItem = {
  key: string;
  at: number;
  kind: "inject" | "decision" | "contradiction" | "delivery";
  title: string;
  detail: string;
  tone?: "fault" | "ok";
};

function Timeline({ state }: { state: DashboardState }) {
  const items = useMemo<TimelineItem[]>(
    () =>
      [
        ...(state.injects ?? []).map((item) => ({
          key: `inject-${item.injectKey}`,
          at: item.updatedAt,
          kind: "inject" as const,
          title: `${item.injectKey} · ${item.roleKey}`,
          detail: `Inject ${item.status}${item.faultType ? ` · ${formatKey(item.faultType)}` : ""}${item.deadlineAt ? ` · due ${timeText(item.deadlineAt)}` : ""}`,
        })),
        ...(state.decisions ?? []).map((item, index) => ({
          key: `decision-${index}`,
          at: item.at,
          kind: "decision" as const,
          title: item.decision ? formatKey(item.decision) : "Clarification",
          detail: `${item.roleKey} · ${item.status} · ${item.parseMethod}${item.modelLatencyMs === null ? "" : ` · ${item.modelLatencyMs} ms ${item.modelUsed ?? "model"}`}`,
          ...(item.status === "applied" ? { tone: "ok" as const } : {}),
        })),
        ...(state.contradictions ?? []).map((item) => ({
          key: `contradiction-${item.contradictionKey}`,
          at: item.detectedAt,
          kind: "contradiction" as const,
          title: `${item.contradictionKey} · ${item.status}`,
          detail: `${formatKey(item.type)} · ${item.factRefs.join(", ")}`,
          tone: "fault" as const,
        })),
        ...(state.deliveries ?? []).map((item, index) => ({
          key: `delivery-${index}`,
          at: item.updatedAt,
          kind: "delivery" as const,
          title: `${item.channel} → ${item.roleKey}`,
          detail: `${item.semanticType} · ${item.status} · ${item.attempts} attempt${item.attempts === 1 ? "" : "s"}`,
          ...(item.status === "failed" ? { tone: "fault" as const } : {}),
        })),
      ].sort((a, b) => a.at - b.at),
    [state],
  );
  return (
    <section className="timeline-panel" aria-labelledby="timeline-heading">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Auditable causality</p>
          <h2 id="timeline-heading">Event timeline</h2>
        </div>
        <span className="version-tag">{items.length} EVENTS</span>
      </div>
      <div className="timeline-list">
        {items.length === 0 ? (
          <p className="empty-copy">No scenario events yet.</p>
        ) : (
          items.map((item, index) => (
            <article
              className={`timeline-row ${item.tone ?? ""}`}
              key={item.key}
            >
              <span className="timeline-index">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="timeline-kind">{item.kind}</span>
              <div>
                <strong>{item.title}</strong>
                <small>{item.detail}</small>
              </div>
              <time>{timeText(item.at)}</time>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

function ReportPanel({ state }: { state: DashboardState }) {
  const report = state.report;
  const metrics = report?.metrics ?? {};
  const reliability = state.reliability;
  const coordinationScore =
    typeof metrics.coordinationScore === "number"
      ? metrics.coordinationScore
      : null;
  const modelLatency = metrics.modelLatencyMs as
    { average?: unknown } | undefined;
  const modelAverage =
    typeof modelLatency?.average === "number" ? modelLatency.average : null;
  const cards = [
    [
      "Coordination score",
      coordinationScore === null ? "—" : `${coordinationScore}/100`,
    ],
    [
      "Detection",
      relativeMs(metrics.contradictionDetectionMs as number | null),
    ],
    [
      "Resolution",
      relativeMs(metrics.contradictionResolutionMs as number | null),
    ],
    ["Retries", String(reliability?.retryCount ?? 0)],
    ["Model average", relativeMs(modelAverage)],
    [
      "Narrative model",
      report?.narrativeModelLatencyMs == null
        ? "—"
        : `${relativeMs(report.narrativeModelLatencyMs)} · ${report.narrativeModelUsed ?? "model"}`,
    ],
    ["Duplicate effects", "0"],
  ];
  return (
    <section className="report-panel" aria-labelledby="report-heading">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Who knew what, when</p>
          <h2 id="report-heading">After-action report</h2>
        </div>
        <span className="version-tag">
          {report ? "GENERATED" : "AWAITING COMPLETION"}
        </span>
      </div>
      <div className="metric-grid">
        {cards.map(([label, value]) => (
          <div className="metric-card" key={label}>
            <small>{label}</small>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <div className="report-copy">
        <p>
          {report?.deterministicSummary ??
            "The deterministic report will appear when all reconciliation decisions are applied."}
        </p>
        {report?.narrative ? <blockquote>{report.narrative}</blockquote> : null}
      </div>
    </section>
  );
}

export function DashboardClient() {
  const [state, setState] = useState<DashboardState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/dashboard", { cache: "no-store" });
      if (!response.ok) throw new Error("Dashboard feed unavailable");
      setState((await response.json()) as DashboardState);
      setLastUpdate(Date.now());
      setError(null);
    } catch {
      setError("LIVE FEED DEGRADED — RETRYING");
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 750);
    return () => window.clearInterval(timer);
  }, [refresh]);

  return (
    <main id="top" className="dashboard-shell">
      <ShellHeader state={state} />
      <ChannelRail state={state} />
      <div className="live-line" role="status" aria-live="polite">
        <span>{error ?? "LIVE CONVEX EVIDENCE FEED"}</span>
        <span>LAST UPDATE {timeText(lastUpdate)}</span>
      </div>
      {!state ? (
        <div className="loading-state">Loading evidence plane…</div>
      ) : state.session === null ? (
        <EmptyState />
      ) : (
        <div className="dashboard-content">
          <Topology state={state} />
          <KnowledgePanels state={state} />
          <Timeline state={state} />
          <ReportPanel state={state} />
        </div>
      )}
      <footer>
        <p>One shared handler · deterministic state · auditable causality</p>
        <p className="footer-code">BUILD 01 / LIVE EVIDENCE</p>
      </footer>
    </main>
  );
}
