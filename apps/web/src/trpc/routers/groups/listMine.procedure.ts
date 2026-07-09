import { getGroupsForUser } from '@/lib/api'
import { protectedProcedure } from '@/trpc/init'

// Server-backed membership list. The /groups dashboard used to be seeded
// from localStorage recents only, so a group you were added to (by
// username, or via a join code on another device) never showed up until
// you had visited its URL once. This returns every group the signed-in
// user is a member of, regardless of visit history.
export const listMineGroupsProcedure = protectedProcedure.query(
  async ({ ctx }) => {
    const groups = await getGroupsForUser(ctx.userId)
    return { groups }
  },
)
