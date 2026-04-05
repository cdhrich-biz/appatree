import { build } from "esbuild";
import { rmSync, renameSync, existsSync } from "fs";

const src = "api/trpc/[trpc].ts";
const out = "api/trpc/[trpc].js";

// Build CJS bundle
await build({
  entryPoints: [src],
  bundle: true,
  platform: "node",
  target: "node18",
  format: "cjs",
  outfile: out,
  packages: "external",
});

// Remove .ts source to avoid Vercel conflict
rmSync(src, { force: true });

console.log("✓ API bundled → api/trpc/[trpc].js (source removed)");
