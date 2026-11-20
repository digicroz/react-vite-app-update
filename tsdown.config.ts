import { defineConfig } from "tsdown";

export default defineConfig([
    {
        // React entry: marked as a client module so it also works in RSC frameworks.
        entry: { index: "src/index.ts" },
        format: ["esm", "cjs"],
        platform: "neutral",
        dts: true,
        clean: true,
        sourcemap: true,
        target: "es2020",
        deps: { neverBundle: ["react", "react/jsx-runtime", "react-dom"] },
        outputOptions: { banner: '"use client";' },
    },
    {
        // Framework-agnostic helpers + Vite plugin (Node side).
        entry: { core: "src/core.ts", vite: "src/vite.ts" },
        format: ["esm", "cjs"],
        platform: "neutral",
        dts: true,
        clean: false,
        sourcemap: true,
        target: "es2020",
        deps: { neverBundle: ["vite"] },
    },
]);
