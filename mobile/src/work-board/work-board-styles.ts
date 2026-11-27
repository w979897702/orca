import { StyleSheet } from 'react-native'
import { feedback, radii, spacing, typography } from '../theme/mobile-theme'
import { themedStyleSheet } from '../theme/themed-styles'

export const workBoardStylesSheet = themedStyleSheet((colors) => ({
  screen: { flex: 1, backgroundColor: colors.bgBase },
  body: { flex: 1, minHeight: 0 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.control,
    borderWidth: StyleSheet.hairlineWidth
  },
  bannerOffline: { backgroundColor: colors.bgPanel, borderColor: colors.floatingCardBorder },
  bannerError: { backgroundColor: colors.diffDeletedBg, borderColor: colors.statusRed },
  bannerCopy: { flex: 1, minWidth: 0, gap: 2 },
  bannerTitle: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  bannerDetail: { fontSize: typography.metaSize, color: colors.textSecondary },
  retryButton: {
    minHeight: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radii.control,
    backgroundColor: colors.bgRaised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.floatingCardBorder,
    justifyContent: 'center'
  },
  retryText: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  disabled: { opacity: feedback.disabledOpacity },
  controls: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle,
    gap: spacing.sm
  },
  searchWrap: { paddingHorizontal: spacing.lg },
  statusGrid: { paddingHorizontal: spacing.lg, gap: 6 },
  statusRow: { flexDirection: 'row', gap: 6 },
  statusTile: {
    flex: 1,
    minWidth: 0,
    minHeight: 46,
    paddingHorizontal: 10,
    borderRadius: radii.control,
    backgroundColor: colors.bgPanel,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4
  },
  statusTileActive: { backgroundColor: colors.bgRaised },
  statusTileHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexShrink: 1,
    minWidth: 0
  },
  dot: { width: 7, height: 7, borderRadius: radii.pill, flexShrink: 0 },
  statusLabel: { fontSize: 12, fontWeight: '500', color: colors.textSecondary, flexShrink: 1 },
  statusLabelActive: { color: colors.textPrimary, fontWeight: '600' },
  statusCount: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    fontVariant: ['tabular-nums']
  },
  statusCountActive: { color: colors.textPrimary },
  statusCountZero: { color: colors.textMuted, fontWeight: '500' },
  groupStrip: { paddingHorizontal: spacing.lg, gap: spacing.sm, alignItems: 'center' },
  pillTouch: { minHeight: 40, justifyContent: 'center' },
  pill: {
    height: 30,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: colors.bgPanel,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    justifyContent: 'center'
  },
  pillActive: { backgroundColor: colors.bgRaised, borderColor: colors.textSecondary },
  pillText: { fontSize: 13, fontWeight: '500', color: colors.textSecondary },
  pillTextActive: { color: colors.textPrimary, fontWeight: '600' },
  list: { paddingTop: spacing.xs },
  listToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs
  },
  toolbarTitle: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  toolbarAction: { minHeight: 32, justifyContent: 'center' },
  toolbarActionText: { fontSize: typography.metaSize, fontWeight: '500', color: colors.accentBlue },
  groupHeader: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm
  },
  groupTitle: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  countPill: {
    minWidth: 22,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.bgRaised,
    alignItems: 'center',
    justifyContent: 'center'
  },
  countPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    fontVariant: ['tabular-nums']
  },
  card: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.md,
    borderRadius: radii.surface,
    backgroundColor: colors.bgPanel,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSubtle,
    gap: spacing.sm
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardMeta: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  identifier: {
    fontSize: typography.metaSize,
    fontFamily: typography.monoFamily,
    fontWeight: '600',
    color: colors.textMuted,
    fontVariant: ['tabular-nums']
  },
  priorityBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth
  },
  priorityText: { fontSize: 11, fontWeight: '600', lineHeight: 14 },
  cardTitle: { fontSize: 15, fontWeight: '600', lineHeight: 21, color: colors.textPrimary },
  repoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  repoChip: {
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: colors.bgRaised
  },
  repoText: { fontSize: 12, color: colors.textSecondary, flexShrink: 1 },
  jumpRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm },
  jumpChip: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: colors.bgRaised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.floatingCardBorder
  },
  jumpText: { fontSize: 13, fontWeight: '500', color: colors.textPrimary }
}))
