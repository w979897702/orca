import * as z from 'zod'
import { readPageDeviceStore } from '../../mobile-web-shell/bridge/page-storage/page-device-store'
import type { MobileFilePreviewResult } from '../preview/mobile-file-preview-response'
import { isMarkdownPath } from '../explorer/file-tree'
import type { MobileFilePreviewSource } from '../preview/mobile-file-preview-request'
import {
  previewStoreKey,
  readWorkspacePreview,
  saveWorkspacePreview
} from './workspace-preview-store'

const documentMeta = z.object({ byteLength: z.number().nonnegative(), truncated: z.boolean() })

export function workspaceMarkdownCopy(hostScope: string, source: MobileFilePreviewSource | null) {
  const store = readPageDeviceStore()
  if (
    !store?.available() ||
    source?.source !== 'worktree' ||
    !isMarkdownPath(source.relativePath)
  ) {
    return null
  }
  const key = previewStoreKey(hostScope, source.worktreeId, source.relativePath)
  return {
    async read(): Promise<MobileFilePreviewResult | null> {
      const held = await readWorkspacePreview(store, key)
      if (!held) {
        return null
      }
      let meta: unknown
      try {
        meta = JSON.parse(held.version)
      } catch {
        return null
      }
      const decoded = documentMeta.safeParse(meta)
      return decoded.success
        ? { status: 'ready', kind: 'markdown', content: held.value, ...decoded.data }
        : null
    },
    async update(result: MobileFilePreviewResult) {
      if (result.status === 'ready' && result.kind === 'markdown') {
        await saveWorkspacePreview(
          store,
          key,
          JSON.stringify({ byteLength: result.byteLength, truncated: result.truncated }),
          result.content
        )
      } else if (result.status !== 'waiting' && !(result.status === 'error' && result.reconnect)) {
        await store.write('cache', [{ key, value: null }])
      }
    }
  }
}
