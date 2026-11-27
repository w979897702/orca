export type WorkBoardTarget = { workId: string; repoId: string; origin: string; source: string }
export type WorkBoardSession = {
  kind: 'chat' | 'terminal'
  sessionId: string
  worktreeId: string
  title: string
  dispatchId?: string
}
export type WorkBoardReceipt = WorkBoardTarget & WorkBoardSession
