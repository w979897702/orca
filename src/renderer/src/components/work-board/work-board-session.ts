import { useAppStore } from '@/store'
import { toast } from 'sonner'
import { openOrchestrationWorker } from '@/lib/open-orchestration-worker'
import { openDesktopStructuredSession } from '@/lib/agent-session/open/activate-ai-vault-structured-session'
import { activateAndRevealWorktree } from '@/lib/workspace/activation/worktree-activation'
import type {
  WorkBoardReceipt,
  WorkBoardSession
} from '../../../../shared/work-items/work-board-session'

const prefix = 'work-board:pending-session:'

async function deliver(key: string, receipt: WorkBoardReceipt): Promise<void> {
  await window.api.app.linkWorkBoardSession(receipt)
  localStorage.removeItem(key)
}

export function recordWorkBoardSession(receipt: WorkBoardReceipt): void {
  const key = `${prefix}${receipt.source}:${receipt.kind}:${receipt.sessionId}`
  localStorage.setItem(key, JSON.stringify(receipt))
  void deliver(key, receipt).catch((error) => toast.error(String(error)))
}

export async function retryWorkBoardSessions(): Promise<void> {
  for (const key of Object.keys(localStorage).filter((key) => key.startsWith(prefix))) {
    const saved = localStorage.getItem(key)
    if (saved) {
      await deliver(key, JSON.parse(saved)).catch((error) => toast.error(String(error)))
    }
  }
}

export async function openWorkBoardSession(session: WorkBoardSession): Promise<void> {
  const { worktreeId, sessionId } = session
  if (session.kind === 'chat') {
    const result = await openDesktopStructuredSession(
      { kind: 'history', structuredSession: { workspaceId: worktreeId, sessionId } },
      { target: { kind: 'local' } }
    )
    if (result.kind !== 'opened') {
      throw new Error('Orca 无法打开原聊天')
    }
    return
  }
  const state = useAppStore.getState()
  const tab = state.unifiedTabsByWorktree[worktreeId]?.find(
    (row) =>
      row.contentType === 'terminal' &&
      row.entityId === sessionId &&
      (!row.executionHostId || row.executionHostId === 'local')
  )
  if (!tab && session.dispatchId) {
    openOrchestrationWorker(
      { dispatchId: session.dispatchId, worktreeId, title: session.title, chatSessionId: null },
      { kind: 'local' }
    )
    return
  }
  if (!tab || !activateAndRevealWorktree(worktreeId, { executionHostId: 'local' })) {
    throw new Error('Orca 原终端已不可用')
  }
  useAppStore.getState().activateTab(tab.id, { worktreeId, preservePreview: true })
}
