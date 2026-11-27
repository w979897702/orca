import { Modal } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { mobileWorkBoardSnapshot } from '../../../../src/shared/work-items/mobile-work-board'
import { useMobileTranslation } from '../../i18n/use-mobile-translation'
import { isMobileMethodUnavailableError } from '../../transport/rpc/mobile-method-unavailable'
import { useBackClaim } from '../../navigation/use-back-claim'
import type { RpcClient } from '../../transport/rpc/rpc-client-contract'
import { MobileWorkBoard } from '../../work-board/MobileWorkBoard'

export default function HostWorkBoard({
  hostId,
  client,
  connected,
  hostName,
  authFailed,
  reconnect,
  onBack
}: {
  hostId: string
  client: RpcClient | null
  connected: boolean
  hostName: string
  authFailed: boolean
  reconnect: (() => void) | null
  onBack: () => void
}) {
  const t = useMobileTranslation()
  useBackClaim(() => {
    onBack()
    return true
  })
  const board = useQuery({
    queryKey: ['work-board', hostId],
    queryFn: async () => {
      if (!client) {
        throw new Error(t('common.waitingForHost', 'Waiting for host…'))
      }
      const reply = await client.sendRequest('mobileRelay.workBoard', undefined, {
        failWhenDisconnected: true
      })
      if (!reply.ok) {
        throw new Error(
          isMobileMethodUnavailableError(reply.error.code, reply.error.message)
            ? t('components.protocolBlockScreen.updateDesktopTitle', 'Update Orca on this host')
            : reply.error.message
        )
      }
      return mobileWorkBoardSnapshot.parse(reply.result)
    },
    enabled: connected && Boolean(client),
    retry: false,
    refetchInterval: 30_000
  })
  return (
    <Modal visible animationType="slide" onRequestClose={onBack}>
      <MobileWorkBoard
        hostName={hostName}
        disconnected={!connected}
        items={authFailed ? [] : (board.data?.items ?? [])}
        loading={board.isFetching}
        error={
          !connected
            ? t('session.routeHelpers.disconnected', 'Disconnected')
            : (board.error?.message ?? null)
        }
        onRefresh={() => {
          if (connected) {
            void board.refetch()
          } else {
            reconnect?.()
          }
        }}
        onBack={onBack}
      />
    </Modal>
  )
}
