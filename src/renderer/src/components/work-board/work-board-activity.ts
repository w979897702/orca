import { useAppStore } from '@/store'
import { callRuntimeRpc } from '@/runtime/rpc/calls/runtime-rpc-call'
import { structuredAgentSessionStatusPaneKey } from '../../../../shared/agent-session/view/structured-agent-session-tab'
import {
  ORCHESTRATION_SESSION_WORKERS_METHOD,
  type OrchestrationSessionWorkersResult
} from '../../../../shared/orchestration-session-workers'

export async function readWorkBoardActivity(key: string) {
  const chat = key.startsWith('orca:chat:')
  const terminal = key.startsWith('orca:terminal:')
  const statuses = useAppStore.getState().agentStatusByPaneKey
  const row = chat
    ? statuses.get(structuredAgentSessionStatusPaneKey(key.slice('orca:chat:'.length)))
    : Array.from(statuses.values()).find(
        (entry) =>
          !entry.connectionId &&
          entry.agentType === 'codex' &&
          (terminal
            ? entry.paneKey.split(':')[0] === key.slice('orca:terminal:'.length)
            : entry.providerSession?.id === key)
      )
  const session = chat ? key.slice('orca:chat:'.length) : row?.orcaSessionId
  const waiting = Boolean(
    row && !row.restoredUnconfirmed && (row.mainAgent?.state ?? row.state) === 'waiting'
  )
  if (!session) {
    return { waiting, workers: [] }
  }
  const { workers } = await callRuntimeRpc<OrchestrationSessionWorkersResult>(
    { kind: 'local' },
    ORCHESTRATION_SESSION_WORKERS_METHOD,
    { session },
    { suppressFeatureInteraction: true, background: true }
  )
  return {
    waiting,
    workers: workers
      .filter(
        (worker) =>
          worker.host === 'local' && worker.worktreeId && (worker.chatSessionId || worker.paneKey)
      )
      .map((worker) => ({
        dispatchId: worker.dispatchId,
        kind: worker.chatSessionId ? 'chat' : 'terminal',
        sessionId: worker.chatSessionId ?? worker.paneKey!.split(':')[0],
        worktreeId: worker.worktreeId,
        title: worker.title,
        agent: worker.agent,
        state: worker.state,
        createdAt: new Date(worker.startedAt).toISOString()
      }))
  }
}
