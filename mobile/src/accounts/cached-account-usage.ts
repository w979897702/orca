import { getActiveCodexAccountIdForRateLimitTarget } from '../../../src/shared/agent-accounts/codex/codex-reset-credit-scope'
import type {
  AccountsSnapshot,
  AccountProviderRateLimits,
  RateLimitWindow
} from './accounts-snapshot'

/** 只保留能归属到已管理账号、且仍在当前周期的展示数据。 */
export function cachedAccountUsage(
  snapshot: AccountsSnapshot | null,
  now = Date.now()
): AccountsSnapshot | null {
  if (!snapshot) {
    return null
  }
  function keepWindow<T extends RateLimitWindow>(window: T | null | undefined) {
    return window?.resetsAt != null && window.resetsAt > now ? window : null
  }
  const accounts = snapshot
  const limits = accounts.rateLimits
  function keepUsage(provider: 'claude' | 'codex'): AccountProviderRateLimits | null {
    const id =
      provider === 'codex'
        ? accounts.codex.activeAccountIdsByRuntime
          ? getActiveCodexAccountIdForRateLimitTarget(accounts)
          : limits.codexTarget.runtime === 'host'
            ? accounts.codex.activeAccountId
            : null
        : limits.claudeTarget.runtime === 'host'
          ? accounts.claude.activeAccountId
          : null
    const data = limits[provider]
    if (
      !data ||
      data.status !== 'ok' ||
      !accounts[provider].accounts.some((account) => account.id === id)
    ) {
      return null
    }
    const session = keepWindow(data.session)
    const weekly = keepWindow(data.weekly)
    const monthly = keepWindow(data.monthly)
    const fableWeekly = keepWindow(data.fableWeekly)
    const buckets = data.buckets?.filter((window) => keepWindow(window))
    if (!session && !weekly && !monthly && !fableWeekly && !buckets?.length) {
      return null
    }
    return {
      provider,
      updatedAt: data.updatedAt,
      status: 'ok',
      error: null,
      session,
      weekly,
      monthly,
      fableWeekly,
      buckets
    }
  }
  return {
    ...snapshot,
    rateLimits: {
      claude: keepUsage('claude'),
      codex: keepUsage('codex'),
      claudeTarget: limits.claudeTarget,
      codexTarget: limits.codexTarget,
      inactiveClaudeAccounts: [],
      inactiveCodexAccounts: []
    }
  }
}
