import { build } from "esbuild";

await build({
  entryPoints: ["api/trpc/[trpc].ts"],
  bundle: true,
  platform: "node",
  target: "node18",
  format: "cjs",
  outdir: "api/trpc",
  outExtension: { ".js": ".js" },
  packages: "external",
  allowOverwrite: true,
});

console.log("API serverless function built successfully.");
