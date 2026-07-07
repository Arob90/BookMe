/** Shared (non-server-action) constants and types for the Ideas feature. */

/** Default free days we grant when an idea is applied. */
export const IDEA_REWARD_DAYS = 30

export type IdeaUpdate = { at: string; progress: number; note: string | null }

export type PublicIdea = {
  id: string
  ref: string
  title: string
  details: string | null
  status: string
  progress: number
  publicNote: string | null
  updates: IdeaUpdate[]
  createdAt: string
  updatedAt: string
}
