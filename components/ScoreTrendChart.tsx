const WIDTH = 100;
const HEIGHT = 32;
const PADDING = 4;

/** A minimal flat-line sparkline of session scores over time, oldest to newest. */
export default function ScoreTrendChart({ scores }: { scores: number[] }) {
  if (scores.length < 2) return null;

  const usableHeight = HEIGHT - PADDING * 2;
  const step = (WIDTH - PADDING * 2) / (scores.length - 1);

  const points = scores.map((score, i) => {
    const x = PADDING + i * step;
    const y = PADDING + usableHeight - (score / 100) * usableHeight;
    return { x, y };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${points[points.length - 1].x.toFixed(1)},${HEIGHT - PADDING} L${points[0].x.toFixed(1)},${HEIGHT - PADDING} Z`;

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" className="h-16 w-full" aria-hidden>
      <path d={areaPath} fill="#0d9488" fillOpacity="0.08" />
      <path d={linePath} fill="none" stroke="#0d9488" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={i === points.length - 1 ? 1.8 : 1.1} fill="#0d9488" />
      ))}
    </svg>
  );
}
