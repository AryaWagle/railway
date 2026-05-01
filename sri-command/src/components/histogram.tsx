type Bin = { label: string; value: number };

export function Histogram30({ bins, caption }: { bins: Bin[]; caption: string }) {
  const max = Math.max(1, ...bins.map((b) => b.value));

  return (
    <section className="hud-panel p-4" aria-label="Thirty day activity histogram">
      <div className="flex items-end justify-between gap-2">
        <h2 className="font-display text-xs tracking-[0.12em] text-[var(--fg-muted)]">
          TEMPORAL VECTOR
        </h2>
        <span className="font-mono text-[10px] text-[var(--fg-muted)]">{caption}</span>
      </div>
      <div className="mt-4 flex h-32 items-end gap-1">
        {bins.map((b) => (
          <div key={b.label} className="flex flex-1 flex-col items-center gap-1">
            <div
              className="w-full rounded-sm bg-[color-mix(in_oklab,var(--accent)_35%,transparent)]"
              style={{ height: `${(b.value / max) * 100}%`, minHeight: b.value ? 4 : 0 }}
              title={`${b.label}: ${b.value}`}
            />
            <span className="font-mono text-[9px] text-[var(--fg-muted)]">{b.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
