import { useCallback, useMemo, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { ChevronLeft, CircleAlert, Inbox, RefreshCw, WifiOff } from 'lucide-react-native'
import { MobileSearchField } from '../components/controls/MobileSearchField'
import {
  MobileLoadErrorState,
  MobileNoMatchState,
  MobileOfflineState,
  MobileStateView
} from '../components/feedback/MobileStateView'
import { NavBar } from '../components/nav-bar/NavBar'
import { NavBarButton } from '../components/nav-bar/NavBarButton'
import { useMobileTranslation } from '../i18n/use-mobile-translation'
import { triggerSelection } from '../platform/haptics/haptics'
import { pressedStyle } from '../theme/mobile-theme'
import { useThemedStyles } from '../theme/themed-styles'
import { useMobileColors } from '../theme/use-mobile-color-scheme'
import { MobileWorkBoardDetailSheet } from './MobileWorkBoardDetailSheet'
import { MobileWorkBoardList } from './MobileWorkBoardList'
import {
  buildWorkBoardListEntries,
  classifyWorkBoardError,
  collectGroups,
  formatGroupLabel,
  projectWorkBoard,
  selectInitialStatus,
  statusDotColor,
  workBoardStatusLabel,
  type MobileWorkBoardProps,
  type MobileWorkBoardStatus
} from './work-board-model'
import { workBoardStylesSheet } from './work-board-styles'

export {
  WORK_BOARD_ACTIVE_STATUSES,
  WORK_BOARD_HISTORY_STATUSES,
  WORK_BOARD_STATUSES,
  type MobileWorkBoardItem,
  type MobileWorkBoardPriority,
  type MobileWorkBoardProps,
  type MobileWorkBoardStatus,
  type WorkBoardCounts,
  type WorkBoardErrorKind,
  type WorkBoardGroupSection
} from './work-board-model'

const STATUS_ROWS: readonly (readonly MobileWorkBoardStatus[])[] = [
  ['todo', 'in_progress', 'in_review'],
  ['pending', 'done', 'canceled']
]

export function MobileWorkBoard({
  items,
  loading,
  error,
  onRefresh,
  onBack,
  disconnected,
  hostName
}: MobileWorkBoardProps) {
  const t = useMobileTranslation()
  const colors = useMobileColors()
  const styles = useThemedStyles(workBoardStylesSheet)
  const insets = useSafeAreaInsets()

  const [pickedStatus, setPickedStatus] = useState<MobileWorkBoardStatus | null>(null)
  const [query, setQuery] = useState('')
  const [pickedGroup, setPickedGroup] = useState<string | null | undefined>(undefined)
  const [collapsed, setCollapsed] = useState<Record<string, readonly string[]>>({})
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)

  const trimmedQuery = query.trim()
  const errorKind = classifyWorkBoardError(error, disconnected)
  const selectedStatus = useMemo(
    () => pickedStatus ?? selectInitialStatus(items),
    [items, pickedStatus]
  )
  const allGroups = useMemo(() => collectGroups(items), [items])
  const selectedGroup =
    pickedGroup !== undefined && allGroups.includes(pickedGroup) ? pickedGroup : undefined

  const projection = useMemo(
    () => projectWorkBoard(items, { status: selectedStatus, query, selectedGroup, t }),
    [items, selectedStatus, query, selectedGroup, t]
  )

  const selectedItem = useMemo(
    () => (selectedItemId ? (items.find((entry) => entry.id === selectedItemId) ?? null) : null),
    [items, selectedItemId]
  )

  const collapseBucket = trimmedQuery ? `q:${trimmedQuery}` : selectedStatus
  const closedKeys = useMemo(
    () => new Set(collapsed[collapseBucket] ?? []),
    [collapsed, collapseBucket]
  )

  const listEntries = useMemo(
    () => buildWorkBoardListEntries(projection.groups, selectedStatus, closedKeys),
    [closedKeys, projection.groups, selectedStatus]
  )

  const selectStatus = useCallback(
    (status: MobileWorkBoardStatus) => {
      if (selectedStatus !== status) {
        triggerSelection()
      }
      setPickedStatus(status)
    },
    [selectedStatus]
  )

  const toggleGroup = useCallback(
    (groupKey: string) => {
      triggerSelection()
      setCollapsed((current) => {
        const list = current[collapseBucket] ?? []
        const next = list.includes(groupKey)
          ? list.filter((entry) => entry !== groupKey)
          : [...list, groupKey]
        return { ...current, [collapseBucket]: next }
      })
    },
    [collapseBucket]
  )

  const allClosed =
    projection.groups.length > 0 && projection.groups.every((s) => closedKeys.has(s.key))

  const toggleAllGroups = useCallback(() => {
    triggerSelection()
    const next = allClosed ? [] : projection.groups.map((section) => section.key)
    setCollapsed((current) => ({ ...current, [collapseBucket]: next }))
  }, [allClosed, collapseBucket, projection.groups])

  const clearFilters = useCallback(() => {
    setQuery('')
    setPickedGroup(undefined)
  }, [])

  const host = typeof hostName === 'string' ? hostName.trim() : ''
  const subtitle = useMemo(() => {
    const active = t('workBoard.subtitleActive', '{{count}} active', {
      count: projection.activeCount
    })
    if (host) {
      return `${host} · ${active}`
    }
    return t('workBoard.subtitleSummary', '{{active}} active · {{total}} total', {
      active: projection.activeCount,
      total: projection.totalCount
    })
  }, [host, projection.activeCount, projection.totalCount, t])

  const statusLabel = workBoardStatusLabel(selectedStatus, t)
  const hasFilters = trimmedQuery.length > 0 || selectedGroup !== undefined
  const showGroups =
    items.length > 0 && (allGroups.length > 1 || (allGroups.length === 1 && allGroups[0] !== null))

  return (
    <SafeAreaView style={styles.screen} edges={['top']} testID="mobile-work-board">
      <NavBar
        leading={
          <NavBarButton
            icon={ChevronLeft}
            accessibilityLabel={t('common.back', 'Back')}
            onPress={onBack}
          />
        }
        title={t('workBoard.title', 'Task Center')}
        subtitle={subtitle}
        trailing={
          <NavBarButton
            icon={RefreshCw}
            accessibilityLabel={t('common.refresh', 'Refresh')}
            onPress={onRefresh}
            disabled={loading}
          />
        }
        refreshing={loading && items.length > 0}
      />

      {items.length > 0 && errorKind !== null ? (
        <View
          style={[
            styles.banner,
            errorKind === 'disconnected' ? styles.bannerOffline : styles.bannerError
          ]}
          testID="work-board-status-banner"
        >
          {errorKind === 'disconnected' ? (
            <WifiOff size={15} color={colors.statusAmber} strokeWidth={2} />
          ) : (
            <CircleAlert size={15} color={colors.statusRed} strokeWidth={2} />
          )}
          <View style={styles.bannerCopy}>
            <Text style={styles.bannerTitle} numberOfLines={1}>
              {errorKind === 'disconnected'
                ? t('workBoard.offlineTitle', 'Host disconnected')
                : t('workBoard.refreshFailed', 'Refresh failed')}
            </Text>
            <Text style={styles.bannerDetail} numberOfLines={2}>
              {error?.trim() || t('workBoard.cachedNotice', 'Showing cached data.')}
            </Text>
          </View>
          <Pressable
            onPress={onRefresh}
            disabled={loading}
            accessibilityRole="button"
            testID="work-board-banner-retry"
            style={({ pressed }) => [
              styles.retryButton,
              pressed && pressedStyle,
              loading && styles.disabled
            ]}
          >
            <Text style={styles.retryText}>
              {errorKind === 'disconnected'
                ? t('common.offline.reconnect', 'Reconnect')
                : t('common.retry', 'Retry')}
            </Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.controls}>
        {items.length > 0 ? (
          <View style={styles.searchWrap}>
            <MobileSearchField
              value={query}
              onChangeText={setQuery}
              placeholder={t('workBoard.searchPlaceholder', 'Search ID, title, group, or repo')}
            />
          </View>
        ) : null}

        <View style={styles.statusGrid} accessibilityRole="tablist">
          {STATUS_ROWS.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.statusRow}>
              {row.map((status) => {
                const selected = status === selectedStatus
                const count = projection.counts[status]
                const dot = statusDotColor(status, colors)
                const label = workBoardStatusLabel(status, t)
                return (
                  <Pressable
                    key={status}
                    onPress={() => selectStatus(status)}
                    accessibilityRole="tab"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`${label} ${count}`}
                    testID={`work-board-status-${status}`}
                    style={({ pressed }) => [
                      styles.statusTile,
                      selected && [styles.statusTileActive, { borderColor: dot }],
                      pressed && !selected && pressedStyle
                    ]}
                  >
                    <View style={styles.statusTileHead}>
                      <View style={[styles.dot, { backgroundColor: dot }]} />
                      <Text
                        style={[styles.statusLabel, selected && styles.statusLabelActive]}
                        numberOfLines={1}
                      >
                        {label}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.statusCount,
                        selected && styles.statusCountActive,
                        count === 0 && !selected && styles.statusCountZero
                      ]}
                    >
                      {count}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          ))}
        </View>

        {showGroups ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            alwaysBounceHorizontal={false}
            contentContainerStyle={styles.groupStrip}
          >
            {[undefined, ...allGroups].map((group) => {
              const active = selectedGroup === group
              const label =
                group === undefined
                  ? t('workBoard.allGroups', 'All groups')
                  : formatGroupLabel(group, t)
              return (
                <Pressable
                  key={group === undefined ? '__all__' : JSON.stringify(group)}
                  onPress={() => {
                    triggerSelection()
                    setPickedGroup(active ? undefined : group)
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={styles.pillTouch}
                >
                  {({ pressed }) => (
                    <View
                      style={[styles.pill, active && styles.pillActive, pressed && pressedStyle]}
                    >
                      <Text
                        style={[styles.pillText, active && styles.pillTextActive]}
                        numberOfLines={1}
                      >
                        {label}
                      </Text>
                    </View>
                  )}
                </Pressable>
              )
            })}
          </ScrollView>
        ) : null}
      </View>

      <View style={styles.body}>
        {items.length === 0 ? (
          loading && !errorKind ? (
            <MobileStateView
              loading
              title={t('workBoard.loading', 'Loading board…')}
              bottomInset={insets.bottom}
            />
          ) : errorKind === 'disconnected' ? (
            <MobileOfflineState
              hostName={host || null}
              message={error?.trim() || undefined}
              onReconnect={onRefresh}
              bottomInset={insets.bottom}
            />
          ) : errorKind === 'error' ? (
            <MobileLoadErrorState error={error} onRetry={onRefresh} bottomInset={insets.bottom} />
          ) : (
            <MobileStateView
              icon={Inbox}
              title={t('workBoard.emptyTitle', 'No tasks yet')}
              message={t('workBoard.emptyMessage', 'Refresh after creating tasks on desktop.')}
              action={{ label: t('common.refresh', 'Refresh'), onPress: onRefresh }}
              bottomInset={insets.bottom}
            />
          )
        ) : projection.filteredCount === 0 ? (
          <MobileNoMatchState onClear={clearFilters} bottomInset={insets.bottom} />
        ) : projection.activeItems.length === 0 ? (
          <MobileStateView
            icon={Inbox}
            title={t('workBoard.emptyStatus', 'No {{status}} tasks', { status: statusLabel })}
            action={
              hasFilters
                ? { label: t('common.noMatch.clearSearch', 'Clear search'), onPress: clearFilters }
                : null
            }
            bottomInset={insets.bottom}
          >
            {projection.otherMatches.length > 0 ? (
              <View style={styles.jumpRow}>
                {projection.otherMatches.map((match) => (
                  <Pressable
                    key={match.status}
                    onPress={() => selectStatus(match.status)}
                    accessibilityRole="button"
                    testID={`work-board-jump-${match.status}`}
                    style={({ pressed }) => [styles.jumpChip, pressed && pressedStyle]}
                  >
                    <View
                      style={[
                        styles.dot,
                        { backgroundColor: statusDotColor(match.status, colors) }
                      ]}
                    />
                    <Text style={styles.jumpText}>
                      {`${workBoardStatusLabel(match.status, t)} ${match.count}`}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </MobileStateView>
        ) : (
          <MobileWorkBoardList
            entries={listEntries}
            loading={loading}
            bottomInset={insets.bottom}
            statusLabel={statusLabel}
            hasMultipleGroups={projection.groups.length > 1}
            allClosed={allClosed}
            onRefresh={onRefresh}
            onToggleGroup={toggleGroup}
            onToggleAll={toggleAllGroups}
            onSelectItem={setSelectedItemId}
          />
        )}
      </View>

      <MobileWorkBoardDetailSheet item={selectedItem} onClose={() => setSelectedItemId(null)} />
    </SafeAreaView>
  )
}
