import { readPageDeviceStore } from '../../mobile-web-shell/bridge/page-storage/page-device-store'
import { mobileFileStatRead } from '../media/mobile-file-media-download'
import { isMobileMethodUnavailableError } from '../../transport/rpc/mobile-method-unavailable'
import {
  previewStoreKey,
  readWorkspacePreview,
  saveWorkspacePreview
} from './workspace-preview-store'

import {
  isWindowsAbsolutePathLike,
  relativePathInsideRoot,
  resolveRuntimePath
} from '../../../../src/shared/file-access/cross-platform-path'
import { routeMarkdownHref } from '../../components/markdown/links/markdown-href-routing'
import type { MobileFilePreviewRpcSender } from '../preview/mobile-file-preview-operations'
import { loadMobileFilePreview } from '../preview/mobile-file-preview-request'
import { classifyMobileArtifact } from '../preview/mobile-artifact-kind'
import { svgMarkupDataUri } from '../../../../src/shared/file-preview/svg-document'

// Absolute paths leave the workspace; an external-file tab's document has no workspace images.
function isOutsideWorkspace(path: string): boolean {
  return /^[\\/]/.test(path) || isWindowsAbsolutePathLike(path) || path.includes('\0')
}

export async function loadMarkdownPreviewImage(
  client: MobileFilePreviewRpcSender | null,
  worktreeId: string,
  documentPath: string,
  href: string,
  hostScope: string
): Promise<string> {
  if (/^https?:\/\//i.test(href)) {
    return href
  }
  const link = routeMarkdownHref(href)
  if (link.kind !== 'file') {
    throw new Error('Unsupported image location')
  }
  const path = link.pathText
  if (isOutsideWorkspace(path) || isOutsideWorkspace(documentPath)) {
    throw new Error('Image must be inside this workspace')
  }
  const source = documentPath.replaceAll('\\', '/')
  const directory = source.slice(0, source.lastIndexOf('/') + 1)
  const relativePath = relativePathInsideRoot(
    '/workspace',
    resolveRuntimePath(`/workspace/${directory}`, path)
  )
  const artifactKind = relativePath ? classifyMobileArtifact(relativePath) : null
  if (!relativePath || (artifactKind !== 'image' && artifactKind !== 'vector')) {
    throw new Error('Unsupported image location')
  }
  const key = previewStoreKey(hostScope, worktreeId, relativePath)
  const store = readPageDeviceStore()
  if (!client) {
    const held = store && (await readWorkspacePreview(store, key))
    if (held) {
      return held.value
    }
    throw new Error('Waiting for host…')
  }
  let pending = downloads.get(client)
  if (!pending) {
    pending = new Map()
    downloads.set(client, pending)
  }
  const existing = pending.get(key)
  if (existing) {
    return existing
  }
  const task = (async () => {
    if (!store?.available()) {
      return readImage(client, worktreeId, relativePath)
    }
    const params = { worktree: 'id:' + worktreeId, relativePath }
    const stat = () => mobileFileStatRead.request(client, params, { failWhenDisconnected: true })
    const reply = await stat()
    if (!reply.ok) {
      if (isMobileMethodUnavailableError(reply.error.code, reply.error.message)) {
        return readImage(client, worktreeId, relativePath)
      }
      if (
        /enoent|no such file|not found|forbidden|eacces|permission denied/i.test(
          reply.error.code + ' ' + reply.error.message
        )
      ) {
        await store.write('cache', [{ key, value: null }])
      }
      throw new Error(reply.error.message)
    }
    const version = fileVersion(mobileFileStatRead.interpret(reply))
    const held = await readWorkspacePreview(store, key)
    if (held?.version === version) {
      return held.value
    }
    if (held) {
      await store.write('cache', [{ key, value: null }])
    }
    const value = await readImage(client, worktreeId, relativePath)
    const after = await stat()
    if (after.ok && fileVersion(mobileFileStatRead.interpret(after)) === version) {
      await saveWorkspacePreview(store, key, version, value)
    }
    return value
  })().finally(() => pending.delete(key))
  pending.set(key, task)
  return task
}
const downloads = new WeakMap<MobileFilePreviewRpcSender, Map<string, Promise<string>>>()
async function readImage(
  client: MobileFilePreviewRpcSender,
  worktreeId: string,
  relativePath: string
) {
  const result = await loadMobileFilePreview(client, worktreeId, relativePath)
  if (result.status === 'ready' && result.kind === 'image') {
    return result.dataUri
  }
  if (result.status === 'ready' && result.kind === 'svg' && !result.truncated) {
    return svgMarkupDataUri(result.content)
  }
  throw new Error('message' in result ? result.message : 'Unable to load image')
}

function fileVersion(stat: { mtime: number; size: number; ctime?: number }) {
  return JSON.stringify([stat.size, stat.mtime, stat.ctime])
}
