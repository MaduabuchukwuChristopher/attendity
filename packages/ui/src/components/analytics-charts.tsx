import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart as RechartsLineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const primary = '#0B6B4F';
const secondary = '#506579';
const chartPalette = [primary, '#176B87', '#C58B24', '#7C5CBF', '#C45568'];
const chartFrameStyle = { height: '18rem', width: '100%' } as const;
const tooltipStyle = {
  border: '1px solid #E2E8F0',
  borderRadius: '12px',
  background: '#FFFFFF',
  color: '#0F172A',
};

export interface TrendChartDatum {
  readonly label: string;
  readonly value: number;
  readonly secondaryValue?: number;
}

interface TrendChartProps {
  readonly data: readonly TrendChartDatum[];
  readonly label: string;
  readonly valueLabel: string;
  readonly secondaryLabel?: string;
}

export function TrendChart({ data, label, valueLabel, secondaryLabel }: TrendChartProps) {
  return (
    <figure aria-label={label} className="w-full" style={chartFrameStyle}>
      <ResponsiveContainer height="100%" width="100%">
        <RechartsLineChart data={[...data]} margin={{ top: 12, right: 12, left: -18, bottom: 0 }}>
          <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" fontSize={11} stroke={secondary} tickLine={false} />
          <YAxis domain={[0, 100]} fontSize={11} stroke={secondary} tickLine={false} unit="%" />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend />
          <Line
            dataKey="value"
            dot={false}
            name={valueLabel}
            stroke={primary}
            strokeWidth={3}
            type="monotone"
          />
          {secondaryLabel ? (
            <Line
              dataKey="secondaryValue"
              dot={false}
              name={secondaryLabel}
              stroke={secondary}
              strokeDasharray="6 4"
              strokeWidth={2}
              type="monotone"
            />
          ) : null}
        </RechartsLineChart>
      </ResponsiveContainer>
      <figcaption className="sr-only">
        {label}. {data.map((item) => `${item.label}: ${item.value}%`).join('; ')}
      </figcaption>
    </figure>
  );
}

export interface ComparisonBarDatum {
  readonly label: string;
  readonly value: number;
  readonly color?: string;
}

export function ComparisonBarChart({
  data,
  label,
}: {
  readonly data: readonly ComparisonBarDatum[];
  readonly label: string;
}) {
  return (
    <figure aria-label={label} className="w-full" style={chartFrameStyle}>
      <ResponsiveContainer height="100%" width="100%">
        <RechartsBarChart data={[...data]} margin={{ top: 12, right: 12, left: -18, bottom: 0 }}>
          <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" fontSize={11} stroke={secondary} tickLine={false} />
          <YAxis domain={[0, 100]} fontSize={11} stroke={secondary} tickLine={false} unit="%" />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar dataKey="value" fill={primary} name="Attendance" radius={[8, 8, 0, 0]}>
            {data.map((item, index) => (
              <Cell
                fill={item.color ?? chartPalette[index % chartPalette.length] ?? primary}
                key={item.label}
              />
            ))}
          </Bar>
        </RechartsBarChart>
      </ResponsiveContainer>
      <figcaption className="sr-only">
        {label}. {data.map((item) => `${item.label}: ${item.value}%`).join('; ')}
      </figcaption>
    </figure>
  );
}

export interface DonutChartDatum {
  readonly label: string;
  readonly value: number;
  readonly color?: string;
}

export function DonutChart({
  data,
  label,
}: {
  readonly data: readonly DonutChartDatum[];
  readonly label: string;
}) {
  return (
    <figure aria-label={label} className="w-full" style={chartFrameStyle}>
      <ResponsiveContainer height="100%" width="100%">
        <PieChart>
          <Pie
            data={[...data]}
            dataKey="value"
            innerRadius={62}
            nameKey="label"
            outerRadius={94}
            paddingAngle={2}
          >
            {data.map((item, index) => (
              <Cell
                fill={item.color ?? chartPalette[index % chartPalette.length] ?? primary}
                key={item.label}
              />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
      <figcaption className="sr-only">
        {label}. {data.map((item) => `${item.label}: ${item.value}`).join('; ')}
      </figcaption>
    </figure>
  );
}
