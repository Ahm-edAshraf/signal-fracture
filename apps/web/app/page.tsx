const channels = [
  {
    key: "TG",
    role: "Field Engineer",
    channel: "Telegram",
    state: "Connected · inbound proof pending",
    tone: "pending",
  },
  {
    key: "DC",
    role: "Mission Control",
    channel: "Discord",
    state: "Connected · inbound proof pending",
    tone: "pending",
  },
  {
    key: "EM",
    role: "Operations Director",
    channel: "Email",
    state: "Inbound · reply · proactive send verified",
    tone: "verified",
  },
] as const;

function StatusMark({ verified }: { verified: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className="status-mark"
      viewBox="0 0 16 16"
      fill="none"
    >
      <circle cx="8" cy="8" r="6.5" />
      {verified ? <path d="m5 8 2 2 4-5" /> : <path d="M5 8h6" />}
    </svg>
  );
}

export default function QualificationPage() {
  return (
    <main>
      <div className="exercise-band">
        <span>Exercise environment</span>
        <strong>Fictional scenario — not a real emergency</strong>
      </div>

      <header className="site-header">
        <a className="wordmark" href="#top" aria-label="Signal Fracture home">
          <span className="wordmark-signal">SIGNAL</span>
          <span className="wordmark-cut" aria-hidden="true" />
          <span>FRACTURE</span>
        </a>
        <div className="header-meta">
          <span>ASTERIA / BAY 3</span>
          <span className="phase">QUALIFICATION PHASE</span>
        </div>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow">Chaos engineering for human communication</p>
          <h1>
            Three people.
            <br />
            Three partial truths.
            <br />
            <span>One visible fault.</span>
          </h1>
          <p className="hero-summary">
            Signal Fracture runs a fictional coordination drill across real
            channels, lets locally rational decisions collide, then reconstructs
            exactly who knew what and when.
          </p>
          <div className="gate-note">
            <span className="gate-label">BUILD GATE A</span>
            <p>
              The full evidence dashboard stays locked until Email and Telegram
              both pass real inbound, reply, persistence, and proactive-send
              tests.
            </p>
          </div>
        </div>

        <div
          className="fracture-map"
          aria-label="Asteria Bay 3 causal fault preview"
        >
          <div className="map-heading">
            <span>CAUSAL PREVIEW</span>
            <span>NOT LIVE SCENARIO DATA</span>
          </div>
          <div className="role-node field-node">
            <span className="node-code">FIELD / TG</span>
            <strong>Bay 3 sealed</strong>
            <small>Local pressure response</small>
          </div>
          <div className="role-node control-node">
            <span className="node-code">CONTROL / DC</span>
            <strong>Route via Bay 3</strong>
            <small>Stale synchronized map</small>
          </div>
          <div className="fault-node">
            <span>ACTION</span>
            <span className="fault-bolt" aria-hidden="true" />
            <span>WORLD</span>
            <strong>CONTRADICTION</strong>
          </div>
          <svg
            className="causal-lines"
            viewBox="0 0 520 400"
            aria-hidden="true"
          >
            <path className="line field-line" d="M45 100 H252 L300 200" />
            <path className="line control-line" d="M45 300 H252 L300 200" />
            <path className="pulse-line" d="M300 200 H486" />
          </svg>
          <div className="map-scale">
            <span>LOCAL KNOWLEDGE</span>
            <span>GLOBAL TRUTH</span>
          </div>
        </div>
      </section>

      <section className="channel-section" aria-labelledby="channel-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Authenticated gateway state</p>
            <h2 id="channel-heading">Channel qualification</h2>
          </div>
          <p>
            “Connected” is not treated as message-path proof. Each claim below
            is intentionally narrower than the evidence behind it.
          </p>
        </div>

        <div className="channel-grid">
          {channels.map((item) => {
            const verified = item.tone === "verified";
            return (
              <article className={`channel-card ${item.tone}`} key={item.key}>
                <div className="channel-topline">
                  <span className="channel-key">{item.key}</span>
                  <span className="channel-state">
                    <StatusMark verified={verified} />
                    {verified ? "VERIFIED" : "PENDING"}
                  </span>
                </div>
                <p>{item.role}</p>
                <h3>{item.channel}</h3>
                <div className="channel-divider" />
                <small>{item.state}</small>
              </article>
            );
          })}
        </div>
      </section>

      <footer>
        <p>One shared handler · deterministic state · auditable causality</p>
        <p className="footer-code">BUILD 00 / QUALIFICATION</p>
      </footer>
    </main>
  );
}
