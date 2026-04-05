import { build } from "esbuild";
import { mkdirSync } from "fs";

mkdirSync("api/trpc", { recursive: true });

await build({
  entryPoints: ["_api-src/trpc/handler.ts"],
  bundle: true,
  platform: "node",
  target: "node18",
  format: "cjs",
  outfile: "api/trpc/[trpc].js",
  packages: "external",
});

console.log("✓ API bundled → api/trpc/[trpc].js");
