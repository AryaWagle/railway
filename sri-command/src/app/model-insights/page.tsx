export default function ModelInsightsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-lg tracking-[0.12em] text-[var(--accent)]">
          CORE DIAGNOSTICS
        </h1>
        <p className="text-sm text-[var(--fg-muted)]">
          Synthetic calibration curves for UI staging — replace with real validation artifacts when
          a production classifier ships.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="hud-panel p-4">
          <h2 className="font-display text-[10px] tracking-[0.12em] text-[var(--fg-muted)]">
            ROC (MOCK)
          </h2>
          <svg viewBox="0 0 320 320" className="mt-3 w-full max-w-[360px]" role="img" aria-label="Mock ROC curve">
            <rect x="0" y="0" width="320" height="320" fill="color-mix(in oklab, var(--bg-root) 55%, transparent)" stroke="var(--border)" />
            <polyline
              fill="none"
              stroke="var(--accent)"
              strokeWidth="3"
              points="40,280 80,240 120,200 160,160 200,120 240,90 280,60"
            />
            <line x1="40" y1="280" x2="280" y2="60" stroke="color-mix(in oklab, var(--fg-muted) 55%, transparent)" strokeDasharray="6 6" />
            <text x="44" y="300" className="fill-[var(--fg-muted)] font-mono text-[10px]">
              FPR
            </text>
            <text x="8" y="80" className="fill-[var(--fg-muted)] font-mono text-[10px]" transform="rotate(-90 8,80)">
              TPR
            </text>
          </svg>
        </section>

        <section className="hud-panel p-4">
          <h2 className="font-display text-[10px] tracking-[0.12em] text-[var(--fg-muted)]">
            CONFUSION MATRIX (MOCK)
          </h2>
          <div className="mt-3 grid grid-cols-3 gap-2 font-mono text-xs">
            <div />
            <div className="text-center text-[var(--fg-muted)]">Pred +</div>
            <div className="text-center text-[var(--fg-muted)]">Pred −</div>
            <div className="text-[var(--fg-muted)]">Act +</div>
            <div className="rounded border border-[var(--border)] bg-[color-mix(in_oklab,var(--accent)_18%,transparent)] p-3 text-center">
              182
            </div>
            <div className="rounded border border-[var(--border)] p-3 text-center">24</div>
            <div className="text-[var(--fg-muted)]">Act −</div>
            <div className="rounded border border-[var(--border)] p-3 text-center">31</div>
            <div className="rounded border border-[var(--border)] bg-[color-mix(in_oklab,var(--accent)_10%,transparent)] p-3 text-center">
              410
            </div>
          </div>
        </section>
      </div>

      <section className="hud-panel p-4">
        <h2 className="font-display text-[10px] tracking-[0.12em] text-[var(--fg-muted)]">
          TELEMETRY
        </h2>
        <ul className="mt-3 space-y-2 font-mono text-xs text-[var(--fg-muted)]">
          <li>TRAIN_EPOCH: 000 · CHECKPOINT: staging</li>
          <li>DATASET_VERSION: OSH disclosure mirror (composite inputs)</li>
          <li>STATUS: NOMINAL · last bundle refresh on navigation</li>
        </ul>
      </section>
    </div>
  );
}
