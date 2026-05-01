"use client";

import { useEffect, useId, useRef } from "react";
import anime from "animejs";

type Props = {
  score: number;
  size?: number;
  label?: string;
};

export function ArcReactor({ score, size = 220, label }: Props) {
  const rid = useId();
  const ringRef = useRef<SVGCircleElement | null>(null);
  const r = (size - 24) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, score));
  const offset = c * (1 - clamped / 100);

  useEffect(() => {
    const el = ringRef.current;
    if (!el) return;
    el.style.strokeDasharray = `${c}`;
    el.style.strokeDashoffset = `${c}`;
    anime({
      targets: el,
      strokeDashoffset: offset,
      duration: 1400,
      easing: "easeOutExpo",
    });

  }, [c, offset]);

  const ariaLabel = `${label ?? "Composite SRI score"} ${Math.round(clamped)} of 100`;

  return (
    <div className="relative flex flex-col items-center justify-center">
      <svg
        width={size}
        height={size}
        role="meter"
        aria-label={ariaLabel}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(clamped)}
        className="drop-shadow-[0_0_28px_rgba(0,229,255,0.18)]"
      >
        <defs>
          <linearGradient id={`glow-${rid}`} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.95" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.25" />
          </linearGradient>
        </defs>
        <g className="arc-outer-rotate" style={{ transformOrigin: "50% 50%" }}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r + 10}
            fill="none"
            stroke="color-mix(in oklab, var(--accent) 22%, transparent)"
            strokeWidth="3"
            strokeDasharray="10 14"
          />
        </g>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="color-mix(in oklab, var(--accent) 12%, transparent)"
          strokeWidth="10"
        />
        <circle
          ref={ringRef}
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#glow-${rid})`}
          strokeWidth="10"
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r * 0.35}
          fill="color-mix(in oklab, var(--accent) 18%, transparent)"
          stroke="var(--accent)"
          strokeWidth="2"
        />
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <div className="font-display text-3xl tracking-[0.12em] text-[var(--fg)]">
          {Math.round(clamped)}
        </div>
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--fg-muted)]">
          SRI
        </div>
      </div>
    </div>
  );
}
