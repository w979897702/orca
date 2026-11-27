import { useEffect, useState } from 'react'
import { filePreviewTextRead } from '../../files/preview/mobile-file-preview-operations'
import { resolveMobileNativeChatSessionId } from '../native-chat/conversation/mobile-native-chat-eligibility'
import type { MobileSessionTab } from './mobile-session-tabs'
import type { MobileSessionTabSwitchingModel } from './use-mobile-session-tab-switching'

export function workCoordinatorKey(content: string) {
  return (
    /^- Orca 主控：`((?:orca:(?:chat|terminal):)?[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12})`。/m.exec(
      content
    )?.[1] ?? null
  )
}

export function workCoordinatorTab(tabs: readonly MobileSessionTab[], key: string) {
  const [prefix, kind, id] = key.split(':')
  if (prefix === 'orca') {
    return tabs.find((tab) =>
      kind === 'chat'
        ? tab.type === 'agent-session' && tab.sessionId === id
        : tab.type === 'terminal' && (tab.parentTabId ?? tab.id) === id
    )
  }
  return tabs.find(
    (tab) =>
      (tab.type === 'terminal' || tab.type === 'agent-session') &&
      resolveMobileNativeChatSessionId(tab) === key
  )
}

export function useDefaultWorkCoordinatorTab(
  scope: MobileSessionTabSwitchingModel,
  targeted: boolean
) {
  const {
    client,
    connState,
    worktreeId,
    workspaceKey,
    tabChoice,
    terminalsLoaded,
    sessionTabs,
    switchSessionTab
  } = scope
  const [binding, setBinding] = useState<{ workspace: string; key: string | null } | null>(null)
  const resolved = binding?.workspace === workspaceKey
  useEffect(() => {
    if (targeted || resolved || tabChoice.explicit || !client || connState !== 'connected') {
      return
    }
    let current = true
    // 任务中心把绑定写在工作区根目录。读取与页面加载并行，普通工作区可直接打开。
    void filePreviewTextRead
      .request(
        client,
        { worktree: 'id:' + worktreeId, relativePath: 'AGENTS.md' },
        { failWhenDisconnected: true }
      )
      .then((reply) => {
        const result = filePreviewTextRead.interpret(reply)
        return result.accepted ? workCoordinatorKey(result.value.content) : null
      })
      .catch(() => null)
      .then((key) => {
        if (current) {
          setBinding({ workspace: workspaceKey, key })
        }
      })
    return () => {
      current = false
    }
  }, [targeted, resolved, tabChoice, client, connState, worktreeId, workspaceKey])
  useEffect(() => {
    if (targeted || !resolved || !binding.key || !terminalsLoaded || tabChoice.explicit) {
      return
    }
    const tab = workCoordinatorTab(sessionTabs, binding.key)
    if (tab) {
      switchSessionTab(tab)
    }
  }, [
    targeted,
    resolved,
    binding,
    terminalsLoaded,
    tabChoice,
    workspaceKey,
    sessionTabs,
    switchSessionTab
  ])
}
