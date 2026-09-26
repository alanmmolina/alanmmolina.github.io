import { build } from "esbuild"

await build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  format: "esm",
  platform: "node",
  outfile: "dist/index.js",
  external: ["@quartz-community/*", "node:*"],
})
