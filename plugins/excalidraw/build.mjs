import { build, transform } from "esbuild"
import fs from "fs"
import path from "path"
import * as sass from "sass"

const inlinePlugin = {
  name: "inline-assets",
  setup(b) {
    b.onResolve({ filter: /\.inline(\.(ts|scss))?$/ }, (args) => {
      let file = path.join(args.resolveDir, args.path)
      if (!fs.existsSync(file)) {
        for (const ext of [".ts", ".scss"]) {
          if (fs.existsSync(file + ext)) {
            file += ext
            break
          }
        }
      }
      return { path: file, namespace: "inline-asset" }
    })
    b.onLoad({ filter: /.*/, namespace: "inline-asset" }, async (args) => {
      const source = fs.readFileSync(args.path, "utf8")
      if (args.path.endsWith(".scss")) {
        const css = sass.compileString(source).css
        return { contents: `export default ${JSON.stringify(css)}`, loader: "js" }
      }
      const { code } = await transform(source, { loader: "ts", minify: true })
      return { contents: `export default ${JSON.stringify(code)}`, loader: "js" }
    })
  },
}

await build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  format: "esm",
  platform: "node",
  outfile: "dist/index.js",
  external: ["@quartz-community/*", "node:*"],
  plugins: [inlinePlugin],
})
