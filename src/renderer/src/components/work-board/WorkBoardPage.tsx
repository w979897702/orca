import { readWorkBoardActivity } from './work-board-activity'
import {
  openWorkBoardSession,
  recordWorkBoardSession,
  retryWorkBoardSessions
} from './work-board-session'
import React, { useEffect, useRef, useState } from 'react'
import { createNonSecureContextUuid } from '../../../../shared/identifiers/non-secure-context-uuid'
import { useTranslate } from '@/i18n/use-translate'
import { useAppStore } from '@/store'
import { getRepoExecutionHostId } from '../../../../shared/execution-host/execution-host'
import { openHeaderCreateComposer } from '../sidebar/worktree-list/rows/header-create-workspace-target'

export default function WorkBoardPage(): React.JSX.Element {
  const t = useTranslate()
  const frame = useRef<HTMLIFrameElement>(null)
  const [channel] = useState(createNonSecureContextUuid)
  useEffect(() => {
    void retryWorkBoardSessions()
    async function openComposer(event: MessageEvent): Promise<void> {
      if (
        event.source !== frame.current?.contentWindow ||
        !/^http:\/\/127\.0\.0\.1:\d+$/.test(event.origin) ||
        !['work-board:open-composer', 'work-board:open-session', 'work-board:activity'].includes(
          event.data?.type
        ) ||
        event.data.channel !== channel
      ) {
        return
      }
      const reply = event.ports[0]
      if (!reply) {
        return
      }
      try {
        if (event.data.type === 'work-board:activity') {
          if (
            !/^[a-f0-9-]{36}$/.test(event.data.workId) ||
            !/^[a-f0-9]{64}$/.test(event.data.source) ||
            !Array.isArray(event.data.linked) ||
            typeof event.data.key !== 'string' ||
            !/^(?:orca:(?:chat|terminal):)?[a-f0-9-]{36}$/.test(event.data.key)
          ) {
            throw new Error('主控会话标识无效')
          }
          const result = await readWorkBoardActivity(event.data.key)
          const linked = new Set(event.data.linked)
          for (const worker of result.workers) {
            if (
              !worker.worktreeId ||
              !worker.sessionId ||
              linked.has(`orca:${worker.kind}:${worker.sessionId}`)
            ) {
              continue
            }
            recordWorkBoardSession({
              workId: event.data.workId,
              source: event.data.source,
              origin: event.origin,
              repoId: worker.worktreeId.split('::')[0],
              worktreeId: worker.worktreeId,
              kind: worker.kind === 'chat' ? 'chat' : 'terminal',
              sessionId: worker.sessionId,
              title: (worker.agent === 'antigravity'
                ? `Gemini · ${worker.title}`
                : worker.title
              ).slice(0, 512)
            })
          }
          reply.postMessage({ opened: true, result })
          return
        }
        if (event.data.type === 'work-board:open-session') {
          await openWorkBoardSession(event.data.session)
          reply.postMessage({ opened: true })
          return
        }
        if (
          !/^[a-f0-9-]{36}$/.test(event.data.workId) ||
          !/^[a-f0-9]{64}$/.test(event.data.source)
        ) {
          throw new Error('请刷新控制中心看板')
        }
        const findRepo = () =>
          useAppStore
            .getState()
            .repos.find(
              (repo) =>
                repo.kind === 'folder' &&
                repo.path === event.data.directory &&
                getRepoExecutionHostId(repo) === 'local'
            )
        let repo = findRepo()
        if (!repo) {
          await useAppStore
            .getState()
            .fetchRepos({ runtimeEnvironmentId: null, throwOnError: true })
          repo = findRepo()
        }
        if (!repo || !frame.current) {
          throw new Error(t('workBoard.projectUnavailable', 'Work project is unavailable'))
        }
        openHeaderCreateComposer(repo, {
          pinHost: true,
          workBoard: {
            workId: event.data.workId,
            repoId: repo.id,
            origin: event.origin,
            source: event.data.source
          }
        })
        reply.postMessage({ opened: true })
      } catch (error) {
        reply.postMessage({ error: error instanceof Error ? error.message : String(error) })
      } finally {
        reply.close()
      }
    }
    window.addEventListener('message', openComposer)
    return () => window.removeEventListener('message', openComposer)
  }, [channel, t])
  return (
    <iframe
      ref={frame}
      className="h-full min-h-0 w-full flex-1 border-0"
      title={t('workBoard.title', 'Control Center')}
      src={`http://127.0.0.1:47837/board#composer=${channel}`}
      sandbox="allow-scripts allow-same-origin allow-forms"
      referrerPolicy="no-referrer"
    />
  )
}
