import { useEffect, useState } from "react";
import { riskLevel, riskLevelLabel } from "@/lib/risk";

export const RiskGauge = ({ score, size = 240 }: { score: number; size?: number }) => {
  const [animated, setAnimated] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const dur = 1200;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setAnimated(score * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [score]);

  const level = riskLevel(score);
  const stroke = 14;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (animated / 100) * circ;
  const colorClass = level === "Low" ? "gradient-low" : level === "Medium" ? "gradient-moderate" : "gradient-high";
  const gradientId = `gauge-${level}`;
  const stops = level === "Low"
    ? ["hsl(145 65% 42%)", "hsl(165 70% 50%)"]
    : level === "Medium"
    ? ["hsl(35 95% 55%)", "hsl(20 90% 58%)"]
    : ["hsl(10 85% 55%)", "hsl(340 80% 50%)"];

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={stops[0]} />
            <stop offset="100%" stopColor={stops[1]} />
          </linearGradient>
        </defs>
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth={stroke} />
        <circle
          cx={size/2} cy={size/2} r={radius} fill="none"
          stroke={`url(#${gradientId})`} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.1s linear" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-5xl font-display font-bold tabular-nums">{Math.round(animated)}</div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground mt-1">/ 100</div>
        <div className={`mt-3 px-3 py-1 rounded-full text-xs font-semibold text-white ${colorClass}`}>
          {riskLevelLabel(level)}
        </div>
      </div>
    </div>
  );
};
