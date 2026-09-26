import fs from "node:fs"
import path from "node:path"
import { ContentIndex as CommunityContentIndex } from "@quartz-community/content-index"

interface FileData {
  slug?: string
  unlisted?: boolean
  defaultDateType?: string
  dates?: Record<string, Date>
}

// Mirrors @quartz-community/content-index's getDate
function getDate(data: FileData): Date | undefined {
  const defaultDateType = data.defaultDateType
  if (!defaultDateType) return undefined
  return data.dates?.[defaultDateType]
}

// The community plugin strips `date` from the simplified content index that the
// explorer reads client-side. Restore it so sorting by recency works.
async function restoreDates(
  ctx: { argv: { output: string } },
  content: Iterable<[unknown, { data?: FileData }]>,
) {
  const dates = new Map<string, Date>()
  for (const [, file] of content) {
    const data = file.data ?? {}
    if (data.unlisted === true) continue
    if (data.slug) dates.set(data.slug, getDate(data) ?? new Date())
  }

  const indexPath = path.join(ctx.argv.output, "static", "contentIndex.json")
  try {
    const index: Record<string, { date?: Date }> = JSON.parse(
      await fs.promises.readFile(indexPath, "utf-8"),
    )
    for (const [slug, entry] of Object.entries(index)) {
      const date = dates.get(slug)
      if (date) entry.date = date
    }
    await fs.promises.writeFile(indexPath, JSON.stringify(index))
  } catch {
    // index missing or unreadable — leave as written
  }
}

export default (opts?: Parameters<typeof CommunityContentIndex>[0]) => {
  const inner = CommunityContentIndex(opts)
  return {
    ...inner,
    async emit(
      ctx: Parameters<typeof inner.emit>[0],
      content: Parameters<typeof inner.emit>[1],
      resources: Parameters<typeof inner.emit>[2],
    ) {
      const out = await inner.emit(ctx, content, resources)
      await restoreDates(ctx, content)
      return out
    },
    async partialEmit(
      ctx: Parameters<typeof inner.emit>[0],
      content: Parameters<typeof inner.emit>[1],
      resources: Parameters<typeof inner.emit>[2],
    ) {
      const out = (await inner.partialEmit?.(ctx, content, resources)) ?? []
      await restoreDates(ctx, content)
      return out
    },
  }
}
