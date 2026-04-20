import { notFound } from 'next/navigation'
import { clerkClient } from '@clerk/nextjs/server'
import { p } from '@/lib/prisma'
import { requireUser } from '@/lib/authz'
import { MembersClient } from './members-client'

export default async function MembersPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params
  const userId = await requireUser()

  const group = await p.group.findUnique({
    where: { id: groupId },
    include: {
      members: true,
      participants: { orderBy: { name: 'asc' } },
      invites: {
        where: {
          revokedAt: null,
          expiresAt: { gt: new Date() },
          code: { not: null },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  })
  if (!group) notFound()
  const my = group.members.find((m) => m.clerkUserId === userId)
  if (!my) notFound()

  // Load Mivvi profiles + Clerk photos for every member so the list can show
  // proper avatars and usernames instead of raw Clerk IDs.
  const memberUserIds = group.members.map((m) => m.clerkUserId)
  const profiles = await p.userProfile.findMany({
    where: { clerkUserId: { in: memberUserIds } },
    select: { clerkUserId: true, username: true, displayName: true, avatarPreset: true, avatarEmoji: true },
  })
  const profileByUserId = new Map(profiles.map((pp) => [pp.clerkUserId, pp]))

  // Best-effort Clerk lookup for avatar URLs; failures fall back to presets.
  const clerkPhotoByUserId = new Map<string, string | null>()
  try {
    const client = await clerkClient()
    const { data: users } = await client.users.getUserList({ userId: memberUserIds })
    for (const u of users) clerkPhotoByUserId.set(u.id, u.imageUrl ?? null)
  } catch { /* non-fatal: members still render with preset avatars */ }

  return (
    <MembersClient
      groupId={group.id}
      groupName={group.name}
      currentUserId={userId}
      currentRole={my.role as 'OWNER' | 'ADMIN' | 'MEMBER'}
      members={group.members.map((m) => {
        const pr = profileByUserId.get(m.clerkUserId)
        return {
          id: m.id,
          clerkUserId: m.clerkUserId,
          role: m.role as 'OWNER' | 'ADMIN' | 'MEMBER',
          participantId: m.participantId,
          username: pr?.username ?? null,
          displayName: pr?.displayName ?? null,
          avatarPreset: pr?.avatarPreset ?? null,
          avatarEmoji: pr?.avatarEmoji ?? null,
          clerkImageUrl: clerkPhotoByUserId.get(m.clerkUserId) ?? null,
        }
      })}
      participants={group.participants.map((pp) => ({
        id: pp.id, name: pp.name, email: pp.email, claimed: !!pp.clerkUserId, claimedBy: pp.clerkUserId,
      }))}
      invites={group.invites
        .filter((inv) => inv.code && inv.usedCount < inv.maxUses)
        .map((inv) => ({
          id: inv.id,
          code: inv.code as string,
          maxUses: inv.maxUses,
          usedCount: inv.usedCount,
          expiresAt: inv.expiresAt.toISOString(),
        }))}
    />
  )
}
