/**
 * Framework-agnostic helpers. No React, no Vite.
 *
 * `__DIGICROZ_BUILD_ID__` and `__DIGICROZ_VERSION_URL__` are replaced at build time
 * by the Vite plugin (`@digicroz/react-vite-app-update/vite`).
 */
declare const __DIGICROZ_BUILD_ID__: string | undefined;
declare const __DIGICROZ_VERSION_URL__: string | undefined;

/** Event name used to simulate an update in dev: `window.dispatchEvent(new Event(UPDATE_AVAILABLE_EVENT))` */
export const UPDATE_AVAILABLE_EVENT = "app:update-available";

const RELOAD_GUARD_KEY = "app-update:last-auto-reload";
const RELOAD_GUARD_MS = 30_000;

/** Build id baked into the running bundle, or null if the Vite plugin is not installed. */
export function getCurrentBuildId(): string | null {
    return typeof __DIGICROZ_BUILD_ID__ === "string" ? __DIGICROZ_BUILD_ID__ : null;
}

/** URL of the version file as configured by the plugin (respects Vite `base`). */
export function getDefaultVersionUrl(): string {
    return typeof __DIGICROZ_VERSION_URL__ === "string" ? __DIGICROZ_VERSION_URL__ : "/version.json";
}

/** True when running under `vite dev` (no version file exists). */
export function isDevBuild(): boolean {
    return getCurrentBuildId() === "dev";
}

/** Fetches the build id of the latest deploy. Returns null if it can't be determined. */
export async function fetchLatestBuildId(versionUrl: string = getDefaultVersionUrl()): Promise<string | null> {
    try {
        const separator = versionUrl.includes("?") ? "&" : "?";
        const res = await fetch(`${versionUrl}${separator}t=${Date.now()}`, { cache: "no-store" });
        if (!res.ok) return null;
        // With an SPA catch-all redirect a missing file returns HTML, so guard the parse.
        const contentType = res.headers.get("content-type") ?? "";
        if (!contentType.includes("json")) return null;
        const data = (await res.json()) as { buildId?: unknown };
        return typeof data.buildId === "string" ? data.buildId : null;
    } catch {
        return null;
    }
}

/**
 * Reloads the page at most once per 30s so a persistent error can never cause a
 * reload loop. Returns true if a reload was triggered.
 */
export function reloadOnceSafely(): boolean {
    try {
        const last = Number(sessionStorage.getItem(RELOAD_GUARD_KEY) ?? 0);
        if (Date.now() - last < RELOAD_GUARD_MS) return false;
        sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()));
    } catch {
        // sessionStorage unavailable: don't risk a loop
        return false;
    }
    window.location.reload();
    return true;
}

const STALE_BUNDLE_ERROR_PATTERN =
    /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload CSS|Loading chunk .* failed|Loading CSS chunk/i;

/** True if the error means a lazy chunk no longer exists on the server (stale tab after a deploy). */
export function isStaleBundleError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error ?? "");
    return STALE_BUNDLE_ERROR_PATTERN.test(message);
}

/**
 * Auto-reloads (once) when a lazy chunk fails to load. Returns a cleanup function.
 * Safe to call multiple times: each call returns its own cleanup.
 */
export function registerStaleBundleReload(): () => void {
    if (typeof window === "undefined") return () => {};

    const onPreloadError = (event: Event): void => {
        event.preventDefault();
        reloadOnceSafely();
    };
    const onRejection = (event: PromiseRejectionEvent): void => {
        if (isStaleBundleError(event.reason)) reloadOnceSafely();
    };

    window.addEventListener("vite:preloadError", onPreloadError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
        window.removeEventListener("vite:preloadError", onPreloadError);
        window.removeEventListener("unhandledrejection", onRejection);
    };
}

/** Dev helper: pretend a new version was deployed so you can preview the banner. */
export function simulateUpdateAvailable(): void {
    window.dispatchEvent(new Event(UPDATE_AVAILABLE_EVENT));
}
