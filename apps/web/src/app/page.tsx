import styles from "./page.module.css";

const agents = [
  ["A", "Atlas", "Purchasing", "Active"],
  ["N", "Nova", "IT & Software", "Active"],
  ["C", "Compass", "Facilities", "Active"],
  ["O", "Orbit", "Marketing", "Idle"],
  ["P", "Pioneer", "Research", "Active"],
  ["S", "Sage", "General", "Active"],
] as const;

const evidenceSteps = [
  ["01", "Request", "Atlas", "Laptop for design team"],
  ["02", "Policy version", "v3.2", "Approved policy version"],
  ["03", "Human review", "Required", "New vendor and category"],
  ["04", "Authorization", "Approved", "Within the defined limit"],
  ["05", "Settlement", "Completed", "Matched vendor record"],
  ["06", "Evidence bundle", "Portable", "Seven linked records"],
] as const;

const cases = [
  {
    decision: "ALLOW",
    title: "Office laptop request",
    agent: "Atlas · Purchasing",
    detail: "Matched category, vendor, and remaining policy limits.",
    evidence: "7 records · Portable",
  },
  {
    decision: "ESCALATE",
    title: "AI tool subscription",
    agent: "Nova · IT & Software",
    detail: "New vendor and uncategorized spend need a human decision.",
    evidence: "4 records · Pending review",
  },
  {
    decision: "DENY",
    title: "Off-policy expense",
    agent: "Compass · Facilities",
    detail: "The requested vendor is outside this agent’s approved scope.",
    evidence: "6 records · Portable",
  },
] as const;

function EvidenceTerrain() {
  return (
    <svg
      aria-hidden="true"
      className={styles.terrain}
      fill="none"
      focusable="false"
      viewBox="0 0 1200 440"
    >
      <defs>
        <pattern height="28" id="grid" patternUnits="userSpaceOnUse" width="28">
          <path d="M 28 0 L 0 0 0 28" stroke="currentColor" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect fill="url(#grid)" height="440" opacity="0.32" width="1200" />
      <g className={styles.contours}>
        <path d="M-30 314C92 243 143 382 263 314s158-110 284-33 197 48 286-52 149-8 247-48 172-90 224-52" />
        <path d="M-35 335c123-70 177 67 299-1s169-122 286-45 198 44 289-56 154 0 247-43 158-89 213-53" />
        <path d="M-22 360c124-70 177 62 300-6s174-119 286-41 193 42 288-55 151 3 242-40 167-82 227-42" />
        <path d="M-4 131c115-75 171 66 280 3s159-126 282-46 190 56 285-37 165-25 263-68 158-80 221-45" />
        <path d="M-12 154c115-75 171 61 282-2s164-123 282-43 189 51 287-42 168-20 263-65 160-75 222-41" />
        <path d="M-18 177c116-76 171 57 284-6s166-120 283-40 186 47 286-44 171-18 261-62 162-71 226-37" />
        <path d="M41 411c84-61 132 35 217-17s129-116 225-59 166 29 249-59 145-29 225-71 154-59 207-23" />
      </g>
      <g className={styles.terrainDots}>
        <circle cx="144" cy="286" r="3" />
        <circle cx="345" cy="224" r="3" />
        <circle cx="582" cy="263" r="3" />
        <circle cx="827" cy="210" r="3" />
        <circle cx="1020" cy="267" r="3" />
      </g>
    </svg>
  );
}

export default function HomePage() {
  return (
    <div className={styles.page}>
      <a className={styles.skipLink} href="#main-content">
        Skip to main content
      </a>
      <header className={styles.header}>
        <a aria-label="Reins home" className={styles.brand} href="#product">
          Reins
        </a>
        <nav aria-label="Main navigation" className={styles.nav}>
          <a href="#product">Product</a>
          <a href="#how-it-works">How it works</a>
          <a href="#evidence">Evidence</a>
          <a href="#security">Security</a>
        </nav>
        <a className={styles.sandboxLink} href="/assurance">
          Open sandbox <span aria-hidden="true">↗</span>
        </a>
      </header>

      <main id="main-content">
        <section className={styles.hero} id="product">
          <div className={styles.heroCopy}>
            <p className={styles.kicker}>Agentic spend governance</p>
            <h1>Every agent action leaves a trail.</h1>
            <p className={styles.lede}>
              Reins turns spending policy into deterministic decisions and portable evidence, so
              teams can see what an agent requested, what was permitted, and what actually occurred.
            </p>
            <div className={styles.actions}>
              <a className={styles.primaryAction} href="/assurance">
                Open sandbox <span aria-hidden="true">→</span>
              </a>
              <a className={styles.secondaryAction} href="#evidence">
                Explore evidence <span aria-hidden="true">→</span>
              </a>
            </div>
            <dl className={styles.promises}>
              <div>
                <dt>Deterministic</dt>
                <dd>Policy decides</dd>
              </div>
              <div>
                <dt>Traceable</dt>
                <dd>Every decision explains itself</dd>
              </div>
              <div>
                <dt>Portable</dt>
                <dd>Evidence travels with the record</dd>
              </div>
            </dl>
          </div>

          <aside className={styles.heroNote}>
            <p className={styles.noteLabel}>Synthetic demonstration</p>
            <p>
              A closer look at how AI purchasing agents operate with deterministic policy and
              portable evidence.
            </p>
            <span>Trust in every transaction</span>
          </aside>
        </section>

        <section aria-labelledby="atlas-title" className={styles.atlasSection} id="how-it-works">
          <div className={styles.atlasPanel}>
            <div className={styles.sectionHeader}>
              <div>
                <p className={styles.kicker}>Synthetic demonstration</p>
                <h2 id="atlas-title">Evidence atlas</h2>
                <p>Trace one agent request from intent to a portable evidence record.</p>
              </div>
              <span className={styles.viewLabel}>Full journey</span>
            </div>
            <div className={styles.atlasCanvas}>
              <EvidenceTerrain />
              <ol aria-label="Evidence path" className={styles.evidencePath}>
                {evidenceSteps.map(([number, label, value, detail], index) => (
                  <li key={label}>
                    <span className={styles.stepDot} data-step={index}>
                      {number}
                    </span>
                    <div>
                      <p>{label}</p>
                      <strong>{value}</strong>
                      <span>{detail}</span>
                    </div>
                  </li>
                ))}
              </ol>
              <p className={styles.atlasCaption}>Policy / people / actions / evidence</p>
            </div>
          </div>

          <aside className={styles.roster} aria-labelledby="roster-title">
            <div className={styles.rosterHeading}>
              <div>
                <h2 id="roster-title">Live agent roster</h2>
                <p>Scenario state</p>
              </div>
              <span>
                <i /> 12 online
              </span>
            </div>
            <ul>
              {agents.map(([initial, name, team, status]) => (
                <li key={name}>
                  <span className={styles.avatar}>{initial}</span>
                  <span className={styles.agentName}>
                    <strong>{name}</strong>
                    <small>{team}</small>
                  </span>
                  <span className={status === "Idle" ? styles.idle : styles.active}>{status}</span>
                </li>
              ))}
            </ul>
            <div className={styles.budget}>
              <div>
                <span>Shared budget</span>
                <strong>68%</strong>
              </div>
              <div aria-label="Shared budget 68 percent used" className={styles.meter} role="img">
                <span />
              </div>
              <p>Across all active agents</p>
            </div>
          </aside>
        </section>

        <section aria-labelledby="cases-title" className={styles.cases} id="evidence">
          <div className={styles.casesHeading}>
            <div>
              <p className={styles.kicker}>Decision records</p>
              <h2 id="cases-title">The decision is only the beginning.</h2>
            </div>
            <p>Each outcome has a reason, an owner, and a linked evidence trail.</p>
          </div>
          <div className={styles.caseGrid}>
            {cases.map((item) => (
              <article
                className={styles.caseCard}
                data-decision={item.decision}
                key={item.decision}
              >
                <div className={styles.decisionRow}>
                  <span>
                    {item.decision === "ALLOW" ? "✓" : item.decision === "ESCALATE" ? "!" : "×"}
                  </span>
                  <strong>{item.decision}</strong>
                  <a href="/assurance">View investigation →</a>
                </div>
                <h3>{item.title}</h3>
                <p className={styles.caseAgent}>{item.agent}</p>
                <p>{item.detail}</p>
                <footer>
                  <span aria-hidden="true">▣</span>
                  <div>
                    <strong>Evidence bundle</strong>
                    <p>{item.evidence}</p>
                  </div>
                </footer>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="security-title" className={styles.boundary} id="security">
          <p className={styles.kicker}>Demonstration boundary</p>
          <h2 id="security-title">Built to inspect decisions, not move money.</h2>
          <p>
            Synthetic records only. Reins does not process payment credentials, hold funds, or make
            payment decisions with a language model.
          </p>
        </section>
      </main>

      <footer className={styles.footer}>
        <a href="#product">Reins</a>
        <p>
          Govern spending by AI purchasing agents using deterministic policy and portable evidence.
        </p>
        <nav aria-label="Footer navigation">
          <a href="#security">Trust</a>
          <a href="#security">Security</a>
          <a href="#security">Privacy</a>
        </nav>
      </footer>
    </div>
  );
}
