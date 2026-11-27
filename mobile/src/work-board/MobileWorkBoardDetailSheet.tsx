import { StyleSheet, Text, View } from 'react-native'
import { GitBranch } from 'lucide-react-native'
import { BottomDrawer } from '../components/bottom-drawer/BottomDrawer'
import { ListGroup, ListRow, SectionHeader } from '../components/list/ListGroup'
import { SheetHeader } from '../components/nav-bar/SheetHeader'
import { useMobileTranslation } from '../i18n/use-mobile-translation'
import { radii, spacing, typography } from '../theme/mobile-theme'
import { themedStyleSheet, useThemedStyles } from '../theme/themed-styles'
import { useMobileColors } from '../theme/use-mobile-color-scheme'
import {
  formatGroupLabel,
  normalizeGroup,
  normalizeRepos,
  priorityTone,
  statusDotColor,
  workBoardPriorityLabel,
  workBoardStatusLabel,
  type MobileWorkBoardItem
} from './work-board-model'

export function MobileWorkBoardDetailSheet({
  item,
  onClose
}: {
  item: MobileWorkBoardItem | null
  onClose: () => void
}) {
  const t = useMobileTranslation()
  const colors = useMobileColors()
  const styles = useThemedStyles(stylesSheet)

  const repos = item ? normalizeRepos(item.repos) : []
  const dotColor = item ? statusDotColor(item.status, colors) : colors.textMuted
  const pTone = item ? priorityTone(item.priority, colors) : null
  const statusLabel = item ? workBoardStatusLabel(item.status, t) : ''

  return (
    <BottomDrawer visible={item !== null} onClose={onClose} scrollResetKey={item?.id ?? null}>
      {item ? (
        <View style={styles.container} testID="work-board-detail-sheet">
          <SheetHeader title={item.identifier} subtitle={statusLabel} onClose={onClose} />

          <Text style={styles.title} selectable>
            {item.title}
          </Text>

          <SectionHeader title={t('workBoard.detail.properties', 'Details')} first />
          <ListGroup>
            <ListRow key="id" title={t('workBoard.detail.id', 'ID')} value={item.identifier} />
            <ListRow
              key="status"
              title={t('workBoard.detail.status', 'Status')}
              value={statusLabel}
              valueIcon={<View style={[styles.dot, { backgroundColor: dotColor }]} />}
            />
            <ListRow
              key="priority"
              title={t('workBoard.detail.priority', 'Priority')}
              value={workBoardPriorityLabel(item.priority, t)}
              valueColor={item.priority === 'none' ? undefined : pTone?.text}
            />
            <ListRow
              key="group"
              title={t('workBoard.detail.group', 'Group')}
              value={formatGroupLabel(normalizeGroup(item.group), t)}
            />
          </ListGroup>

          <SectionHeader
            title={t('workBoard.detail.repos', 'Repositories')}
            trailing={repos.length > 0 ? String(repos.length) : undefined}
          />
          {repos.length > 0 ? (
            <View style={styles.repoSurface}>
              {repos.map((repo) => {
                const modifiedColor = item.modifiedRepos?.includes(repo)
                  ? colors.gitDecorationModified
                  : undefined
                return (
                  <View key={repo} style={styles.repoChip}>
                    <GitBranch
                      size={12}
                      color={modifiedColor ?? colors.textMuted}
                      strokeWidth={2.1}
                    />
                    <Text
                      style={[styles.repoText, modifiedColor && { color: modifiedColor }]}
                      selectable
                    >
                      {repo}
                    </Text>
                  </View>
                )
              })}
            </View>
          ) : (
            <ListGroup>
              <ListRow key="empty" title={t('workBoard.detail.noRepos', 'No repositories')} />
            </ListGroup>
          )}
        </View>
      ) : null}
    </BottomDrawer>
  )
}

const stylesSheet = themedStyleSheet((colors) => ({
  container: { paddingBottom: spacing.md },
  title: {
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.md,
    fontSize: typography.titleSize,
    lineHeight: 24,
    fontWeight: '600',
    color: colors.textPrimary
  },
  dot: { width: 8, height: 8, borderRadius: radii.pill },
  repoSurface: {
    borderRadius: radii.surface,
    backgroundColor: colors.sheetGroup,
    padding: spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm
  },
  repoChip: {
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.tile,
    backgroundColor: colors.sheetSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSubtle
  },
  repoText: {
    fontSize: 13,
    color: colors.textPrimary,
    fontFamily: typography.monoFamily,
    flexShrink: 1
  }
}))
