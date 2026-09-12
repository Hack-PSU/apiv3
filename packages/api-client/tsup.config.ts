import { defineConfig } from "tsup";

export default defineConfig({
  entry: { index: "src/index.ts" },
  format: ["cjs", "esm"],
  dts: true,
  // Source maps would reference ../src, which is not published, so they
  // would add ~1.7MB per install without ever resolving.
  sourcemap: false,
  clean: true,
  treeshake: true,
  splitting: false,
  external: ["react", "react-dom", "@tanstack/react-query"],
  // No "use client" banner here on purpose: this package has no module-scope
  // React state or context, so it works from both server and client components.
  // The client boundary lives in @hackpsu/react-sdk, which owns the providers.
});
