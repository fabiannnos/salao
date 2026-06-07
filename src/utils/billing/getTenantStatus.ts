export type TenantStatus = "ACTIVE" | "EXPIRING_SOON" | "EXPIRED";

export interface TenantStatusResult {
  status: TenantStatus;
  daysRemaining: number;
}

function toMidnight(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Retorna status de assinatura do tenant com base na data de expiração.
 *
 * Regra:
 *   - diffDays < 0  → "EXPIRED"
 *   - diffDays ≤ 3  → "EXPIRING_SOON"
 *   - diffDays > 3  → "ACTIVE"
 *
 * @param expirationDate Data no formato "YYYY-MM-DD" (ou undefined).
 * @param refDate       Data de referência (default: hoje). Útil em testes.
 */
export function getTenantStatus(
  expirationDate?: string,
  refDate: Date = new Date()
): TenantStatusResult {
  if (!expirationDate) {
    return { status: "ACTIVE", daysRemaining: 999 };
  }

  const exp = toMidnight(new Date(expirationDate + "T23:59:59"));
  const ref = toMidnight(refDate);

  const diffMs = exp.getTime() - ref.getTime();
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (daysRemaining < 0) {
    return { status: "EXPIRED", daysRemaining };
  }
  if (daysRemaining <= 3) {
    return { status: "EXPIRING_SOON", daysRemaining };
  }
  return { status: "ACTIVE", daysRemaining };
}

/**
 * Atalho para obter apenas o número de dias restantes (positivo = futuro,
 * negativo = vencido). Retorna 999 se não houver expirationDate.
 */
export function getDaysRemaining(
  expirationDate?: string,
  refDate: Date = new Date()
): number {
  return getTenantStatus(expirationDate, refDate).daysRemaining;
}
