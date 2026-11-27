import { sha256 } from '@noble/hashes/sha256'
import { bytesToHex } from '@noble/hashes/utils'
import {
  decodeDeviceStoreValue,
  encodeDeviceStoreValue
} from '../../device-store/device-store-value-codec'
import type { PageDeviceStore } from '../../mobile-web-shell/bridge/page-storage/page-device-store'
import * as z from 'zod'

const chunkSize = 96 * 1024
const maxChunks = 64
const manifestSchema = z.object({
  version: z.string(),
  digest: z.string().regex(/^[a-f0-9]{64}$/),
  count: z.number().int().min(1).max(maxChunks)
})
export const previewStoreKey = (...scope: string[]) =>
  'preview:' + bytesToHex(sha256(JSON.stringify(scope)))

export async function readWorkspacePreview(store: PageDeviceStore, key: string) {
  const lookup = await store.read('cache', [key])
  const raw = lookup.status === 'ok' && lookup.values[0]
  if (!raw) {
    return null
  }
  const manifest = manifestSchema.safeParse(decodeDeviceStoreValue(raw))
  if (!manifest.success) {
    return null
  }
  const { digest, count, version } = manifest.data
  const parts = await store.read(
    'cache',
    Array.from({ length: count }, (_, i) => key + ':' + digest + ':' + i)
  )
  if (parts.status !== 'ok') {
    return null
  }
  const chunks: string[] = []
  for (const part of parts.values) {
    const chunk = part ? decodeDeviceStoreValue(part) : null
    if (typeof chunk !== 'string') {
      return null
    }
    chunks.push(chunk)
  }
  return { version, value: chunks.join('') }
}

export async function saveWorkspacePreview(
  store: PageDeviceStore,
  key: string,
  version: string,
  value: string
) {
  const count = Math.max(1, Math.ceil(value.length / chunkSize))
  if (count > maxChunks) {
    await store.write('cache', [{ key, value: null }])
    return
  }
  // 分块全部写好后才发布索引，旧块由设备缓存的空间上限回收。
  const digest = bytesToHex(sha256(value))
  const parts = Array.from({ length: count }, (_, i) => ({
    key: key + ':' + digest + ':' + i,
    value: encodeDeviceStoreValue(value.slice(i * chunkSize, (i + 1) * chunkSize))
  }))
  if ((await store.write('cache', parts)).written) {
    await store.write('cache', [{ key, value: encodeDeviceStoreValue({ version, digest, count }) }])
  }
}
