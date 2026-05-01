"use client";

import { useMemo, useState } from "react";

export function WhatIfClient() {
  const [tariff, setTariff] = useState(10);
  const [delay, setDelay] = useState(15);
  const [demand, setDemand] = useState(50);

  const matrix = useMemo(() => {
    const base = 48;
    const delta =
      Math.round(tariff * 0.35) + Math.round(delay * 0.55) - Math.round((demand - 50) * 0.2);
    const sri = Math.min(100, Math.max(0, base + delta));
    return { delta, sri };
  }, [tariff, delay, demand]);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="hud-panel space-y-6 p-4">
        <Slider
          label="Tariff shock (index)"
          value={tariff}
          min={0}
          max={40}
          onChange={setTariff}
        />
        <Slider
          label="Logistics delay (days)"
          value={delay}
          min={0}
          max={45}
          onChange={setDelay}
        />
        <Slider label="Demand shift (%)" value={demand} min={20} max={120} onChange={setDemand} />
      </div>
      <div className="hud-panel p-4">
        <div className="font-display text-[10px] tracking-[0.12em] text-[var(--fg-muted)]">
          MATRIX OUTPUT
        </div>
        <div className="mt-4 font-mono text-sm leading-relaxed text-[var(--fg)]">
          <div>{">"} SCENARIO_HASH = SHA1(TARIFF|DELAY|DEMAND)</div>
          <div>{">"} DELTA_SRI = {matrix.delta >= 0 ? "+" : ""}
          {matrix.delta}</div>
          <div>{">"} PROJECTED_SRI = {matrix.sri}</div>
          <div className="mt-3 text-[var(--fg-muted)]">
            Terminal-style reveal is synthetic; tune weights when real telemetry lands.
          </div>
        </div>
      </div>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <label className="font-display text-[10px] tracking-[0.12em] text-[var(--fg-muted)]">
          {label}
        </label>
        <span className="font-mono text-xs tabular-nums text-[var(--accent)]">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full accent-[var(--accent)]"
      />
    </div>
  );
}
