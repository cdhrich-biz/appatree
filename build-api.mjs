import { build } from "esbuild";
import { rmSync } from "fs";

// Clean old .js output if exists
try { rmSync("api/trpc/[trpc].js", { force: true }); } catch {}

await build({
  entryPoints: ["api/trpc/[trpc].ts"],
  bundle: true,
  platform: "node",
  target: "node18",
  format: "cjs",
  outfile: "api/trpc/[trpc].js",
  packages: "external",
  banner: {
    js: "/* bundled by esbuild */",
  },
});

console.log("✓ API serverless function bundled to api/trpc/[trpc].js");
