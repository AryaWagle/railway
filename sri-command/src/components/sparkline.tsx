export function Sparkline({ seed }: { seed: string }) {
  const pts: string[] = [];
  let h = 0;
  for (let i = 0; i < 18; i++) {
    h = (h * 9301 + 49297 + seed.charCodeAt(i % seed.length)) % 233280;
    const y = 4 + (h % 16);
    pts.push(`${(i / 17) * 48},${24 - y}`);
  }
  const d = `M ${pts.join(" L ")}`;

  return (
    <svg width="52" height="28" viewBox="0 0 52 28" aria-hidden className="text-[var(--accent)]">
      <path
        d={d}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.85}
      />
    </svg>
  );
}
