import { getGroup, getGroupExpensesParticipants } from '@/lib/api'
import { prisma } from '@/lib/prisma'
import { protectedProcedure } from '@/trpc/init'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'

export const getGroupDetailsProcedure = protectedProcedure
  .input(z.object({ groupId: z.string().min(1) }))
  .query(async ({ ctx, input: { groupId } }) => {
    const group = await getGroup(groupId)
    if (!group) throw new TRPCError({ code: 'NOT_FOUND', message: 'Group not found.' })
    const member = await prisma.groupMember.findUnique({
      where: { groupId_clerkUserId: { groupId, clerkUserId: ctx.userId } },
      select: { role: true },
    })
    if (!member) throw new TRPCError({ code: 'FORBIDDEN' })
    const participantsWithExpenses = await getGroupExpensesParticipants(groupId)
    return { group, participantsWithExpenses }
  })
