import { SubmitButton } from '@/components/submit-button'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Locale } from '@/i18n/request'
import { getGroup } from '@/lib/api'
import { defaultCurrencyList, getCurrency } from '@/lib/currency'
import { GroupFormValues, groupFormSchema } from '@/lib/schemas'
import { zodResolver } from '@hookform/resolvers/zod'
import { Save, Trash2 } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { CurrencySelector } from './currency-selector'
import { FriendSearch } from './friend-search'
import { Textarea } from './ui/textarea'

export type Props = {
  group?: NonNullable<Awaited<ReturnType<typeof getGroup>>>
  onSubmit: (
    groupFormValues: GroupFormValues,
    participantId?: string,
  ) => Promise<void>
  protectedParticipantIds?: string[]
  /** On create, the signed-in user is auto-seeded as the first participant
   *  so new groups don't start with generic placeholder names. */
  creator?: {
    name: string
    clerkUserId: string
    email?: string
  }
}

export function GroupForm({
  group,
  onSubmit,
  protectedParticipantIds = [],
  creator,
}: Props) {
  const locale = useLocale()
  const t = useTranslations('GroupForm')
  const form = useForm<GroupFormValues>({
    resolver: zodResolver(groupFormSchema),
    defaultValues: group
      ? {
          name: group.name,
          information: group.information ?? '',
          currency: group.currency ?? '',
          currencyCode: group.currencyCode ?? '',
          // Narrow Prisma's nullable fields to the form's optional-undefined shape.
          participants: group.participants.map((p) => ({
            id: p.id,
            name: p.name,
            email: p.email ?? undefined,
            clerkUserId: p.clerkUserId ?? undefined,
          })),
        }
      : {
          name: '',
          information: '',
          currency: '',
          currencyCode: process.env.NEXT_PUBLIC_DEFAULT_CURRENCY_CODE || 'USD',
          // On create, start with just the signed-in user. If for some reason
          // no creator was passed, fall back to a single blank row so the
          // form still satisfies `participants: min(1)`.
          participants: creator
            ? [{
                name: creator.name,
                clerkUserId: creator.clerkUserId,
                email: creator.email,
              }]
            : [{ name: '' }],
        },
  })
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'participants',
    keyName: 'key',
  })

  // Note: spliit's legacy "active user" picker has been removed. With Clerk
  // auth + GroupMember.participantId we already know which participant is the
  // current user — no per-device localStorage flag needed. Other components
  // that still read the legacy localStorage key remain backward-compatible;
  // they just never have a value set here.

  // Legacy updateActiveUser() removed along with the picker.

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(async (values) => {
          await onSubmit(values, undefined)
        })}
      >
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>{t('title')}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('NameField.label')}</FormLabel>
                  <FormControl>
                    <Input
                      className="text-base"
                      placeholder={t('NameField.placeholder')}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {t('NameField.description')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="currencyCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('CurrencyCodeField.label')}</FormLabel>
                  <CurrencySelector
                    currencies={defaultCurrencyList(
                      locale as Locale,
                      t('CurrencyCodeField.customOption'),
                    )}
                    defaultValue={form.watch(field.name) ?? ''}
                    onValueChange={(newCurrency) => {
                      field.onChange(newCurrency)
                      const currency = getCurrency(newCurrency)
                      if (
                        currency.code.length ||
                        form.getFieldState('currency').isTouched
                      )
                        form.setValue('currency', currency.symbol, {
                          shouldValidate: true,
                          shouldTouch: true,
                          shouldDirty: true,
                        })
                    }}
                    isLoading={false}
                  />
                  <FormDescription>
                    {t(
                      group
                        ? 'CurrencyCodeField.editDescription'
                        : 'CurrencyCodeField.createDescription',
                    )}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem hidden={!!form.watch('currencyCode')?.length}>
                  <FormLabel>{t('CurrencyField.label')}</FormLabel>
                  <FormControl>
                    <Input
                      className="text-base"
                      placeholder={t('CurrencyField.placeholder')}
                      max={5}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {t('CurrencyField.description')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="col-span-2">
              <FormField
                control={form.control}
                name="information"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('InformationField.label')}</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={2}
                        className="text-base"
                        {...field}
                        placeholder={t('InformationField.placeholder')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="mb-4">
          <CardHeader>
            <CardTitle>{t('Participants.title')}</CardTitle>
            <CardDescription>{t('Participants.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Search existing Mivvi users by @username. Selecting one appends
                a participant row with clerkUserId stashed — server-side
                createGroup auto-creates a GroupMember for them. */}
            <div className="mb-4">
              <div className="text-sm font-medium mb-1">Add friends by username</div>
              <FriendSearch
                alreadyAddedIds={fields
                  .map((f) => (f as unknown as { clerkUserId?: string }).clerkUserId)
                  .filter((x): x is string => !!x)}
                onSelect={(u) => {
                  append({
                    name: u.displayName || u.username,
                    clerkUserId: u.clerkUserId,
                  })
                }}
              />
              <p className="text-xs opacity-60 mt-1">
                Already on Mivvi? Searching adds them — they&apos;ll see this group
                next time they open the app. Not on Mivvi yet? Just type their
                name below.
              </p>
            </div>
            <ul className="flex flex-col gap-2">
              {fields.map((item, index) => (
                <li key={item.key}>
                  <FormField
                    control={form.control}
                    name={`participants.${index}.name`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="sr-only">
                          Participant #{index + 1}
                        </FormLabel>
                        <FormControl>
                          <div className="flex gap-2">
                            <Input
                              className="text-base"
                              {...field}
                              placeholder={t('Participants.new')}
                            />
                            {item.id &&
                            protectedParticipantIds.includes(item.id) ? (
                              <HoverCard>
                                <HoverCardTrigger>
                                  <Button
                                    variant="ghost"
                                    className="text-destructive-"
                                    type="button"
                                    size="icon"
                                    disabled
                                  >
                                    <Trash2 className="w-4 h-4 text-destructive opacity-50" />
                                  </Button>
                                </HoverCardTrigger>
                                <HoverCardContent
                                  align="end"
                                  className="text-sm"
                                >
                                  {t('Participants.protectedParticipant')}
                                </HoverCardContent>
                              </HoverCard>
                            ) : (
                              <Button
                                variant="ghost"
                                className="text-destructive"
                                onClick={() => remove(index)}
                                type="button"
                                size="icon"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter>
            <Button
              variant="secondary"
              onClick={() => {
                append({ name: '' })
              }}
              type="button"
            >
              {t('Participants.add')}
            </Button>
          </CardFooter>
        </Card>

        {/* "Active user" picker removed — with Clerk auth + GroupMember, the
            current user is known automatically. */}

        {/* Hint shown only on create, so the user knows invite link is one
            click away and appears right after they hit Create. */}
        {!group && (
          <div className="mb-4 rounded-xl border border-[rgba(26,20,16,0.08)] bg-[rgba(203,212,188,0.35)] px-4 py-3 text-sm flex items-start gap-3">
            <span aria-hidden>🔗</span>
            <span className="opacity-80">
              <strong>After you create the group, you&apos;ll get a shareable invite link</strong>{' '}
              you can copy or send. Friends you added above are already in — the link is
              for anyone else.
            </span>
          </div>
        )}

        <div className="flex mt-4 gap-2">
          <SubmitButton
            loadingContent={t(group ? 'Settings.saving' : 'Settings.creating')}
          >
            <Save className="w-4 h-4 mr-2" />{' '}
            {t(group ? 'Settings.save' : 'Settings.create')}
          </SubmitButton>
          {!group && (
            <Button variant="ghost" asChild>
              <Link href="/groups">{t('Settings.cancel')}</Link>
            </Button>
          )}
        </div>
      </form>
    </Form>
  )
}
