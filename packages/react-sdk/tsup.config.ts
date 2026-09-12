import { defineConfig } from "tsup";

export default defineConfig({
  entry: { index: "src/index.ts" },
  format: ["cjs", "esm"],
  dts: true,
  // Source maps would reference ../src, which is not published, so they
  // would add ~1.7MB per install without ever resolving.
  sourcemap: false,
  clean: true,
  splitting: false,
  // Rollup's treeshaker drops module-level directives, which silently stripped
  // "use client" from the previous published build and broke every Next App
  // Router consumer. Leave it off and let the banner below survive.
  treeshake: false,
  banner: { js: '"use client";' },
  external: [
    "react",
    "react-dom",
    "@tanstack/react-query",
    "firebase",
    "posthog-js",
  ],
});
