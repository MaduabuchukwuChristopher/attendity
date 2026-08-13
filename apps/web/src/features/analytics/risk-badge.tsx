import { Badge } from '@qr/ui';
import type { AttendanceRiskLevel } from '@qr/types';

export function RiskBadge({ level }: { readonly level: AttendanceRiskLevel }) {
  const tone =
    level === 'low'
      ? 'success'
      : level === 'medium'
        ? 'info'
        : level === 'high'
          ? 'warning'
          : 'danger';
  return <Badge tone={tone}>{level.toUpperCase()}</Badge>;
}
