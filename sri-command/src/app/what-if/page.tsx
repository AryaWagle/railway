import { WhatIfClient } from "./what-if-client";

export default function WhatIfPage() {
  return (
    <div className="space-y-4">
      <header>
        <h1 className="font-display text-lg tracking-[0.12em] text-[var(--accent)]">
          SIMULATION MATRIX
        </h1>
        <p className="text-sm text-[var(--fg-muted)]">
          Synthetic scenario deltas for tariff, logistics delay, and demand — not calibrated to your
          enterprise ERP.
        </p>
      </header>
      <WhatIfClient />
    </div>
  );
}
