import { useCallback, useEffect, useState } from "react";

import {
    UPDATE_AVAILABLE_EVENT,
    fetchLatestBuildId,
    getCurrentBuildId,
    getDefaultVersionUrl,
    isDevBuild,
    registerStaleBundleReload,
} from "./core";

export interface UseAppUpdateOptions {
    /** How often to poll the version file, in ms. Default: 60000 */
    intervalMs?: number;
    /** Version file URL. Default: set by the Vite plugin (respects `base`) */
    versionUrl?: string;
    /** Auto-reload once when a lazy chunk fails to load. Default: true */
    reloadOnStaleChunk?: boolean;
    /** Called once when a new version is detected. */
    onUpdateAvailable?: () => void;
}

export interface UseAppUpdateResult {
    /** True once a newer deploy has been detected. */
    updateAvailable: boolean;
    /** Reloads the page to load the new version. */
    reload: () => void;
}

/**
 * Detects a newer deploy: polls the version file every `intervalMs` and whenever the
 * tab becomes visible again. Also installs the stale-chunk auto-reload safety net.
 */
export function useAppUpdate(options: UseAppUpdateOptions = {}): UseAppUpdateResult {
    const { intervalMs = 60_000, versionUrl, reloadOnStaleChunk = true, onUpdateAvailable } = options;
    const [updateAvailable, setUpdateAvailable] = useState(false);

    const reload = useCallback(() => window.location.reload(), []);

    useEffect(() => {
        if (!reloadOnStaleChunk) return;
        return registerStaleBundleReload();
    }, [reloadOnStaleChunk]);

    useEffect(() => {
        const show = (): void => setUpdateAvailable(true);
        // Always listen, so the banner can be previewed in dev.
        window.addEventListener(UPDATE_AVAILABLE_EVENT, show);
        const removeListener = (): void => window.removeEventListener(UPDATE_AVAILABLE_EVENT, show);

        const current = getCurrentBuildId();
        if (current === null) {
            console.warn("[react-vite-app-update] Build id not found. Did you add appUpdatePlugin() to vite.config?");
            return removeListener;
        }
        if (isDevBuild()) return removeListener;

        let cancelled = false;
        const check = async (): Promise<void> => {
            const latest = await fetchLatestBuildId(versionUrl ?? getDefaultVersionUrl());
            if (!cancelled && latest && latest !== current) show();
        };
        const onVisible = (): void => {
            if (document.visibilityState === "visible") void check();
        };

        void check();
        const interval = setInterval(() => void check(), intervalMs);
        document.addEventListener("visibilitychange", onVisible);

        return () => {
            cancelled = true;
            clearInterval(interval);
            document.removeEventListener("visibilitychange", onVisible);
            removeListener();
        };
    }, [intervalMs, versionUrl]);

    // Fire the callback once on the false -> true transition.
    useEffect(() => {
        if (updateAvailable) onUpdateAvailable?.();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [updateAvailable]);

    return { updateAvailable, reload };
}
