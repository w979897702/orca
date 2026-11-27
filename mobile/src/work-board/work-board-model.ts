import type { Translate } from '../i18n/mobile-i18n'
import type { MobilePalette } from '../theme/mobile-theme'

export const WORK_BOARD_ACTIVE_STATUSES = ['todo', 'in_progress', 'in_review', 'pending'] as const
export const WORK_BOARD_HISTORY_STATUSES = ['done', 'canceled'] as const
export const WORK_BOARD_STATUSES = [
  ...WORK_BOARD_ACTIVE_STATUSES,
  ...WORK_BOARD_HISTORY_STATUSES
] as const

export type MobileWorkBoardStatus = (typeof WORK_BOARD_STATUSES)[number]
export type MobileWorkBoardPriority = 'none' | 'low' | 'medium' | 'high' | 'urgent'

export type MobileWorkBoardItem = {
  id: string
  identifier: string
  title: string
  status: MobileWorkBoardStatus
  priority: MobileWorkBoardPriority
  group: string | null
  repos: readonly string[]
}

export type MobileWorkBoardProps = {
  items: readonly MobileWorkBoardItem[]
  loading: boolean
  error: string | null
  onRefresh: () => void
  onBack: () => void
  disconnected?: boolean
  hostName?: string | null
}

export type WorkBoardCounts = Record<MobileWorkBoardStatus, number>
export type WorkBoardErrorKind = 'disconnected' | 'error'
export type WorkBoardGroupSection = {
  key: string
  group: string | null
  label: string
  items: readonly MobileWorkBoardItem[]
}

export type WorkBoardProjection = {
  totalCount: number
  activeCount: number
  filteredCount: number
  counts: WorkBoardCounts
  activeItems: readonly MobileWorkBoardItem[]
  groups: readonly WorkBoardGroupSection[]
  otherMatches: readonly { status: MobileWorkBoardStatus; count: number }[]
}

const PRIORITY_ORDER: Record<MobileWorkBoardPriority, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
  none: 4
}

const INITIAL_ORDER: readonly MobileWorkBoardStatus[] = [
  'in_review',
  'in_progress',
  'todo',
  'pending',
  'done',
  'canceled'
]

const ACTIVE_SET = new Set<string>(WORK_BOARD_ACTIVE_STATUSES)
const DISCONNECT_RE =
  /断开|断连|离线|未连接|连接失败|\b(disconnect(?:ed)?|offline|unreachable|econnrefused|econnreset|etimedout|socket)\b/i

export function workBoardStatusLabel(status: MobileWorkBoardStatus, t: Translate): string {
  switch (status) {
    case 'todo':
      return t('workBoard.status.todo', 'To do')
    case 'in_progress':
      return t('workBoard.status.in_progress', 'In progress')
    case 'in_review':
      return t('workBoard.status.in_review', 'In review')
    case 'pending':
      return t('workBoard.status.pending', 'On hold')
    case 'done':
      return t('workBoard.status.done', 'Done')
    case 'canceled':
      return t('workBoard.status.canceled', 'Canceled')
  }
}

export function workBoardPriorityLabel(priority: MobileWorkBoardPriority, t: Translate): string {
  switch (priority) {
    case 'urgent':
      return t('workBoard.priority.urgent', 'Urgent')
    case 'high':
      return t('workBoard.priority.high', 'High')
    case 'medium':
      return t('workBoard.priority.medium', 'Medium')
    case 'low':
      return t('workBoard.priority.low', 'Low')
    case 'none':
      return t('workBoard.priority.none', 'None')
  }
}

export function statusDotColor(status: MobileWorkBoardStatus, colors: MobilePalette): string {
  const map: Record<MobileWorkBoardStatus, string> = {
    todo: colors.textSecondary,
    in_progress: colors.accentBlue,
    in_review: colors.agentQuestion,
    pending: colors.statusAmber,
    done: colors.statusGreen,
    canceled: colors.textMuted
  }
  return map[status]
}

export function priorityTone(
  priority: MobileWorkBoardPriority,
  colors: MobilePalette
): { text: string; tint: string; border: string } {
  const map: Record<MobileWorkBoardPriority, { text: string; tint: string; border: string }> = {
    urgent: { text: colors.statusRed, tint: colors.diffDeletedBg, border: colors.statusRed },
    high: {
      text: colors.agentQuestionText,
      tint: colors.agentQuestionTint,
      border: colors.agentQuestion
    },
    medium: { text: colors.statusAmber, tint: colors.bgRaised, border: colors.statusAmber },
    low: { text: colors.skillToken, tint: colors.skillTokenSurface, border: colors.accentBlue },
    none: { text: colors.textMuted, tint: colors.bgRaised, border: colors.borderSubtle }
  }
  return map[priority]
}

export function normalizeGroup(group: string | null | undefined): string | null {
  const trimmed = typeof group === 'string' ? group.trim() : ''
  return trimmed || null
}

export function formatGroupLabel(group: string | null, t: Translate): string {
  return group ?? t('workBoard.ungrouped', 'Ungrouped')
}

export function normalizeRepos(repos: readonly string[] | null | undefined): string[] {
  if (!Array.isArray(repos)) {
    return []
  }
  const seen = new Set<string>()
  const out: string[] = []
  for (const entry of repos) {
    const trimmed = typeof entry === 'string' ? entry.trim() : ''
    if (trimmed && !seen.has(trimmed)) {
      seen.add(trimmed)
      out.push(trimmed)
    }
  }
  return out
}

export function classifyWorkBoardError(
  error: string | null | undefined,
  disconnected?: boolean
): WorkBoardErrorKind | null {
  if (disconnected === true) {
    return 'disconnected'
  }
  const trimmed = typeof error === 'string' ? error.trim() : ''
  if (!trimmed) {
    return null
  }
  return DISCONNECT_RE.test(trimmed) ? 'disconnected' : 'error'
}

export function selectInitialStatus(items: readonly MobileWorkBoardItem[]): MobileWorkBoardStatus {
  for (const status of INITIAL_ORDER) {
    if (items.some((item) => item.status === status)) {
      return status
    }
  }
  return 'in_review'
}

export function collectGroups(items: readonly MobileWorkBoardItem[]): readonly (string | null)[] {
  const named = new Set<string>()
  let hasUngrouped = false
  for (const item of items) {
    const group = normalizeGroup(item.group)
    if (group === null) {
      hasUngrouped = true
    } else {
      named.add(group)
    }
  }
  const sorted = [...named].sort((left, right) => left.localeCompare(right, 'zh-CN'))
  return hasUngrouped ? [...sorted, null] : sorted
}

export type WorkBoardListEntry =
  | { type: 'group'; key: string; groupKey: string; label: string; count: number; closed: boolean }
  | { type: 'item'; key: string; item: MobileWorkBoardItem }

export function buildWorkBoardListEntries(
  groups: readonly WorkBoardGroupSection[],
  status: MobileWorkBoardStatus,
  closedKeys: ReadonlySet<string>
): WorkBoardListEntry[] {
  const rows: WorkBoardListEntry[] = []
  for (const section of groups) {
    const closed = closedKeys.has(section.key)
    rows.push({
      type: 'group',
      key: `g:${status}:${section.key}`,
      groupKey: section.key,
      label: section.label,
      count: section.items.length,
      closed
    })
    if (!closed) {
      for (const item of section.items) {
        rows.push({ type: 'item', key: `i:${item.id}`, item })
      }
    }
  }
  return rows
}

export function projectWorkBoard(
  items: readonly MobileWorkBoardItem[],
  options: {
    status: MobileWorkBoardStatus
    query: string
    selectedGroup: string | null | undefined
    t: Translate
  }
): WorkBoardProjection {
  const query = options.query.trim().toLocaleLowerCase()
  const counts: WorkBoardCounts = {
    todo: 0,
    in_progress: 0,
    in_review: 0,
    pending: 0,
    done: 0,
    canceled: 0
  }
  let activeCount = 0
  const filtered: MobileWorkBoardItem[] = []

  for (const item of items) {
    if (ACTIVE_SET.has(item.status)) {
      activeCount += 1
    }
    const group = normalizeGroup(item.group)
    if (options.selectedGroup !== undefined && group !== options.selectedGroup) {
      continue
    }
    if (query) {
      const haystack = [
        item.identifier,
        item.title,
        formatGroupLabel(group, options.t),
        workBoardStatusLabel(item.status, options.t),
        workBoardPriorityLabel(item.priority, options.t),
        ...normalizeRepos(item.repos)
      ]
      if (!haystack.some((value) => value.toLocaleLowerCase().includes(query))) {
        continue
      }
    }
    counts[item.status] += 1
    filtered.push(item)
  }

  const activeItems = filtered.filter((item) => item.status === options.status)
  const byGroup = new Map<string | null, MobileWorkBoardItem[]>()
  for (const item of activeItems) {
    const group = normalizeGroup(item.group)
    const bucket = byGroup.get(group)
    if (bucket) {
      bucket.push(item)
    } else {
      byGroup.set(group, [item])
    }
  }

  const orderedKeys = [...byGroup.keys()].sort((left, right) => {
    if (left === right) {
      return 0
    }
    if (left === null) {
      return 1
    }
    if (right === null) {
      return -1
    }
    return left.localeCompare(right, 'zh-CN')
  })

  const groups: WorkBoardGroupSection[] = orderedKeys.map((group) => ({
    key: JSON.stringify(group),
    group,
    label: formatGroupLabel(group, options.t),
    items: [...(byGroup.get(group) ?? [])].sort(
      (left, right) => (PRIORITY_ORDER[left.priority] ?? 4) - (PRIORITY_ORDER[right.priority] ?? 4)
    )
  }))

  const otherMatches =
    activeItems.length === 0 && filtered.length > 0
      ? WORK_BOARD_STATUSES.filter((status) => status !== options.status && counts[status] > 0).map(
          (status) => ({ status, count: counts[status] })
        )
      : []

  return {
    totalCount: items.length,
    activeCount,
    filteredCount: filtered.length,
    counts,
    activeItems,
    groups,
    otherMatches
  }
}
