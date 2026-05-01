"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ScanSearch } from "lucide-react";

export function ScannerForm({
  initialQ,
  countries,
  sector,
}: {
  initialQ: string;
  countries?: string;
  sector?: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState(initialQ);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const next = new URLSearchParams();
    if (q.trim()) next.set("q", q.trim());
    if (countries) next.set("countries", countries);
    if (sector) next.set("sector", sector);
    router.push(`/suppliers?${next.toString()}`);
  }

  return (
    <form
      onSubmit={onSubmit}
      className="hud-panel flex flex-col gap-3 p-4 md:flex-row md:items-center"
    >
      <label className="font-display text-[10px] tracking-[0.14em] text-[var(--fg-muted)] md:w-40">
        TARGETING SCANNER
      </label>
      <div className="flex flex-1 items-center gap-2 rounded border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg-root)_40%,transparent)] px-3 py-2">
        <ScanSearch className="h-4 w-4 text-[var(--accent)]" aria-hidden />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name / OS ID / address terms…"
          className="w-full bg-transparent text-sm text-[var(--fg)] outline-none placeholder:text-[var(--fg-muted)]"
          aria-label="Facility search query"
        />
      </div>
      <button
        type="submit"
        className="rounded border border-[var(--border)] px-4 py-2 font-display text-[10px] tracking-[0.14em] text-[var(--accent)] transition-colors hover:bg-[color-mix(in_oklab,var(--accent)_10%,transparent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
      >
        ACQUIRE
      </button>
    </form>
  );
}
