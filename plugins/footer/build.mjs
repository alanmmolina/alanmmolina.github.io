import { build } from "esbuild"

await build({
  entryPoints: ["src/components.tsx"],
  bundle: true,
  format: "esm",
  outfile: "dist/components.js",
  jsx: "automatic",
  jsxImportSource: "preact",
  external: ["preact", "preact/*", "@quartz-community/types"],
})
