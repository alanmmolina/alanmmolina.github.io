import { build, transform } from "esbuild"
import fs from "fs"
import path from "path"

const inlinePlugin = {
  name: "inline-scripts",
  setup(b) {
    b.onResolve({ filter: /\.inline(\.ts)?$/ }, (args) => {
      let file = path.join(args.resolveDir, args.path)
      if (!fs.existsSync(file)) file += ".ts"
      return { path: file, namespace: "inline-script" }
    })
    b.onLoad({ filter: /.*/, namespace: "inline-script" }, async (args) => {
      const source = fs.readFileSync(args.path, "utf8")
      const { code } = await transform(source, { loader: "ts", minify: true })
      return { contents: `export default ${JSON.stringify(code)}`, loader: "js" }
    })
  },
}

await build({
  entryPoints: ["src/components.tsx"],
  bundle: true,
  format: "esm",
  outfile: "dist/components.js",
  jsx: "automatic",
  jsxImportSource: "preact",
  external: ["preact", "preact/*", "@quartz-community/types", "@quartz-community/utils"],
  plugins: [inlinePlugin],
})
