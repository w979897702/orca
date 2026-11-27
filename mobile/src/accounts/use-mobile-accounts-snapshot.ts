import { cachedAccountUsage } from './cached-account-usage'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { hashKey, useQuery, useQueryClient } from '@tanstack/react-query'
import { AccountsSnapshotError, decodeAccountsSnapshot } from './accounts-snapshot'
import type { AccountsSnapshot } from './accounts-snapshot'
import { useMobileTranslation } from '../i18n/use-mobile-translation'
import { holdsRestoredHostQueryData } from '../query/host-query-persistence'
import type { ConnectionState } from '../transport/connection/connection-state'
import type { RpcClient } from '../transport/rpc/rpc-client-contract'
import {
  accountsSnapshotKey,
  accountsSnapshotOptions,
  subscribeAccountsSnapshots
} from './accounts-snapshot-stream'

/**
 * One host's accounts: the last stored snapshot at once, then the desktop's stream, or `accounts.list` when the
 * stream fails. 缓存额度只用于展示；切换账号和重置额度仍需本次连接确认。
 */
export function useMobileAccountsSnapshot({
  hostId,
  client,
  connState,
  lastConnectedAt,
  now
}: {
  hostId: string
  client: RpcClient | null
  connState: ConnectionState
  now: number
  lastConnectedAt: number | null
}) {
  const t = useMobileTranslation()
  const queryClient = useQueryClient()
  const { data, dataUpdatedAt } = useQuery(accountsSnapshotOptions(hostId))
  // Dated by when its read was sent, so a failure from an earlier connection doesn't outlive it.
  const [failure, setFailure] = useState<{ message: string; at: number } | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  // Data this screen didn't read itself, such as a previous visit's in the same document, can't vouch for usage.
  const [mountedAt] = useState(Date.now)

  const acceptSnapshot = useCallback(
    (nextSnapshot: AccountsSnapshot) => {
      queryClient.setQueryData(accountsSnapshotKey(hostId), nextSnapshot)
      setFailure(null)
    },
    [hostId, queryClient]
  )
  const rejectInvalidSnapshot = useCallback(
    (readAt = Date.now()) => {
      // Fail closed on unrecognized snapshot: stale data can expose finite reset for wrong account.
      queryClient.setQueryData(accountsSnapshotKey(hostId), null)
      setFailure({
        message: t('accounts.screen.invalidSnapshot', 'Invalid accounts snapshot from host'),
        at: readAt
      })
    },
    [hostId, queryClient, t]
  )

  const refresh = useCallback(async () => {
    if (!client) {
      return
    }
    setRefreshing(true)
    const sentAt = Date.now()
    // A reply sent before a reconnect speaks for the old connection; the new one's stream answers instead.
    const reconnectedSince = () => (client.getLastConnectedAt() ?? 0) > sentAt
    try {
      const res = await client.sendRequest('accounts.list')
      if (reconnectedSince()) {
        return
      }
      if (res.ok) {
        acceptSnapshot(decodeAccountsSnapshot(res.result))
      } else {
        setFailure({ message: res.error.message, at: sentAt })
      }
    } catch (e) {
      if (reconnectedSince()) {
        return
      }
      if (e instanceof AccountsSnapshotError) {
        rejectInvalidSnapshot(sentAt)
      } else {
        setFailure({ message: e instanceof Error ? e.message : String(e), at: sentAt })
      }
    } finally {
      setRefreshing(false)
    }
  }, [acceptSnapshot, client, rejectInvalidSnapshot])

  // Stream desktop poll/account-switch updates, falling back to one-shot accounts.list on subscription error.
  useEffect(() => {
    if (!client || connState !== 'connected') {
      return
    }
    return subscribeAccountsSnapshots(client, {
      onSnapshot: acceptSnapshot,
      onInvalidSnapshot: () => rejectInvalidSnapshot(),
      onStreamError: () => void refresh()
    })
  }, [acceptSnapshot, client, connState, refresh, rejectInvalidSnapshot])

  // 只有当前连接的实时读数才能启用账号操作。
  const live =
    data != null &&
    !holdsRestoredHostQueryData(queryClient, hashKey(accountsSnapshotKey(hostId))) &&
    connState === 'connected' &&
    lastConnectedAt !== null &&
    dataUpdatedAt >= Math.max(lastConnectedAt, mountedAt)
  const snapshot = useMemo(
    () => (live ? (data ?? null) : cachedAccountUsage(data ?? null, now)),
    [live, data, now]
  )

  const error =
    failure && (lastConnectedAt === null || failure.at >= lastConnectedAt) ? failure.message : null

  return {
    snapshot,
    live,
    readAt: snapshot
      ? Math.min(
          dataUpdatedAt,
          snapshot.rateLimits.claude?.updatedAt ?? dataUpdatedAt,
          snapshot.rateLimits.codex?.updatedAt ?? dataUpdatedAt
        )
      : null,
    error,
    refreshing,
    refresh,
    acceptSnapshot
  }
}
