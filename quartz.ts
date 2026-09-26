import { loadQuartzConfig, loadQuartzLayout } from "./quartz/plugins/loader/config-loader"
import { componentRegistry } from "./quartz/components/registry"
import customLight from "./quartz/styles/themes/custom-light.json"
import customDark from "./quartz/styles/themes/custom-dark.json"

// TS option overrides must run before loadQuartzConfig().
// Keys are the plugin `source` strings, which is what the loader looks up.
componentRegistry.setOptionOverrides("@quartz-community/syntax-highlighting", {
  theme: { light: customLight, dark: customDark },
})

componentRegistry.setOptionOverrides("@quartz-community/explorer", {
  // Serialized to the browser: must stay self-contained (no closures).
  sortFn: (a: any, b: any) => {
    if (a.isFolder !== b.isFolder) {
      return a.isFolder ? -1 : 1
    }

    if (!a.isFolder && !b.isFolder) {
      const aDate = a.data?.date ? new Date(a.data.date).getTime() : 0
      const bDate = b.data?.date ? new Date(b.data.date).getTime() : 0
      if (aDate !== bDate) {
        return bDate - aDate
      }
    }

    return a.displayName.localeCompare(b.displayName, undefined, {
      numeric: true,
      sensitivity: "base",
    })
  },
})

const config = await loadQuartzConfig()
export default config
export const layout = await loadQuartzLayout()
