import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native'
import { ChevronDown, ChevronRight, GitBranch } from 'lucide-react-native'
import { useMobileTranslation } from '../i18n/use-mobile-translation'
import { pressedStyle, spacing } from '../theme/mobile-theme'
import { useThemedStyles } from '../theme/themed-styles'
import { useMobileColors } from '../theme/use-mobile-color-scheme'
import {
  normalizeRepos,
  priorityTone,
  workBoardPriorityLabel,
  type WorkBoardListEntry
} from './work-board-model'
import { workBoardStylesSheet } from './work-board-styles'

const MAX_CARD_REPOS = 4

export function MobileWorkBoardList({
  entries,
  loading,
  bottomInset,
  statusLabel,
  hasMultipleGroups,
  allClosed,
  onRefresh,
  onToggleGroup,
  onToggleAll,
  onSelectItem
}: {
  entries: readonly WorkBoardListEntry[]
  loading: boolean
  bottomInset: number
  statusLabel: string
  hasMultipleGroups: boolean
  allClosed: boolean
  onRefresh: () => void
  onToggleGroup: (groupKey: string) => void
  onToggleAll: () => void
  onSelectItem: (id: string) => void
}) {
  const t = useMobileTranslation()
  const colors = useMobileColors()
  const styles = useThemedStyles(workBoardStylesSheet)

  return (
    <FlatList
      data={entries}
      keyExtractor={(entry) => entry.key}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[styles.list, { paddingBottom: spacing.xl + bottomInset }]}
      refreshControl={
        <RefreshControl
          refreshing={loading}
          onRefresh={onRefresh}
          tintColor={colors.textSecondary}
          colors={[colors.accentBlue]}
        />
      }
      ListHeaderComponent={
        hasMultipleGroups ? (
          <View style={styles.listToolbar}>
            <Text style={styles.toolbarTitle}>{statusLabel}</Text>
            <Pressable
              onPress={onToggleAll}
              hitSlop={8}
              accessibilityRole="button"
              style={({ pressed }) => [styles.toolbarAction, pressed && pressedStyle]}
            >
              <Text style={styles.toolbarActionText}>
                {allClosed
                  ? t('workBoard.expandAll', 'Expand all')
                  : t('workBoard.collapseAll', 'Collapse all')}
              </Text>
            </Pressable>
          </View>
        ) : undefined
      }
      renderItem={({ item: entry }) => {
        if (entry.type === 'group') {
          return (
            <Pressable
              onPress={() => onToggleGroup(entry.groupKey)}
              accessibilityRole="button"
              accessibilityState={{ expanded: !entry.closed }}
              testID={`work-board-group-${entry.label}`}
              style={({ pressed }) => [styles.groupHeader, pressed && pressedStyle]}
            >
              {entry.closed ? (
                <ChevronRight size={15} color={colors.textMuted} strokeWidth={2.2} />
              ) : (
                <ChevronDown size={15} color={colors.textMuted} strokeWidth={2.2} />
              )}
              <Text style={styles.groupTitle} numberOfLines={1}>
                {entry.label}
              </Text>
              <View style={styles.countPill}>
                <Text style={styles.countPillText}>{entry.count}</Text>
              </View>
            </Pressable>
          )
        }
        const { item } = entry
        const pTone = priorityTone(item.priority, colors)
        const repos = normalizeRepos(item.repos)
        const visibleRepos = repos.slice(0, MAX_CARD_REPOS)
        const overflow = repos.length - visibleRepos.length
        return (
          <Pressable
            onPress={() => onSelectItem(item.id)}
            accessibilityRole="button"
            testID={`work-board-card-${item.id}`}
            style={({ pressed }) => [styles.card, pressed && pressedStyle]}
          >
            <View style={styles.cardTop}>
              <View style={styles.cardMeta}>
                <Text style={styles.identifier} numberOfLines={1}>
                  {item.identifier}
                </Text>
                {item.priority !== 'none' ? (
                  <View
                    style={[
                      styles.priorityBadge,
                      { backgroundColor: pTone.tint, borderColor: pTone.border }
                    ]}
                  >
                    <Text style={[styles.priorityText, { color: pTone.text }]}>
                      {workBoardPriorityLabel(item.priority, t)}
                    </Text>
                  </View>
                ) : null}
              </View>
              <ChevronRight size={15} color={colors.textMuted} strokeWidth={2.1} />
            </View>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {item.title}
            </Text>
            {visibleRepos.length > 0 ? (
              <View style={styles.repoRow}>
                {visibleRepos.map((repo) => (
                  <View key={repo} style={styles.repoChip}>
                    <GitBranch size={11} color={colors.textMuted} strokeWidth={2.1} />
                    <Text style={styles.repoText} numberOfLines={1}>
                      {repo}
                    </Text>
                  </View>
                ))}
                {overflow > 0 ? (
                  <View style={styles.repoChip}>
                    <Text style={styles.repoText}>{`+${overflow}`}</Text>
                  </View>
                ) : null}
              </View>
            ) : null}
          </Pressable>
        )
      }}
    />
  )
}
