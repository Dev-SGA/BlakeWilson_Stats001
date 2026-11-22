"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { finalThirdCount, type HeatPoint, type MatchStats } from "@/lib/stats";

type HeatMode = "all" | "first" | "second" | "late";

export const FIELD_W = 120;
const FIELD_H = 80;
const CANVAS_W = 1200;
const CANVAS_H = 800;

type Rgb = [number, number, number];

export type HeatTheme = {
  grass: string;
  line: string;
  lineWidth: number;
  ramp: { at: number; color: Rgb }[];
  sigma: number;
  /** Density where colour starts to appear and where it reaches full opacity. */
  fadeFrom: number;
  fadeTo: number;
  maxAlpha: number;
  blur: number;
  rounded: boolean;
};

export const HEAT_THEMES = {
  current: {
    grass: "#6f9350",
    line: "rgba(16, 40, 16, 0.55)",
    lineWidth: 0.55,
    ramp: [
      { at: 0, color: [216, 228, 106] },
      { at: 0.32, color: [245, 208, 62] },
      { at: 0.56, color: [239, 152, 42] },
      { at: 0.8, color: [227, 90, 38] },
      { at: 1, color: [203, 48, 34] },
    ],
    sigma: 3.4,
    fadeFrom: 0.055,
    fadeTo: 0.056,
    maxAlpha: 0.92,
    blur: 0,
    rounded: true,
  },
  broadcast: {
    grass: "#4d7a3c",
    line: "rgba(255, 255, 255, 0.7)",
    lineWidth: 0.42,
    ramp: [
      { at: 0, color: [255, 236, 120] },
      { at: 0.35, color: [255, 196, 54] },
      { at: 0.62, color: [244, 128, 36] },
      { at: 0.84, color: [224, 58, 34] },
      { at: 1, color: [178, 22, 30] },
    ],
    sigma: 4.1,
    fadeFrom: 0.03,
    fadeTo: 0.3,
    maxAlpha: 0.9,
    blur: 6,
    rounded: false,
  },
  night: {
    grass: "#1d3a2a",
    line: "rgba(220, 240, 225, 0.42)",
    lineWidth: 0.4,
    ramp: [
      { at: 0, color: [250, 224, 96] },
      { at: 0.4, color: [252, 168, 48] },
      { at: 0.7, color: [240, 92, 44] },
      { at: 1, color: [214, 36, 52] },
    ],
    sigma: 4.4,
    fadeFrom: 0.025,
    fadeTo: 0.34,
    maxAlpha: 0.95,
    blur: 9,
    rounded: true,
  },
  editorial: {
    grass: "#a6bf8b",
    line: "rgba(38, 64, 36, 0.7)",
    lineWidth: 0.4,
    ramp: [
      { at: 0, color: [255, 232, 150] },
      { at: 0.36, color: [247, 179, 71] },
      { at: 0.68, color: [232, 98, 58] },
      { at: 1, color: [168, 28, 46] },
    ],
    sigma: 3.8,
    fadeFrom: 0.03,
    fadeTo: 0.26,
    maxAlpha: 0.88,
    blur: 4,
    rounded: false,
  },
} satisfies Record<string, HeatTheme>;

export type HeatThemeId = keyof typeof HEAT_THEMES;
export const DEFAULT_HEAT_THEME: HeatThemeId = "night";

function rampColor(ramp: HeatTheme["ramp"], t: number): Rgb {
  const clamped = Math.min(Math.max(t, 0), 1);
  for (let i = 1; i < ramp.length; i += 1) {
    if (clamped <= ramp[i].at) {
      const a = ramp[i - 1];
      const b = ramp[i];
      const f = (clamped - a.at) / (b.at - a.at || 1);
      return [
        Math.round(a.color[0] + (b.color[0] - a.color[0]) * f),
        Math.round(a.color[1] + (b.color[1] - a.color[1]) * f),
        Math.round(a.color[2] + (b.color[2] - a.color[2]) * f),
      ];
    }
  }
  return ramp[ramp.length - 1].color;
}

function smoothstep(from: number, to: number, t: number): number {
  const x = Math.min(Math.max((t - from) / (to - from || 1e-6), 0), 1);
  return x * x * (3 - 2 * x);
}

const GRID_W = 360;
const GRID_H = 240;

/** Gaussian kernel density over the pitch, normalised so a single isolated touch never reads as "hot". */
function densityGrid(points: HeatPoint[], sigma: number): Float32Array {
  const grid = new Float32Array(GRID_W * GRID_H);
  const sx = GRID_W / FIELD_W;
  const sy = GRID_H / FIELD_H;
  const reach = sigma * 3;
  const inv = 1 / (2 * sigma * sigma);
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
  const norm = Math.max(max, 1.8);
  for (let i = 0; i < grid.length; i += 1) grid[i] /= norm;
  return grid;
}

export function paintHeat(canvas: HTMLCanvasElement, points: HeatPoint[], themeId: HeatThemeId = DEFAULT_HEAT_THEME) {
  const theme: HeatTheme = HEAT_THEMES[themeId];
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);
  if (points.length === 0) return;

  const grid = densityGrid(points, theme.sigma);
  const off = document.createElement("canvas");
  off.width = GRID_W;
  off.height = GRID_H;
  const octx = off.getContext("2d");
  if (!octx) return;

  const image = octx.createImageData(GRID_W, GRID_H);
  const data = image.data;
  const hard = theme.fadeTo - theme.fadeFrom < 0.01;

  for (let i = 0; i < grid.length; i += 1) {
    const t = grid[i];
    if (t < theme.fadeFrom) continue;
    const o = i * 4;
    const [r, g, b] = rampColor(theme.ramp, t);
    const alpha = hard
      ? Math.min(theme.maxAlpha, 0.22 + 0.74 * Math.pow(t, 0.75))
      : theme.maxAlpha * smoothstep(theme.fadeFrom, theme.fadeTo, t) * (0.78 + 0.22 * t);
    data[o] = r;
    data[o + 1] = g;
    data[o + 2] = b;
    data[o + 3] = Math.round(alpha * 255);
  }
  octx.putImageData(image, 0, 0);

  const mx = (2 / FIELD_W) * width;
  const my = (2 / FIELD_H) * height;
  const mw = ((FIELD_W - 4) / FIELD_W) * width;
  const mh = ((FIELD_H - 4) / FIELD_H) * height;

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(mx, my, mw, mh, theme.rounded ? 12 : 0);
  ctx.clip();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  if (theme.blur > 0) ctx.filter = `blur(${theme.blur}px)`;
  ctx.drawImage(off, 0, 0, width, height);
  ctx.filter = "none";
  ctx.restore();
}

/** Flat single-colour grass, painted under the heat layer. */
export function PitchGrass({ theme = DEFAULT_HEAT_THEME }: { theme?: HeatThemeId }) {
  return (
    <svg className="heatmap-pitch__layer" viewBox={`0 0 ${FIELD_W} ${FIELD_H}`} preserveAspectRatio="none" aria-hidden="true">
      <rect x="0" y="0" width={FIELD_W} height={FIELD_H} fill={HEAT_THEMES[theme].grass} />
    </svg>
  );
}

export function PitchLines({ theme = DEFAULT_HEAT_THEME }: { theme?: HeatThemeId }) {
  const { line, lineWidth, rounded } = HEAT_THEMES[theme];
  const box = { fill: "none", stroke: line, strokeWidth: lineWidth } as const;
  const mid = FIELD_H / 2;
  return (
    <svg
      className="heatmap-pitch__layer"
      viewBox={`0 0 ${FIELD_W} ${FIELD_H}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >

      <line x1="80" y1="2" x2="80" y2={FIELD_H - 2} stroke={line} strokeWidth={lineWidth * 0.75} strokeDasharray="1.6 1.6" opacity="0.6" />
      <rect x="2" y="2" width={FIELD_W - 4} height={FIELD_H - 4} rx={rounded ? 1.5 : 0} {...box} strokeWidth={lineWidth * 1.3} />
      <line x1={FIELD_W / 2} y1="2" x2={FIELD_W / 2} y2={FIELD_H - 2} stroke={line} strokeWidth={lineWidth} />
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
export function HeatmapPitch({
  points,
  className,
  theme = DEFAULT_HEAT_THEME,
}: {
  points: HeatPoint[];
  className?: string;
  theme?: HeatThemeId;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useLayoutEffect(() => {
    if (canvasRef.current) paintHeat(canvasRef.current, points, theme);
  }, [points, theme]);

  return (
    <div className={className} style={{ background: HEAT_THEMES[theme].grass }}>
      <PitchGrass theme={theme} />
      <canvas ref={canvasRef} className="heatmap-pitch__layer" width={CANVAS_W} height={CANVAS_H} />
      <PitchLines theme={theme} />
    </div>
  );
}

export function HeatmapBoard({
  heatmap,
  theme = DEFAULT_HEAT_THEME,
}: {
  heatmap: MatchStats["heatmap"];
  theme?: HeatThemeId;
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
    if (canvasRef.current) paintHeat(canvasRef.current, points, theme);
  }, [points, theme]);

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

      <div className="heatmap-pitch" style={{ background: HEAT_THEMES[theme].grass }}>
        <PitchGrass theme={theme} />
        <canvas ref={canvasRef} className="heatmap-pitch__layer" width={CANVAS_W} height={CANVAS_H} />
        <PitchLines theme={theme} />
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
