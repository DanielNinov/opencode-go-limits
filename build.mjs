// Compiles v1.tsx + v2.tsx + entry.ts + shared.ts + usage.ts to dist/ using the
// same Babel solid preset that @opentui/solid's bun-plugin applies at TUI load
// time. npm packages must ship pre-compiled JS because opencode does not
// transform .tsx from npm.
import { transformAsync } from "@babel/core"
import ts from "@babel/preset-typescript"
import solid from "babel-preset-solid"
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"

mkdirSync("dist", { recursive: true })

for (const [src, out] of [
  ["v1.tsx", "dist/v1.js"],
  ["v2.tsx", "dist/v2.js"],
  ["entry.ts", "dist/tui.js"],
  ["shared.ts", "dist/shared.js"],
  ["usage.ts", "dist/usage.js"],
]) {
  const result = await transformAsync(readFileSync(src, "utf8"), {
    filename: src,
    configFile: false,
    babelrc: false,
    presets: [
      [solid, { moduleName: "@opentui/solid", generate: "universal" }],
      [ts],
    ],
    plugins: src.endsWith(".tsx") ? ["@babel/plugin-syntax-jsx"] : [],
  })
  writeFileSync(out, result.code)
  console.log(`${src} -> ${out}`)
}
