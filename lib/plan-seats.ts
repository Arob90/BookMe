import { db } from '@/lib/db'

/**
 * Allowed plan sizes (matches `Settings.max_users` and account approval plans).
 */
export const PLAN_SEAT_VALUES = [1, 5, 10] as const
export type PlanSeatValue = (typeof PLAN_SEAT_VALUES)[number]

/**
 * Prisma default when a `Settings` row exists without an explicit migration edge case.
 */
export const DEFAULT_MAX_USERS = 1

/**
 * Returns `Settings.max_users` for the business whose primary staff id is `staffId`.
 * `null` means there is no `Settings` row for that id yet (legacy or not provisioned).
 */
export async function getMaxUsersForStaffId(staffId: string): Promise<number | null> {
  const row = await db.settings.findUnique({
    where: { staffId },
    select: { maxUsers: true },
  })
  return row?.maxUsers ?? null
}

/**
 * Resolved cap for enforcement: missing settings → treat as single seat (same as schema default).
 */
export function resolveSeatCap(maxUsers: number | null): number {
  return maxUsers ?? DEFAULT_MAX_USERS
}

/**
 * When you can count active team members for an org, use this before adding another login/invite.
 * Today the app has one `User` per tenant; `memberCount` is always 1 until team membership exists.
 */
export function canAddTeamMember(args: { memberCount: number; maxUsers: number | null }): boolean {
  const cap = resolveSeatCap(args.maxUsers)
  return args.memberCount < cap
}

/**
 * ---------------------------------------------------------------------------
 * Future: real seat enforcement (sketch — not implemented)
 * ---------------------------------------------------------------------------
 *
 * **Problem today:** `User` has no `ownerId` / `organizationId`. Each business is effectively one
 * `User` row; `Settings.staffId` points at that user. You cannot count “seats used” across logins.
 *
 * **Direction A — owner link on `User`**
 * - Add `User.ownerUserId String?` (self-reference). The business owner has `ownerUserId = null`;
 *   additional staff logins have `ownerUserId = <owner’s id>`.
 * - Keep a single `Settings` row per business with `staffId = owner.id` (already true for approved signups).
 * - Enforcement: `used = 1 + await db.user.count({ where: { ownerUserId: ownerId } })` (plus pending
 *   invites if you add an `Invitation` model).
 * - Before creating a staff user or accepting an invite: `canAddTeamMember({ memberCount: used, maxUsers:
 *   await getMaxUsersForStaffId(ownerId) })`.
 *
 * **Direction B — explicit org**
 * - Add `Organization { id, name }` and `User.organizationId`; `Settings` could use `organizationId`
 *   instead of duplicating via `staffId`, or keep `staffId` as the “primary admin” for backward compatibility.
 *
 * **Invites:** store pending seats in `Invitation` with status PENDING; include pending in `used` or
 * reserve atomically in a transaction to avoid overbooking.
 *
 * ---------------------------------------------------------------------------
 */
