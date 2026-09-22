import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

const require = createRequire(import.meta.url);
// Use the bundler already installed by our Vitest/Vite toolchain.
const vitePath = require.resolve("vite", { paths: [require.resolve("vitest")] });
const { build } = require(require.resolve("esbuild", { paths: [vitePath] }));
const assuranceRequire = createRequire(
  new URL("../../../../../packages/assurance/package.json", import.meta.url),
);

it("bundles the actual Control Room browser graph through the assurance package exports", async () => {
  const result = await build({
    entryPoints: [fileURLToPath(new URL("./control-room.tsx", import.meta.url))],
    bundle: true,
    platform: "browser",
    jsx: "automatic",
    write: false,
    outdir: "browser-probe",
    metafile: true,
    logLevel: "silent",
    plugins: [
      {
        name: "worktree-package-exports",
        setup(plugin: {
          onResolve: (
            options: { filter: RegExp },
            resolve: (args: { path: string }) => { path: string },
          ) => void;
        }) {
          // Resolve the real worktree package's exports. Never substitute a source
          // module: a root import must still reach index.ts and fail on node:crypto.
          plugin.onResolve({ filter: /^@reins\/assurance(?:\/|$)/ }, (args) => ({
            path: assuranceRequire.resolve(args.path),
          }));
        },
      },
    ],
  });
  expect(result.errors).toEqual([]);
  expect(
    Object.keys(result.metafile.inputs).some((path) => path.endsWith("control-room-scenarios.ts")),
  ).toBe(true);
  expect(
    Object.keys(result.metafile.inputs).some((path) => path.endsWith("assurance/src/index.ts")),
  ).toBe(false);
});
