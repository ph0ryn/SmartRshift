import { rm, mkdir, cp } from "node:fs/promises";

const DIST = "./dist";
const entries = [...new Bun.Glob("src/*.ts").scanSync()];

// clean & prepare
await rm(DIST, { force: true, recursive: true });
await mkdir(DIST, { recursive: true });

// copy public
await cp("./public", DIST, { recursive: true });

// build
const result = await Bun.build({
  entrypoints: entries,
  format: "esm",
  minify: process.argv.includes("--prod"),
  outdir: DIST,
  sourcemap: "external",
  target: "browser",
});

if (!result.success) {
  console.error("Build failed:");
  for (const log of result.logs) {
    console.error(log);
  }
  process.exit(1);
}

console.log(
  "Build done:",
  result.outputs.map((o) => o.path),
);
