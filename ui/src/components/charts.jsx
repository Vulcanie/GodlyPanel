import React from "react";
import { Box, Typography, useTheme } from "@mui/material";

// Small charts drawn as SVG: no chart library, so nothing to download and nothing to
// keep up to date. They take plain arrays and size themselves to their box.

const pad = { left: 44, right: 12, top: 10, bottom: 24 };

function niceMax(value) {
	if (!(value > 0)) return 1;
	const exp = 10 ** Math.floor(Math.log10(value));
	const n = value / exp;
	return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * exp;
}

function timeLabel(t, spanMs) {
	const d = new Date(t);
	if (spanMs <= 36 * 3_600_000) return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
	return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

/**
 * @param {{ label: string, color: string, points: { t: number, v: number|null }[] }[]} series
 * @param {{ height?: number, unit?: string, max?: number, title?: string, format?: (v:number)=>string }} options
 */
export function LineChart({ series, height = 150, unit = "", max = null, title, format = (v) => String(Math.round(v * 10) / 10) }) {
	const theme = useTheme();
	const ref = React.useRef(null);
	const [width, setWidth] = React.useState(600);
	const [hover, setHover] = React.useState(null);

	React.useEffect(() => {
		const el = ref.current;
		if (!el || typeof ResizeObserver === "undefined") return undefined;
		const observer = new ResizeObserver(([entry]) => setWidth(Math.max(240, entry.contentRect.width)));
		observer.observe(el);
		return () => observer.disconnect();
	}, []);

	const all = series.flatMap((s) => s.points.filter((p) => p.v !== null && Number.isFinite(p.v)));
	const tMin = all.length ? Math.min(...all.map((p) => p.t)) : 0;
	const tMax = all.length ? Math.max(...all.map((p) => p.t)) : 1;
	const vMax = max ?? niceMax(all.length ? Math.max(...all.map((p) => p.v)) : 1);
	const w = width - pad.left - pad.right;
	const h = height - pad.top - pad.bottom;
	const x = (t) => pad.left + (tMax === tMin ? w / 2 : ((t - tMin) / (tMax - tMin)) * w);
	const y = (v) => pad.top + h - (v / vMax) * h;

	const paths = series.map((s) => {
		let d = "";
		let pen = false;
		let prev = null;
		for (const p of s.points) {
			if (p.v === null || !Number.isFinite(p.v)) {
				pen = false;
				continue;
			}
			// A gap longer than a few steps is a gap, not a slope.
			if (prev && p.t - prev > (tMax - tMin) / 20 && all.length > 20) pen = false;
			d += `${pen ? "L" : "M"}${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`;
			pen = true;
			prev = p.t;
		}
		return d;
	});

	const nearest = (clientX) => {
		const rect = ref.current.getBoundingClientRect();
		const t = tMin + ((clientX - rect.left - pad.left) / w) * (tMax - tMin);
		let best = null;
		for (const p of series[0]?.points ?? []) if (p.v !== null && (best === null || Math.abs(p.t - t) < Math.abs(best.t - t))) best = p;
		return best;
	};

	const ticks = [0, 0.5, 1].map((f) => f * vMax);
	const span = tMax - tMin;

	return (
		<Box ref={ref} sx={{ width: "100%", minWidth: 0, overflow: "hidden", position: "relative" }}>
			{title && (
				<Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 0.25 }}>
					{title}
				</Typography>
			)}
			{all.length === 0 ? (
				<Box sx={{ height, display: "flex", alignItems: "center", justifyContent: "center" }}>
					<Typography variant="caption" sx={{ color: "text.secondary" }}>
						No readings in this range yet.
					</Typography>
				</Box>
			) : (
				<svg width={width} height={height} style={{ display: "block", maxWidth: "100%" }} onMouseMove={(e) => setHover(nearest(e.clientX))} onMouseLeave={() => setHover(null)} role="img" aria-label={title}>
					{ticks.map((v) => (
						<g key={v}>
							<line x1={pad.left} x2={width - pad.right} y1={y(v)} y2={y(v)} stroke={theme.palette.divider} />
							<text x={pad.left - 6} y={y(v) + 3} textAnchor="end" fontSize="10" fill={theme.palette.text.secondary}>
								{format(v)}
								{unit}
							</text>
						</g>
					))}
					{[0, 0.5, 1].map((f) => (
						<text key={f} x={pad.left + f * w} y={height - 6} textAnchor={f === 0 ? "start" : f === 1 ? "end" : "middle"} fontSize="10" fill={theme.palette.text.secondary}>
							{timeLabel(tMin + f * span, span)}
						</text>
					))}
					{series.map((s, i) => (
						<path key={s.label} d={paths[i]} fill="none" stroke={s.color} strokeWidth="1.6" strokeLinejoin="round" />
					))}
					{hover && (
						<g>
							<line x1={x(hover.t)} x2={x(hover.t)} y1={pad.top} y2={pad.top + h} stroke={theme.palette.text.disabled} />
							{series.map((s) => {
								const p = s.points.find((q) => q.t === hover.t && q.v !== null);
								return p ? <circle key={s.label} cx={x(p.t)} cy={y(p.v)} r="3" fill={s.color} /> : null;
							})}
						</g>
					)}
				</svg>
			)}
			{hover && (
				<Box sx={{ position: "absolute", top: 18, right: 14, bgcolor: "rgba(0,0,0,0.75)", px: 1, py: 0.5, borderRadius: 1, pointerEvents: "none" }}>
					<Typography variant="caption" sx={{ display: "block" }}>
						{new Date(hover.t).toLocaleString()}
					</Typography>
					{series.map((s) => {
						const p = s.points.find((q) => q.t === hover.t && q.v !== null);
						return (
							<Typography key={s.label} variant="caption" sx={{ display: "block", color: s.color }}>
								{s.label}: {p ? `${format(p.v)}${unit}` : "—"}
							</Typography>
						);
					})}
				</Box>
			)}
			{series.length > 1 && (
				<Box sx={{ display: "flex", gap: 2, ml: `${pad.left}px`, mt: 0.25 }}>
					{series.map((s) => (
						<Typography key={s.label} variant="caption" sx={{ color: s.color }}>
							● {s.label}
						</Typography>
					))}
				</Box>
			)}
		</Box>
	);
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const ORDER = [1, 2, 3, 4, 5, 6, 0]; // Monday first

/** A weekday-by-hour grid: darker means more players. `grid[weekday][hour]` is an average or null. */
export function HourGrid({ grid }) {
	const max = Math.max(0.0001, ...grid.flat().filter((v) => v !== null));
	return (
		<Box sx={{ overflowX: "auto" }}>
			<Box sx={{ display: "grid", gridTemplateColumns: "36px repeat(24, minmax(14px, 1fr))", gap: "2px", minWidth: 480 }}>
				<span />
				{Array.from({ length: 24 }, (_, h) => (
					<Typography key={h} variant="caption" sx={{ fontSize: 9, textAlign: "center", color: "text.secondary" }}>
						{h % 3 === 0 ? h : ""}
					</Typography>
				))}
				{ORDER.map((d) => (
					<React.Fragment key={d}>
						<Typography variant="caption" sx={{ color: "text.secondary", lineHeight: "18px" }}>
							{DAYS[d]}
						</Typography>
						{grid[d].map((v, h) => (
							<Box
								key={h}
								title={v === null ? `${DAYS[d]} ${h}:00 — no data` : `${DAYS[d]} ${h}:00 — ${v} players on average`}
								sx={{ height: 18, borderRadius: "2px", bgcolor: v === null ? "action.hover" : `rgba(38, 198, 218, ${0.12 + 0.88 * (v / max)})` }}
							/>
						))}
					</React.Fragment>
				))}
			</Box>
		</Box>
	);
}

/** Bars, one per label. */
export function BarChart({ bars, height = 90, color = "#26c6da", unit = "" }) {
	const max = Math.max(1, ...bars.map((b) => b.value));
	return (
		<Box sx={{ display: "flex", alignItems: "flex-end", gap: "3px", height, overflowX: "auto" }}>
			{bars.map((b) => (
				<Box key={b.label} title={`${b.label}: ${b.value}${unit}`} sx={{ flex: "1 0 10px", minWidth: 10, height: `${Math.max(2, (b.value / max) * 100)}%`, bgcolor: color, opacity: 0.85, borderRadius: "2px 2px 0 0" }} />
			))}
		</Box>
	);
}
