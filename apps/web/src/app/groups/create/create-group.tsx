'use client'

import { GroupForm } from '@/components/group-form'
import { trpc } from '@/trpc/client'
import { useRouter } from 'next/navigation'

export const CreateGroup = () => {
  const { mutateAsync } = trpc.groups.create.useMutation()
  const utils = trpc.useUtils()
  const router = useRouter()

  return (
    <GroupForm
      onSubmit={async (groupFormValues) => {
        const { groupId } = await mutateAsync({ groupFormValues })
        await utils.groups.invalidate()
        // Land on Members so the owner sees the invite link + any friends
        // they added by @username.
        router.push(`/groups/${groupId}/members`)
      }}
    />
  )
}
