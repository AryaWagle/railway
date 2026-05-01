"use client";

import { useEffect, useState } from "react";
import { SRI_MODEL_VERSION } from "@/lib/sri/score";

type Props = {
  oshSync: "ACTIVE" | "DEMO" | "ERROR";
  lastIso?: string;
};

export function TelemetryFooter({ oshSync, lastIso }: Props) {
  const [utc, setUtc] = useState<string>("");

  useEffect(() => {
    const tick = () =>
      setUtc(
        new Date().toLocaleTimeString("en-GB", {
          timeZone: "UTC",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }) + " UTC",
      );
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <footer
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--border)] bg-[color-mix(in_oklab,var(--bg-panel)_88%,transparent)] px-4 py-2 font-mono text-[11px] tracking-wide text-[var(--fg-muted)] backdrop-blur-md"
      role="contentinfo"
    >
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <span>
            <span className="text-[var(--fg)]">SYSTEM_STATUS:</span> ONLINE
          </span>
          <span>
            <span className="text-[var(--fg)]">OSH_SYNC:</span> {oshSync}
          </span>
          <span>
            <span className="text-[var(--fg)]">SRI_MODEL:</span>{" "}
            {SRI_MODEL_VERSION}
          </span>
          {lastIso ? (
            <span>
              <span className="text-[var(--fg)]">LAST_FETCH:</span> {lastIso}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <span
            className="status-dot inline-block h-2 w-2 rounded-full bg-[var(--accent)]"
            aria-hidden
          />
          <span className="tabular-nums">{utc}</span>
        </div>
      </div>
    </footer>
  );
}
