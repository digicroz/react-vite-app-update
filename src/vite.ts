import type { Plugin } from "vite";

export interface AppUpdatePluginOptions {
    /** File emitted into the build output. Default: `version.json` */
    versionFile?: string;
    /** Override the build id. Default: `COMMIT_REF` / `GITHUB_SHA` / `VERCEL_GIT_COMMIT_SHA` (8 chars) + timestamp */
    buildId?: string;
    /**
     * Also emit a Netlify `_headers` file that disables caching of `index.html` and the
     * version file. Default: false (set the headers yourself if you use another host).
     */
    netlifyHeaders?: boolean;
}

function defaultBuildId(): string {
    const env = process.env;
    const sha = env.COMMIT_REF ?? env.GITHUB_SHA ?? env.VERCEL_GIT_COMMIT_SHA ?? env.CF_PAGES_COMMIT_SHA;
    return `${sha ? sha.slice(0, 8) : "local"}-${Date.now()}`;
}

function resolveVersionUrl(base: string | undefined, file: string): string {
    // Only absolute bases can be used safely from any route; fall back to root otherwise.
    const safeBase = base && (base.startsWith("/") || /^https?:\/\//.test(base)) ? base : "/";
    return `${safeBase.endsWith("/") ? safeBase : `${safeBase}/`}${file}`;
}

/**
 * Vite plugin: emits `version.json` on build and injects the build id into the bundle
 * so running tabs can detect a newer deploy.
 */
export function appUpdatePlugin(options: AppUpdatePluginOptions = {}): Plugin {
    const versionFile = options.versionFile ?? "version.json";
    const buildId = options.buildId ?? defaultBuildId();

    return {
        name: "digicroz:app-update",
        config(userConfig, env) {
            const isBuild = env.command === "build";
            return {
                define: {
                    __DIGICROZ_BUILD_ID__: JSON.stringify(isBuild ? buildId : "dev"),
                    __DIGICROZ_VERSION_URL__: JSON.stringify(resolveVersionUrl(userConfig.base, versionFile)),
                },
            };
        },
        generateBundle() {
            this.emitFile({
                type: "asset",
                fileName: versionFile,
                source: JSON.stringify({ buildId }),
            });

            if (options.netlifyHeaders) {
                const noCache = "  Cache-Control: no-cache, no-store, must-revalidate";
                this.emitFile({
                    type: "asset",
                    fileName: "_headers",
                    source: `/index.html\n${noCache}\n/${versionFile}\n${noCache}\n`,
                });
            }
        },
    };
}
