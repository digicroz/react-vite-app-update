import { describe, expect, it, vi } from "vitest";

import { appUpdatePlugin } from "../src/vite";

type AnyFn = (...args: any[]) => any;

function run(options?: Parameters<typeof appUpdatePlugin>[0]) {
    const plugin = appUpdatePlugin({ buildId: "test-id", ...options });
    const config = (cmd: "build" | "serve", base?: string) =>
        (plugin.config as AnyFn)({ base }, { command: cmd, mode: "production" });
    const emitFile = vi.fn();
    (plugin.generateBundle as AnyFn).call({ emitFile });
    return { config, emitFile };
}

describe("appUpdatePlugin", () => {
    it("defines the build id for builds and 'dev' for serve", () => {
        const { config } = run();
        expect(config("build").define.__DIGICROZ_BUILD_ID__).toBe('"test-id"');
        expect(config("serve").define.__DIGICROZ_BUILD_ID__).toBe('"dev"');
    });

    it("respects Vite base for the version url", () => {
        const { config } = run();
        expect(config("build").define.__DIGICROZ_VERSION_URL__).toBe('"/version.json"');
        expect(config("build", "/admin/").define.__DIGICROZ_VERSION_URL__).toBe('"/admin/version.json"');
        expect(config("build", "/admin").define.__DIGICROZ_VERSION_URL__).toBe('"/admin/version.json"');
        expect(config("build", "./").define.__DIGICROZ_VERSION_URL__).toBe('"/version.json"');
    });

    it("emits version.json", () => {
        const { emitFile } = run();
        expect(emitFile).toHaveBeenCalledTimes(1);
        expect(emitFile).toHaveBeenCalledWith({
            type: "asset",
            fileName: "version.json",
            source: '{"buildId":"test-id"}',
        });
    });

    it("emits Netlify _headers only when asked", () => {
        const { emitFile } = run({ netlifyHeaders: true });
        expect(emitFile).toHaveBeenCalledTimes(2);
        const headers = emitFile.mock.calls[1][0];
        expect(headers.fileName).toBe("_headers");
        expect(headers.source).toContain("/index.html");
        expect(headers.source).toContain("/version.json");
    });
});
