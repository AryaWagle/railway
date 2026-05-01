"use client";

import { Button } from "@joacod/pixel-ui";
import { geoEquirectangular, geoPath } from "d3-geo";
import { useMemo, useRef, useState } from "react";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import type { EnrichedSupplier } from "@/lib/supplier-dataset";
import countriesTopology from "world-atlas/countries-110m.json";

export type MapDot = {
  id: string;
  lng: number;
  lat: number;
  label: string;
  score: number;
  risk_tier?: EnrichedSupplier["risk_tier"];
};

const W = 1000;
const H = 500;

export function WorldMap({ dots }: { dots: MapDot[] }) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [scale, setScale] = useState(1);
  const [off, setOff] = useState({ x: 0, y: 0 });
  const dragging = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);

  const { landPaths, project } = useMemo(() => {
    const topo = countriesTopology as unknown as Topology<{ countries: GeometryCollection }>;
    const land = feature(topo, topo.objects.countries) as GeoJSON.FeatureCollection;
    const projection = geoEquirectangular().fitExtent(
      [
        [0, 0],
        [W, H],
      ],
      land,
    );
    const path = geoPath(projection);
    const landPaths = land.features
      .map((f, i) => ({ id: i, d: path(f) ?? "" }))
      .filter((x) => x.d.length > 0);
    return {
      landPaths,
      project: (lng: number, lat: number) => projection([lng, lat]),
    };
  }, []);

  const clusters = useMemo(() => {
    const cell = 48;
    const projected = dots
      .map((d) => {
        const p = project(d.lng, d.lat);
        return p ? { ...d, x: p[0], y: p[1] } : null;
      })
      .filter(Boolean) as { id: string; x: number; y: number; label: string; score: number }[];

    const map = new Map<string, typeof projected>();
    for (const d of projected) {
      const key = `${Math.floor(d.x / cell)}:${Math.floor(d.y / cell)}`;
      const arr = map.get(key) ?? [];
      arr.push(d);
      map.set(key, arr);
    }
    return [...map.entries()].map(([k, arr]) => {
      const cx = arr.reduce((s, p) => s + p.x, 0) / arr.length;
      const cy = arr.reduce((s, p) => s + p.y, 0) / arr.length;
      return { key: k, x: cx, y: cy, count: arr.length, top: arr[0] };
    });
  }, [dots, project]);

  return (
    <div className="hud-panel overflow-hidden p-3">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
        <div className="font-display text-[10px] tracking-[0.12em] text-[var(--fg-muted)]">
          WORLD BASEMAP · Natural Earth 110m · drag / scroll to pan & zoom
        </div>
        <Button
          variant="secondary"
          size="sm"
          type="button"
          onClick={() => {
            setScale(1);
            setOff({ x: 0, y: 0 });
          }}
        >
          Reset view
        </Button>
      </div>
      <div className="relative overflow-hidden rounded border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg-root)_70%,#0a1628)]">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="h-[min(56vh,520px)] w-full touch-none select-none"
          role="img"
          aria-label="World map with supplier positions"
          onWheel={(e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.08 : 0.08;
            setScale((s) => Math.min(3.2, Math.max(0.7, s + delta)));
          }}
          onPointerDown={(e) => {
            dragging.current = { px: e.clientX, py: e.clientY, ox: off.x, oy: off.y };
            (e.target as Element).setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (!dragging.current) return;
            const dx = e.clientX - dragging.current.px;
            const dy = e.clientY - dragging.current.py;
            setOff({ x: dragging.current.ox + dx, y: dragging.current.oy + dy });
          }}
          onPointerUp={() => {
            dragging.current = null;
          }}
          onPointerCancel={() => {
            dragging.current = null;
          }}
        >
          <defs>
            <pattern id="ocean-grid" width="14" height="14" patternUnits="userSpaceOnUse">
              <path
                d="M 14 0 L 0 0 0 14"
                fill="none"
                stroke="color-mix(in oklab, var(--accent) 12%, transparent)"
                strokeWidth="0.4"
              />
            </pattern>
          </defs>
          <rect width={W} height={H} fill="url(#ocean-grid)" opacity={0.45} />
          <g transform={`translate(${off.x} ${off.y}) scale(${scale})`} style={{ transformOrigin: "500px 250px" }}>
            <g className="map-land">
              {landPaths.map(({ id, d }) => (
                <path
                  key={id}
                  d={d}
                  fill="color-mix(in oklab, var(--bg-panel) 88%, var(--accent) 12%)"
                  stroke="color-mix(in oklab, var(--border) 90%, var(--accent) 10%)"
                  strokeWidth={0.6 / scale}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </g>
            {dots.map((d) => {
              const p = project(d.lng, d.lat);
              if (!p) return null;
              const [x, y] = p;
              const t = d.risk_tier ?? tierFromScore(d.score);
              const fill =
                t === "Critical"
                  ? "var(--accent-danger)"
                  : t === "High"
                    ? "var(--accent-warn)"
                    : "var(--accent)";
              return (
                <circle key={d.id} cx={x} cy={y} r={2.4} fill={fill} opacity={0.9}>
                  <title>{`${d.label} · risk ${d.score}`}</title>
                </circle>
              );
            })}
            {clusters
              .filter((c) => c.count > 1)
              .map((c) => (
                <g key={c.key}>
                  <circle
                    cx={c.x}
                    cy={c.y}
                    r={10}
                    fill="color-mix(in oklab, var(--accent-warn) 28%, transparent)"
                  />
                  <text
                    x={c.x}
                    y={c.y + 4}
                    textAnchor="middle"
                    className="fill-[var(--fg)] font-mono text-[10px]"
                  >
                    {c.count}
                  </text>
                </g>
              ))}
          </g>
        </svg>
      </div>
    </div>
  );
}

function tierFromScore(score: number): "Low" | "Moderate" | "High" | "Critical" {
  if (score < 25) return "Low";
  if (score < 50) return "Moderate";
  if (score < 75) return "High";
  return "Critical";
}
