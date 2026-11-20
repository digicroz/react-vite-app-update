import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchLatestBuildId, getCurrentBuildId, isStaleBundleError } from "../src/core";

afterEach(() => {
    vi.unstubAllGlobals();
});

function stubFetch(body: string, init: { ok?: boolean; contentType?: string } = {}): void {
    vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
            ok: init.ok ?? true,
            headers: new Headers({ "content-type": init.contentType ?? "application/json" }),
            json: () => Promise.resolve(JSON.parse(body)),
        }),
    );
}

describe("fetchLatestBuildId", () => {
    it("returns the build id", async () => {
        stubFetch('{"buildId":"abc-1"}');
        expect(await fetchLatestBuildId("/version.json")).toBe("abc-1");
    });

    it("returns null when the SPA fallback serves HTML", async () => {
        stubFetch("{}", { contentType: "text/html" });
        expect(await fetchLatestBuildId("/version.json")).toBeNull();
    });

    it("returns null on non-ok responses and network errors", async () => {
        stubFetch("{}", { ok: false });
        expect(await fetchLatestBuildId("/version.json")).toBeNull();
        vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
        expect(await fetchLatestBuildId("/version.json")).toBeNull();
    });

    it("busts the cache and respects existing query strings", async () => {
        stubFetch('{"buildId":"x"}');
        await fetchLatestBuildId("/v.json?a=1");
        const url = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
        expect(url).toMatch(/^\/v\.json\?a=1&t=\d+$/);
    });
});

describe("isStaleBundleError", () => {
    it.each([
        "Failed to fetch dynamically imported module: https://x/assets/a.js",
        "error loading dynamically imported module",
        "Importing a module script failed.",
        "Loading chunk 12 failed.",
    ])("detects: %s", (message) => {
        expect(isStaleBundleError(new Error(message))).toBe(true);
    });

    it("ignores unrelated errors", () => {
        expect(isStaleBundleError(new Error("Cannot read properties of undefined"))).toBe(false);
        expect(isStaleBundleError(undefined)).toBe(false);
    });
});

describe("getCurrentBuildId", () => {
    it("is null when the plugin did not define it", () => {
        expect(getCurrentBuildId()).toBeNull();
    });
});
