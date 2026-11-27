import { lazyZodSchema } from '../schema/lazy-zod-schema'
import * as z from 'zod'

export const mobileWorkBoardItem = lazyZodSchema(() =>
  z.object({
    id: z.string(),
    identifier: z.string(),
    title: z.string(),
    status: z.enum(['todo', 'in_progress', 'in_review', 'pending', 'done', 'canceled']),
    priority: z.enum(['none', 'low', 'medium', 'high', 'urgent']),
    group: z.string().nullable(),
    repos: z.array(z.string()),
    modifiedRepos: z.array(z.string()).optional()
  })
)

export const mobileWorkBoardSnapshot = lazyZodSchema(() =>
  z.object({ items: z.array(mobileWorkBoardItem) })
)
