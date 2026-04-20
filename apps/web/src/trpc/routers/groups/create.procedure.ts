import { createGroup } from '@/lib/api'
import { groupFormSchema } from '@/lib/schemas'
import { protectedProcedure } from '@/trpc/init'
import { z } from 'zod'

export const createGroupProcedure = protectedProcedure
  .input(
    z.object({
      groupFormValues: groupFormSchema,
    }),
  )
  .mutation(async ({ ctx, input: { groupFormValues } }) => {
    // Signed-in user becomes the owner of the new group.
    const group = await createGroup(groupFormValues, ctx.userId)
    return { groupId: group.id }
  })
