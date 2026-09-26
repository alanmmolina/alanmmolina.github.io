// @ts-ignore -- inlined as a compiled script string at build time
import excalidrawScript from "../../../quartz/components/scripts/excalidraw.inline"
// @ts-ignore -- inlined as compiled css at build time
import excalidrawStyle from "../../../quartz/components/styles/excalidraw.inline.scss"

const TRANSCLUDE_RE =
  /^<blockquote class="transclude" data-url="([^"]+\.excalidraw)"[^>]*>[\s\S]*<\/blockquote>$/

interface HtmlNode {
  type: string
  value?: string
  children?: HtmlNode[]
}

// Rewrites OFM's "Transclude of …" fallback for .excalidraw embeds into the
// placeholder div the excalidraw viewer script mounts on.
function excalidrawTranscludes() {
  return (tree: HtmlNode) => {
    const walk = (node: HtmlNode) => {
      if (node.type === "html" && typeof node.value === "string") {
        const match = node.value.match(TRANSCLUDE_RE)
        if (match) {
          node.value = `<div class="excalidraw" data-excalidraw-src="${match[1]}"></div>`
        }
      }
      if (node.children) {
        for (const child of node.children) walk(child)
      }
    }
    walk(tree)
  }
}

export default () => ({
  name: "Excalidraw",
  markdownPlugins() {
    return [excalidrawTranscludes]
  },
  externalResources() {
    return {
      js: [
        {
          script: excalidrawScript,
          loadTime: "afterDOMReady",
          contentType: "inline",
          moduleType: "module",
        },
      ],
      css: [{ content: excalidrawStyle, inline: true }],
    }
  },
})
