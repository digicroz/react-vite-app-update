import { useEffect } from "react";
import type { ReactElement } from "react";

import { useAppUpdate } from "./useAppUpdate";
import type { UseAppUpdateOptions } from "./useAppUpdate";

const BANNER_HEIGHT_PX = 48;

const CSS = `
.rvau-banner{position:fixed;top:0;left:0;right:0;height:${BANNER_HEIGHT_PX}px;z-index:2147483000;display:flex;align-items:center;justify-content:center;gap:12px;padding:0 12px;box-sizing:border-box;color:#fff;font:500 14px/1.2 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background:linear-gradient(90deg,#4f46e5,#7c3aed,#c026d3);box-shadow:0 4px 14px rgba(49,46,129,.25);animation:rvau-in .35s cubic-bezier(.2,.8,.2,1) both}
.rvau-icon{display:flex;flex:none;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;background:rgba(255,255,255,.2)}
.rvau-text{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin:0}
.rvau-sub{opacity:.9}
.rvau-btn{display:inline-flex;flex:none;align-items:center;gap:6px;border:0;border-radius:999px;background:#fff;color:#4338ca;padding:6px 14px;font:600 12px/1 inherit;font-family:inherit;cursor:pointer;transition:background .15s,transform .1s}
.rvau-btn:hover{background:#eef2ff}
.rvau-btn:active{transform:scale(.95)}
@media (max-width:639px){.rvau-sub{display:none}}
@media (prefers-reduced-motion:reduce){.rvau-banner{animation:none}}
@keyframes rvau-in{from{transform:translateY(-100%)}to{transform:none}}
`;

export interface UpdateBannerRenderProps {
    reload: () => void;
}

export interface UpdateBannerProps extends UseAppUpdateOptions {
    /** Bold headline. Default: "New version available." */
    title?: string;
    /** Secondary text, hidden on small screens. */
    description?: string;
    /** Button label. Default: "Refresh" */
    actionLabel?: string;
    /**
     * Push the page down while the banner is visible (pads `<body>` and sets the
     * `--update-banner-h` CSS variable for fixed headers). Default: true
     */
    pushContent?: boolean;
    /** Replace the default banner UI entirely. */
    renderBanner?: (props: UpdateBannerRenderProps) => ReactElement | null;
}

/**
 * Drop-in "new version available" banner pinned above everything.
 * For fixed headers use `top: var(--update-banner-h, 0px)`.
 */
export function UpdateBanner(props: UpdateBannerProps): ReactElement | null {
    const {
        title = "New version available.",
        description = "Refresh to get the latest updates and avoid errors.",
        actionLabel = "Refresh",
        pushContent = true,
        renderBanner,
        ...hookOptions
    } = props;

    const { updateAvailable, reload } = useAppUpdate(hookOptions);
    const usingDefaultUi = !renderBanner;

    useEffect(() => {
        if (!updateAvailable || !pushContent || !usingDefaultUi) return;
        const root = document.documentElement;
        const previousPadding = document.body.style.paddingTop;
        root.style.setProperty("--update-banner-h", `${BANNER_HEIGHT_PX}px`);
        document.body.style.paddingTop = `${BANNER_HEIGHT_PX}px`;
        return () => {
            root.style.removeProperty("--update-banner-h");
            document.body.style.paddingTop = previousPadding;
        };
    }, [updateAvailable, pushContent, usingDefaultUi]);

    if (!updateAvailable) return null;
    if (renderBanner) return renderBanner({ reload });

    return (
        <div role="alert" className="rvau-banner">
            <style>{CSS}</style>
            <span className="rvau-icon" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" />
                </svg>
            </span>
            <p className="rvau-text">
                <strong>{title}</strong>
                {description ? <span className="rvau-sub"> {description}</span> : null}
            </p>
            <button type="button" className="rvau-btn" onClick={reload}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M21 12a9 9 0 1 1-3-6.7" />
                    <path d="M21 3v6h-6" />
                </svg>
                {actionLabel}
            </button>
        </div>
    );
}
