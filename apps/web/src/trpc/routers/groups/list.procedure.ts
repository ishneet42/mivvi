import { getGroups } from '@/lib/api'
import { protectedProcedure } from '@/trpc/init'
import { z } from 'zod'

export const listGroupsProcedure = protectedProcedure
  .input(
    z.object({
      groupIds: z.array(z.string().min(1)),
    }),
  )
  .query(async ({ ctx, input: { groupIds } }) => {
    // Filter requested ids to those the signed-in user owns.
    const groups = await getGroups(groupIds, ctx.userId)
    return { groups }
  })
