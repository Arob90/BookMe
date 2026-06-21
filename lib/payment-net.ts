/** Payment row: positive `amount`; refunds use `isRefund: true` (amount still positive). */

export type PaymentLike = {
  amount?: unknown
  isRefund?: boolean | null
}

export function signedPaymentAmount(p: PaymentLike): number {
  const raw = Number(p.amount ?? 0)
  if (!Number.isFinite(raw)) return 0
  const a = Math.abs(raw)
  return p.isRefund ? -a : a
}

/** Net money applied to the appointment balance (payments minus refunds). */
export function netPaymentsTotal(payments: PaymentLike[] | undefined | null): number {
  if (!payments?.length) return 0
  return payments.reduce((sum, p) => sum + signedPaymentAmount(p), 0)
}

/** Sum of payment rows only (excludes refunds). */
export function grossPaymentsTotal(payments: PaymentLike[] | undefined | null): number {
  if (!payments?.length) return 0
  return payments.reduce((sum, p) => {
    if (p.isRefund) return sum
    const raw = Number(p.amount ?? 0)
    return sum + (Number.isFinite(raw) ? Math.abs(raw) : 0)
  }, 0)
}

/** Sum of refund amounts (positive number). */
export function refundsTotal(payments: PaymentLike[] | undefined | null): number {
  if (!payments?.length) return 0
  return payments.reduce((sum, p) => {
    if (!p.isRefund) return sum
    const raw = Number(p.amount ?? 0)
    return sum + (Number.isFinite(raw) ? Math.abs(raw) : 0)
  }, 0)
}

/**
 * Amount the client still owes toward the invoice.
 * Uses gross payments only so a refund after the visit was fully paid does not create a fake balance.
 */
export function invoiceBalanceDue(
  totalPrice: number,
  payments: PaymentLike[] | undefined | null
): number {
  const tp = Number(totalPrice)
  if (!Number.isFinite(tp) || tp <= 0) return 0
  return Math.max(0, tp - grossPaymentsTotal(payments))
}
