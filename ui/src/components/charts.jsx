import React from "react";
import { Box, Typography, useTheme } from "@mui/material";
import { alpha } from "@mui/material/styles";

// Small charts drawn as SVG: no chart library, so nothing to download and nothing to
// keep up to date. They take plain arrays and size themselves to their box.
//
// Colours are always taken from the theme (series pass a palette path such as "secondary.main", or any CSS colour), so a chart is
// readable in both the light and the dark theme.

const pad = { left: 44, right: 12, top: 10, bottom: 24 };

/** "warning.main" -> the theme's colour; anything else (a hex, rgb()) is used as it is. */
export function resolveColor(theme, color) {
	if (typeof color !== "string") return theme.palette.primary.main;
	const [group, shade] = color.split(".");
	return theme.palette[group]?.[shade] ?? color;
}

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

// Smallest and largest of a long list without spreading it into a call (which has a limit).
const extent = (values) => values.reduce(([lo, hi], v) => [Math.min(lo, v), Math.max(hi, v)], [Infinity, -Infinity]);

/**
 * @param {{ label: string, color: string, points: { t: number, v: number|null }[] }[]} series
 * @param {{ height?: number, unit?: string, max?: number, title?: string, format?: (v:number)=>string }} options
 */
export function LineChart({ series, height = 150, unit = "", max = null, title, format = (v) => String(Math.round(v * 10) / 10) }) {
	const theme = useTheme();
	const gradientId = React.useId().replace(/:/g, "");
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

	const colors = series.map((s) => resolveColor(theme, s.color));
	const all = series.flatMap((s) => (s.points ?? []).filter((p) => p.v !== null && Number.isFinite(p.v)));
	const [tMin, tMax] = all.length ? extent(all.map((p) => p.t)) : [0, 1];
	const vMax = max ?? niceMax(all.length ? extent(all.map((p) => p.v))[1] : 1);
	const w = width - pad.left - pad.right;
	const h = height - pad.top - pad.bottom;
	const x = (t) => pad.left + (tMax === tMin ? w / 2 : ((t - tMin) / (tMax - tMin)) * w);
	const y = (v) => pad.top + h - (Math.min(v, vMax) / vMax) * h;

	// Each series becomes a line and, closed down to the floor, a soft fill under it. A gap longer than a few steps is a gap, not a slope.
	const shapes = series.map((s) => {
		let line = "";
		let area = "";
		let pen = false;
		let prev = null;
		let runStart = null;
		const closeRun = () => {
			if (runStart !== null && prev !== null) area += `L${x(prev).toFixed(1)},${y(0).toFixed(1)}L${x(runStart).toFixed(1)},${y(0).toFixed(1)}Z`;
			runStart = null;
		};
		for (const p of s.points ?? []) {
			if (p.v === null || !Number.isFinite(p.v)) {
				closeRun();
				pen = false;
				continue;
			}
			if (prev !== null && p.t - prev > (tMax - tMin) / 20 && all.length > 20) {
				closeRun();
				pen = false;
			}
			const px = x(p.t).toFixed(1);
			const py = y(p.v).toFixed(1);
			line += `${pen ? "L" : "M"}${px},${py}`;
			area += `${pen ? "L" : "M"}${px},${py}`;
			if (!pen) runStart = p.t;
			pen = true;
			prev = p.t;
		}
		closeRun();
		return { line, area };
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
	const fillSeries = series.length <= 2;
	// Keep the readout inside the chart: on the left half it sits to the right of the cursor, and the other way round.
	const hoverX = hover ? x(hover.t) : 0;
	const readoutOnRight = hoverX < width / 2;

	return (
		<Box ref={ref} sx={{ width: "100%", minWidth: 0, overflow: "hidden", position: "relative" }}>
			{title && (
				<Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 0.25, fontWeight: 600 }}>
					{title}
				</Typography>
			)}
			{all.length === 0 ? (
				<Box sx={{ height, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 2, border: "1px dashed", borderColor: "divider" }}>
					<Typography variant="caption" sx={{ color: "text.secondary" }}>
						No readings in this range yet.
					</Typography>
				</Box>
			) : (
				<svg
					width={width}
					height={height}
					style={{ display: "block", maxWidth: "100%", touchAction: "pan-y" }}
					onPointerMove={(e) => setHover(nearest(e.clientX))}
					onPointerDown={(e) => setHover(nearest(e.clientX))}
					onPointerLeave={() => setHover(null)}
					role="img"
					aria-label={title}
				>
					<defs>
						{colors.map((c, i) => (
							<linearGradient key={i} id={`${gradientId}-${i}`} x1="0" y1="0" x2="0" y2="1">
								<stop offset="0" stopColor={c} stopOpacity="0.28" />
								<stop offset="1" stopColor={c} stopOpacity="0" />
							</linearGradient>
						))}
					</defs>
					{ticks.map((v) => (
						<g key={v}>
							<line x1={pad.left} x2={width - pad.right} y1={y(v)} y2={y(v)} stroke={theme.palette.divider} strokeDasharray={v === 0 ? undefined : "3 4"} />
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
					{fillSeries && shapes.map((s, i) => <path key={`a${series[i].label}`} d={s.area} fill={`url(#${gradientId}-${i})`} stroke="none" />)}
					{series.map((s, i) => (
						<path key={s.label} d={shapes[i].line} fill="none" stroke={colors[i]} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
					))}
					{hover && (
						<g>
							<line x1={hoverX} x2={hoverX} y1={pad.top} y2={pad.top + h} stroke={theme.palette.text.disabled} />
							{series.map((s, i) => {
								const p = (s.points ?? []).find((q) => q.t === hover.t && q.v !== null);
								return p ? <circle key={s.label} cx={x(p.t)} cy={y(p.v)} r="3.5" fill={colors[i]} stroke={theme.palette.background.paper} strokeWidth="1.5" /> : null;
							})}
						</g>
					)}
				</svg>
			)}
			{hover && (
				<Box
					sx={{
						position: "absolute",
						top: 18,
						...(readoutOnRight ? { left: Math.min(hoverX + 10, width - 150) } : { right: Math.min(width - hoverX + 10, width - 150) }),
						bgcolor: "background.paper",
						border: 1,
						borderColor: "divider",
						boxShadow: (t) => t.custom.shadow,
						px: 1,
						py: 0.5,
						borderRadius: 1.5,
						pointerEvents: "none",
					}}
				>
					<Typography variant="caption" sx={{ display: "block", color: "text.secondary" }}>
						{new Date(hover.t).toLocaleString()}
					</Typography>
					{series.map((s, i) => {
						const p = (s.points ?? []).find((q) => q.t === hover.t && q.v !== null);
						return (
							<Typography key={s.label} variant="caption" sx={{ display: "block", color: colors[i], fontWeight: 600 }}>
								{s.label}: {p ? `${format(p.v)}${unit}` : "—"}
							</Typography>
						);
					})}
				</Box>
			)}
			{series.length > 1 && (
				<Box sx={{ display: "flex", gap: 2, ml: `${pad.left}px`, mt: 0.25 }}>
					{series.map((s, i) => (
						<Typography key={s.label} variant="caption" sx={{ color: colors[i], fontWeight: 600 }}>
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

/** A weekday-by-hour grid: stronger colour means more players. `grid[weekday][hour]` is an average or null. */
export function HourGrid({ grid }) {
	const theme = useTheme();
	if (!Array.isArray(grid)) return null;
	const max = Math.max(0.0001, ...grid.flat().filter((v) => typeof v === "number"));
	const tint = (v) => alpha(theme.palette.secondary.main, 0.12 + 0.88 * (v / max));
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
						{(grid[d] ?? []).map((v, h) => (
							<Box
								key={h}
								title={v === null ? `${DAYS[d]} ${h}:00 — no data` : `${DAYS[d]} ${h}:00 — ${v} players on average`}
								sx={{ height: 18, borderRadius: "3px", bgcolor: v === null ? "action.hover" : tint(v) }}
							/>
						))}
					</React.Fragment>
				))}
			</Box>
			<Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mt: 1, color: "text.secondary" }}>
				<Typography variant="caption">Fewer</Typography>
				{[0, 0.33, 0.66, 1].map((f) => (
					<Box key={f} sx={{ width: 18, height: 10, borderRadius: "3px", bgcolor: tint(f * max) }} />
				))}
				<Typography variant="caption">More players</Typography>
			</Box>
		</Box>
	);
}

/** Bars, one per label. */
export function BarChart({ bars, height = 90, color = "secondary.main", unit = "" }) {
	const theme = useTheme();
	const fill = resolveColor(theme, color);
	const max = Math.max(1, ...bars.map((b) => b.value));
	return (
		<Box>
			<Box sx={{ display: "flex", alignItems: "flex-end", gap: "3px", height, overflowX: "auto" }}>
				{bars.map((b) => (
					<Box
						key={b.label}
						title={`${b.label}: ${b.value}${unit}`}
						sx={{ flex: "1 0 10px", minWidth: 10, height: `${Math.max(2, (b.value / max) * 100)}%`, backgroundImage: `linear-gradient(to top, ${alpha(fill, 0.55)}, ${fill})`, borderRadius: "3px 3px 0 0", transition: "filter .15s", "&:hover": { filter: "brightness(1.2)" } }}
					/>
				))}
			</Box>
			{bars.length > 1 && (
				<Box sx={{ display: "flex", justifyContent: "space-between", mt: 0.5, color: "text.secondary" }}>
					<Typography variant="caption">{bars[0].label}</Typography>
					<Typography variant="caption">{bars[bars.length - 1].label}</Typography>
				</Box>
			)}
		</Box>
	);
}
