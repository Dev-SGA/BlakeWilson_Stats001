"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { finalThirdCount, type HeatPoint, type MatchStats } from "@/lib/stats";

type HeatMode = "all" | "first" | "second";

export const FIELD_W = 120;
const FIELD_H = 80;
const CANVAS_W = 1200;
const CANVAS_H = 800;

const STOPS: { at: number; color: [number, number, number] }[] = [
  { at: 0, color: [41, 124, 193] },
  { at: 0.45, color: [94, 200, 197] },
  { at: 0.7, color: [224, 168, 46] },
  { at: 1, color: [229, 72, 56] },
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

export function paintHeat(canvas: HTMLCanvasElement, points: HeatPoint[]) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);
  if (points.length === 0) return;

  const sw = 200;
  const sh = Math.round((sw * height) / width);
  const off = document.createElement("canvas");
  off.width = sw;
  off.height = sh;
  const octx = off.getContext("2d");
  if (!octx) return;

  const radius = sw * 0.08;
  octx.globalCompositeOperation = "lighter";
  for (const point of points) {
    const cx = (point.x / FIELD_W) * sw;
    const cy = (point.y / FIELD_H) * sh;
    const gradient = octx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    gradient.addColorStop(0, "rgba(255,255,255,0.42)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    octx.fillStyle = gradient;
    octx.beginPath();
    octx.arc(cx, cy, radius, 0, Math.PI * 2);
    octx.fill();
  }

  const image = octx.getImageData(0, 0, sw, sh);
  const data = image.data;
  for (let i = 0; i < data.length; i += 4) {
    const intensity = data[i + 3] / 255;
    if (intensity <= 0.04) {
      data[i + 3] = 0;
      continue;
    }
    const [r, g, b] = rampColor(intensity);
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
    data[i + 3] = Math.round(Math.min(intensity * 1.05, 1) * 215);
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
  ctx.drawImage(off, 0, 0, width, height);
  ctx.restore();
}

export function PitchLines() {
  const line = "rgba(255,255,255,0.2)";
  const box = { fill: "none", stroke: line, strokeWidth: 0.7 } as const;
  return (
    <svg
      className="heatmap-pitch__layer"
      viewBox={`0 0 ${FIELD_W} ${FIELD_H}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <rect x="2" y="2" width={FIELD_W - 4} height={FIELD_H - 4} rx="1.5" {...box} />
      <line x1={FIELD_W / 2} y1="2" x2={FIELD_W / 2} y2={FIELD_H - 2} stroke={line} strokeWidth="0.7" />
      <circle cx={FIELD_W / 2} cy={FIELD_H / 2} r="9.5" {...box} />
      <circle cx={FIELD_W / 2} cy={FIELD_H / 2} r="1" fill={line} stroke="none" />
      <rect x="2" y="16" width="17" height="48" {...box} />
      <rect x="2" y="29" width="6.5" height="22" {...box} />
      <circle cx="12.5" cy={FIELD_H / 2} r="1" fill={line} stroke="none" />
      <rect x={FIELD_W - 19} y="16" width="17" height="48" {...box} />
      <rect x={FIELD_W - 8.5} y="29" width="6.5" height="22" {...box} />
      <circle cx={FIELD_W - 12.5} cy={FIELD_H / 2} r="1" fill={line} stroke="none" />
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
    return [...heatmap.firstHalf, ...heatmap.secondHalf];
  }, [heatmap, mode]);

  useEffect(() => {
    if (canvasRef.current) paintHeat(canvasRef.current, points);
  }, [points]);

  const modes: { id: HeatMode; label: string; count: number }[] = [
    { id: "all", label: "All", count: heatmap.firstHalf.length + heatmap.secondHalf.length },
    { id: "first", label: "1st H", count: heatmap.firstHalf.length },
    { id: "second", label: "2nd H", count: heatmap.secondHalf.length },
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
        <div className="heatmap-legend">
          <span>Low</span>
          <span className="heatmap-legend__bar" aria-hidden="true" />
          <span>High</span>
        </div>
      )}
    </div>
  );
}
