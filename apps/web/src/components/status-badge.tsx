import { Badge, type BadgeProps } from '@qr/ui';

const dangerStatuses = new Set([
  'absent',
  'blocked',
  'cancelled',
  'closed',
  'deactivated',
  'expired',
  'failed',
  'inactive',
  'not_eligible',
  'rejected',
  'revoked',
  'suspended',
  'withdrawn',
]);

const successStatuses = new Set([
  'accepted',
  'active',
  'approved',
  'completed',
  'eligible',
  'open',
  'present',
  'registered',
  'verified',
]);

const warningStatuses = new Set([
  'awaiting_approval',
  'expiring',
  'invited',
  'late',
  'pending',
  'scheduled',
]);

const informationStatuses = new Set(['current', 'draft', 'excused', 'published']);

function statusTone(status: string): NonNullable<BadgeProps['tone']> {
  if (dangerStatuses.has(status)) return 'danger';
  if (successStatuses.has(status)) return 'success';
  if (warningStatuses.has(status)) return 'warning';
  if (informationStatuses.has(status)) return 'info';
  return 'neutral';
}

function statusLabel(status: string): string {
  return status.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

export function StatusBadge({
  className,
  label,
  status,
}: {
  readonly className?: string;
  readonly label?: string;
  readonly status: string;
}) {
  const normalizedStatus = status.trim().toLowerCase();
  return (
    <Badge {...(className ? { className } : {})} tone={statusTone(normalizedStatus)}>
      {label ?? statusLabel(normalizedStatus)}
    </Badge>
  );
}
