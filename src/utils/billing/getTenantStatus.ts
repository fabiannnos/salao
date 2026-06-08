export type TenantStatus = "ACTIVE" | "EXPIRING_SOON" | "EXPIRED";

export interface TenantStatusResult {
  status: TenantStatus;
  daysRemaining: number;
  daysOverdue: number;
  isGracePeriod: boolean;
}

export const GRACE_PERIOD_DAYS = 30;

function toMidnight(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function getTenantStatus(
  expirationDate?: string,
  refDate: Date = new Date()
): TenantStatusResult {
  if (!expirationDate) {
    return { status: "ACTIVE", daysRemaining: 999, daysOverdue: 0, isGracePeriod: false };
  }

  const exp = toMidnight(new Date(expirationDate + "T23:59:59"));
  const ref = toMidnight(refDate);

  const diffMs = exp.getTime() - ref.getTime();
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (daysRemaining < 0) {
    const daysOverdue = Math.abs(daysRemaining);
    return {
      status: "EXPIRED",
      daysRemaining,
      daysOverdue,
      isGracePeriod: daysOverdue <= GRACE_PERIOD_DAYS,
    };
  }
  if (daysRemaining <= 3) {
    return { status: "EXPIRING_SOON", daysRemaining, daysOverdue: 0, isGracePeriod: false };
  }
  return { status: "ACTIVE", daysRemaining, daysOverdue: 0, isGracePeriod: false };
}

export function getDaysRemaining(
  expirationDate?: string,
  refDate: Date = new Date()
): number {
  return getTenantStatus(expirationDate, refDate).daysRemaining;
}
