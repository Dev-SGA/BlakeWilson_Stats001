"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { finalThirdCount, type HeatPoint, type MatchStats } from "@/lib/stats";

type HeatMode = "all" | "first" | "second" | "late";

export const FIELD_W = 120;
const FIELD_H = 80;
const CANVAS_W = 1200;
const CANVAS_H = 800;

const STOPS: { at: number; color: [number, number, number] }[] = [
  { at: 0, color: [38, 92, 168] },
  { at: 0.28, color: [41, 150, 214] },
  { at: 0.5, color: [72, 214, 190] },
  { at: 0.68, color: [168, 224, 96] },
  { at: 0.82, color: [250, 196, 60] },
  { at: 1, color: [240, 84, 60] },
];

function rampColor(t: number): [number, number, number] {
  const clamped = Math.min(Math.max(t, 0), 1);
  for (let i = 1; i < STOPS.length; i += 1) {
    if (clamped <= STOPS[i].at) {
      const a = STOPS[i - 1];
      const b = STOPS[i];
      const f = (clamped - a.at) / (b.at - a.at || 1);
      return [
        Math.round(a.color[0] + (b.color[0] - a.color[0]) * f),
        Math.round(a.color[1] + (b.color[1] - a.color[1]) * f),
        Math.round(a.color[2] + (b.color[2] - a.color[2]) * f),
      ];
    }
  }
  return STOPS[STOPS.length - 1].color;
}

const GRID_W = 360;
const GRID_H = 240;
const SIGMA = 6.2;
const LEVELS = 9;

/** Gaussian kernel density over the pitch, normalised so a single isolated touch never reads as "hot". */
function densityGrid(points: HeatPoint[]): Float32Array {
  const grid = new Float32Array(GRID_W * GRID_H);
  const sx = GRID_W / FIELD_W;
  const sy = GRID_H / FIELD_H;
  const reach = SIGMA * 3;
  const inv = 1 / (2 * SIGMA * SIGMA);
  for (const point of points) {
    const x0 = Math.max(0, Math.floor((point.x - reach) * sx));
    const x1 = Math.min(GRID_W - 1, Math.ceil((point.x + reach) * sx));
    const y0 = Math.max(0, Math.floor((point.y - reach) * sy));
    const y1 = Math.min(GRID_H - 1, Math.ceil((point.y + reach) * sy));
    for (let gy = y0; gy <= y1; gy += 1) {
      const dy = gy / sy - point.y;
      for (let gx = x0; gx <= x1; gx += 1) {
        const dx = gx / sx - point.x;
        grid[gy * GRID_W + gx] += Math.exp(-(dx * dx + dy * dy) * inv);
      }
    }
  }
  let max = 0;
  for (let i = 0; i < grid.length; i += 1) if (grid[i] > max) max = grid[i];
  const norm = Math.max(max, 2.4);
  for (let i = 0; i < grid.length; i += 1) grid[i] /= norm;
  return grid;
}

export function paintHeat(canvas: HTMLCanvasElement, points: HeatPoint[]) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);
  if (points.length === 0) return;

  const grid = densityGrid(points);
  const off = document.createElement("canvas");
  off.width = GRID_W;
  off.height = GRID_H;
  const octx = off.getContext("2d");
  if (!octx) return;

  const image = octx.createImageData(GRID_W, GRID_H);
  const data = image.data;
  const level = (t: number) => Math.min(LEVELS - 1, Math.floor(t * LEVELS));

  for (let gy = 0; gy < GRID_H; gy += 1) {
    for (let gx = 0; gx < GRID_W; gx += 1) {
      const idx = gy * GRID_W + gx;
      const t = grid[idx];
      if (t < 0.045) continue;
      const o = idx * 4;
      // Mostly smooth colour with a hint of stepped topographic levels.
      const lv = level(t);
      const tone = t * 0.78 + ((lv + 0.5) / LEVELS) * 0.22;
      const [r, g, b] = rampColor(tone);
      let alpha = Math.min(1, Math.pow((t - 0.045) / 0.955, 0.7) * 1.08) * 222;

      // Thin contour lines where the level changes against a neighbour.
      const right = gx + 1 < GRID_W ? level(grid[idx + 1]) : lv;
      const down = gy + 1 < GRID_H ? level(grid[idx + GRID_W]) : lv;
      const edge = t > 0.17 && (right !== lv || down !== lv);
      const lift = edge ? 55 : 0;

      data[o] = Math.min(255, r + lift);
      data[o + 1] = Math.min(255, g + lift);
      data[o + 2] = Math.min(255, b + lift);
      if (edge) alpha = Math.min(255, alpha + 22);
      data[o + 3] = Math.round(alpha);
    }
  }
  octx.putImageData(image, 0, 0);

  const mx = (2 / FIELD_W) * width;
  const my = (2 / FIELD_H) * height;
  const mw = ((FIELD_W - 4) / FIELD_W) * width;
  const mh = ((FIELD_H - 4) / FIELD_H) * height;

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(mx, my, mw, mh, 12);
  ctx.clip();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  // Soft glow underneath, crisp layer on top.
  ctx.globalAlpha = 0.5;
  ctx.filter = "blur(14px)";
  ctx.drawImage(off, 0, 0, width, height);
  ctx.filter = "none";
  ctx.globalAlpha = 1;
  ctx.drawImage(off, 0, 0, width, height);
  ctx.restore();
}

export function PitchLines() {
  const uid = useId().replace(/:/g, "");
  const grass = `hm-grass-${uid}`;
  const third = `hm-third-${uid}`;
  const clip = `hm-clip-${uid}`;
  const line = "rgba(255,255,255,0.34)";
  const box = { fill: "none", stroke: line, strokeWidth: 0.55 } as const;
  const stripes = Array.from({ length: 10 }, (_, i) => i);
  const stripeW = (FIELD_W - 4) / stripes.length;
  const mid = FIELD_H / 2;
  return (
    <svg
      className="heatmap-pitch__layer"
      viewBox={`0 0 ${FIELD_W} ${FIELD_H}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={grass} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#12304a" />
          <stop offset="1" stopColor="#0c2236" />
        </linearGradient>
        <linearGradient id={third} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#4aa7e0" stopOpacity="0" />
          <stop offset="1" stopColor="#4aa7e0" stopOpacity="0.16" />
        </linearGradient>
        <clipPath id={clip}>
          <rect x="2" y="2" width={FIELD_W - 4} height={FIELD_H - 4} rx="1.5" />
        </clipPath>
      </defs>
      <rect x="0" y="0" width={FIELD_W} height={FIELD_H} fill={`url(#${grass})`} />
      <g clipPath={`url(#${clip})`}>
        {stripes.map((i) => (
          <rect
            key={i}
            x={2 + i * stripeW}
            y="2"
            width={stripeW}
            height={FIELD_H - 4}
            fill={i % 2 === 0 ? "#ffffff" : "#000000"}
            opacity={i % 2 === 0 ? 0.035 : 0.06}
          />
        ))}
        <rect x="80" y="2" width="38" height={FIELD_H - 4} fill={`url(#${third})`} />
      </g>
      <line x1="80" y1="2" x2="80" y2={FIELD_H - 2} stroke={line} strokeWidth="0.4" strokeDasharray="1.6 1.6" opacity="0.7" />
      <rect x="2" y="2" width={FIELD_W - 4} height={FIELD_H - 4} rx="1.5" {...box} strokeWidth="0.7" />
      <line x1={FIELD_W / 2} y1="2" x2={FIELD_W / 2} y2={FIELD_H - 2} stroke={line} strokeWidth="0.55" />
      <circle cx={FIELD_W / 2} cy={mid} r="9.5" {...box} />
      <circle cx={FIELD_W / 2} cy={mid} r="0.9" fill={line} stroke="none" />
      <rect x="2" y="16" width="17" height="48" {...box} />
      <rect x="2" y="29" width="6.5" height="22" {...box} />
      <circle cx="12.5" cy={mid} r="0.9" fill={line} stroke="none" />
      <path d="M 19 31.6 A 9.5 9.5 0 0 1 19 48.4" {...box} />
      <rect x={FIELD_W - 19} y="16" width="17" height="48" {...box} />
      <rect x={FIELD_W - 8.5} y="29" width="6.5" height="22" {...box} />
      <circle cx={FIELD_W - 12.5} cy={mid} r="0.9" fill={line} stroke="none" />
      <path d={`M ${FIELD_W - 19} 31.6 A 9.5 9.5 0 0 0 ${FIELD_W - 19} 48.4`} {...box} />
      <path d="M 2 4 A 2 2 0 0 0 4 2" {...box} />
      <path d={`M ${FIELD_W - 4} 2 A 2 2 0 0 0 ${FIELD_W - 2} 4`} {...box} />
      <path d={`M 2 ${FIELD_H - 4} A 2 2 0 0 1 4 ${FIELD_H - 2}`} {...box} />
      <path d={`M ${FIELD_W - 2} ${FIELD_H - 4} A 2 2 0 0 1 ${FIELD_W - 4} ${FIELD_H - 2}`} {...box} />
    </svg>
  );
}

/** Pitch outline plus the heat layer, painted synchronously so PDF capture never sees an empty canvas. */
export function HeatmapPitch({ points, className }: { points: HeatPoint[]; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useLayoutEffect(() => {
    if (canvasRef.current) paintHeat(canvasRef.current, points);
  }, [points]);

  return (
    <div className={className}>
      <PitchLines />
      <canvas ref={canvasRef} className="heatmap-pitch__layer" width={CANVAS_W} height={CANVAS_H} />
    </div>
  );
}

export function HeatmapBoard({
  heatmap,
}: {
  heatmap: MatchStats["heatmap"];
}) {
  const [mode, setMode] = useState<HeatMode>("all");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const points = useMemo(() => {
    if (mode === "first") return heatmap.firstHalf;
    if (mode === "second") return heatmap.secondHalf;
    if (mode === "late") return heatmap.secondHalf.slice(heatmap.lateFrom ?? heatmap.secondHalf.length);
    return [...heatmap.firstHalf, ...heatmap.secondHalf];
  }, [heatmap, mode]);

  useEffect(() => {
    if (canvasRef.current) paintHeat(canvasRef.current, points);
  }, [points]);

  const modes: { id: HeatMode; label: string; count: number }[] = [
    { id: "all", label: "All", count: heatmap.firstHalf.length + heatmap.secondHalf.length },
    { id: "first", label: "1st H", count: heatmap.firstHalf.length },
    { id: "second", label: "2nd H", count: heatmap.secondHalf.length },
    ...(heatmap.lateFrom != null
      ? [{ id: "late" as const, label: heatmap.lateLabel ?? "Last 20'", count: heatmap.secondHalf.length - heatmap.lateFrom }]
      : []),
  ];

  const thirds = [
    { id: "def", label: "Defensive third", value: points.filter((p) => p.x < 40).length },
    { id: "mid", label: "Middle third", value: points.filter((p) => p.x >= 40 && p.x < 80).length },
    { id: "fin", label: "Final third", value: points.filter((p) => p.x >= 80).length },
  ];

  const empty = modes[0].count === 0;

  return (
    <div className="heatmap-card">
      <div className="heatmap-card__toolbar">
        <span className="heatmap-card__count">
          {empty ? "Coordinates pending" : `${points.length} possessions · ${finalThirdCount(points)} final third`}
        </span>
        {empty ? null : (
          <div className="match-nav__pills" role="group" aria-label="Heatmap period">
            {modes.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`match-nav__pill${mode === item.id ? " is-active" : ""}`}
                aria-pressed={mode === item.id}
                onClick={() => setMode(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="heatmap-pitch">
        <PitchLines />
        <canvas ref={canvasRef} className="heatmap-pitch__layer" width={CANVAS_W} height={CANVAS_H} />
        {empty ? (
          <div className="heatmap-pitch__empty">
            <strong>Heatmap coming soon</strong>
            <span>Touch coordinates for this match have not been logged yet.</span>
          </div>
        ) : null}
      </div>

      {empty ? null : (
        <>
          <div className="heatmap-thirds" role="img" aria-label={thirds.map((t) => `${t.label}: ${t.value}`).join(". ")}>
            {thirds.map((third) => {
              const share = points.length ? Math.round((third.value / points.length) * 100) : 0;
              return (
                <div key={third.id} className={`heatmap-thirds__cell heatmap-thirds__cell--${third.id}`}>
                  <span className="heatmap-thirds__fill" style={{ height: `${Math.max(share, 4)}%` }} />
                  <strong>{share}%</strong>
                  <span>
                    {third.label} · {third.value}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="heatmap-legend">
            <span>Low</span>
            <span className="heatmap-legend__bar" aria-hidden="true" />
            <span>High</span>
            <span className="heatmap-legend__attack">
              Attack
              <svg width="26" height="10" viewBox="0 0 26 10" aria-hidden="true">
                <path d="M1 5h22M19 1.5 23 5l-4 3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </div>
        </>
      )}

      {empty || !heatmap.note ? null : <p className="heatmap-card__note">{heatmap.note}</p>}
    </div>
  );
}
