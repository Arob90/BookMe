/** Shared (non-server-action) constants and types for the TechSupport feature. */

export const SUPPORT_REWARD_DAYS = 7
export const SUPPORT_STATUSES = ['PENDING', 'IN_PROGRESS', 'HALFWAY', 'COMPLETED'] as const

export type SupportReportView = {
  id: string
  ref: string
  title: string
  details: string | null
  status: string
  adminNote: string | null
  createdAt: string
  updatedAt: string
}
