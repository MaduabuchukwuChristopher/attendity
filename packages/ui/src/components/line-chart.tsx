export interface LineChartProps {
  readonly values: readonly number[];
  readonly label: string;
  readonly height?: number;
}
export function LineChart({ height = 180, label, values }: LineChartProps) {
  const max = Math.max(...values, 1);
  const width = 480;
  const points = values
    .map(
      (value, index) =>
        `${(index / Math.max(values.length - 1, 1)) * width},${height - (value / max) * (height - 16) - 8}`,
    )
    .join(' ');
  return (
    <figure aria-label={label} className="w-full overflow-hidden">
      <svg className="h-auto w-full text-primary" role="img" viewBox={`0 0 ${width} ${height}`}>
        <title>{label}</title>
        <line
          stroke="currentColor"
          opacity="0.15"
          x1="0"
          x2={width}
          y1={height - 8}
          y2={height - 8}
        />
        <polyline
          fill="none"
          points={points}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="3"
        />
      </svg>
    </figure>
  );
}
