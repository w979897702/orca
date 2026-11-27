import * as z from 'zod'
import { lazyZodSchema } from '../../../../../shared/schema/lazy-zod-schema'
import { mobileWorkBoardItem } from '../../../../../shared/work-items/mobile-work-board'
import { defineMethod } from '../../core'

const launcher = 'http://127.0.0.1:47837'
const displayedBoard = lazyZodSchema(() =>
  z.object({
    items: z.array(
      mobileWorkBoardItem.omit({ group: true, repos: true, modifiedRepos: true }).extend({
        groupName: mobileWorkBoardItem.shape.group,
        workspaceGitStatus: z
          .object({
            repositories: z
              .array(z.object({ name: z.string(), hasChanges: z.boolean().nullable() }))
              .optional()
          })
          .optional(),
        display: z.object({ status: mobileWorkBoardItem.shape.status }).optional()
      })
    )
  })
)

async function readBoard() {
  const signal = AbortSignal.timeout(15_000)
  // 与桌面入口共用启动器，由它解析任务中心实际配置的本机端口。
  const launch = await fetch(`${launcher}/board`, {
    headers: { 'Sec-Fetch-Dest': 'document' },
    redirect: 'manual',
    signal
  })
  const target = launch.headers.get('location')
  if (launch.status !== 302 || !target) {
    throw new Error('电脑上的任务中心尚未就绪')
  }
  const { origin } = new URL(target)
  if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(origin)) {
    throw new Error('任务中心地址无效')
  }
  const board = await fetch(`${origin}/api/work-items`, { redirect: 'error', signal })
  if (!board.ok) {
    throw new Error('无法读取电脑上的任务中心看板')
  }
  const snapshot = await board.json()
  return {
    items: displayedBoard
      .parse(snapshot)
      .items.map(({ groupName, display, workspaceGitStatus, ...item }) => {
        const repositories = workspaceGitStatus?.repositories ?? []
        return {
          ...item,
          group: groupName,
          status: display?.status ?? item.status,
          repos: repositories.map((repo) => repo.name),
          modifiedRepos: repositories
            .filter((repo) => repo.hasChanges === true)
            .map((repo) => repo.name)
        }
      })
  }
}

export const MOBILE_WORK_BOARD_METHODS = [
  defineMethod({
    name: 'mobileRelay.workBoard',
    permission: 'workspace',
    params: null,
    handler: readBoard
  })
]
