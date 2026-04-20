'use client'

import { GroupForm } from '@/components/group-form'
import { GroupCreatedShare } from '@/components/group-created-share'
import { trpc } from '@/trpc/client'
import { useState } from 'react'

type Creator = {
  name: string
  clerkUserId: string
  email?: string
}

export const CreateGroup = ({ creator }: { creator: Creator }) => {
  const { mutateAsync } = trpc.groups.create.useMutation()
  const utils = trpc.useUtils()
  const [createdGroup, setCreatedGroup] = useState<{ id: string; name: string } | null>(null)

  if (createdGroup) {
    return (
      <GroupCreatedShare
        groupId={createdGroup.id}
        groupName={createdGroup.name}
      />
    )
  }

  return (
    <GroupForm
      creator={creator}
      onSubmit={async (groupFormValues) => {
        const { groupId } = await mutateAsync({ groupFormValues })
        await utils.groups.invalidate()
        // Instead of redirecting, stay on this page and show the invite-link
        // share sheet. The user can copy / share / send, then click Continue
        // to go into the group.
        setCreatedGroup({ id: groupId, name: groupFormValues.name })
      }}
    />
  )
}
