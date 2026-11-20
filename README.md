# @digicroz/react-vite-app-update

Tell users when a new version of your Vite + React app has been deployed, so they don't keep running a stale tab against a newer backend.

- **Vite plugin** – writes `version.json` on every build and bakes the same build id into the bundle.
- **`<UpdateBanner />`** – polls `version.json` (every minute and when the tab regains focus) and shows a "Refresh" banner pinned above everything.
- **Stale-chunk safety net** – if a lazy chunk 404s after a deploy, the page reloads itself once (loop-proof).
- Zero runtime dependencies, no CSS setup. Works with React `>=17` and Vite `>=5`. Ships ESM + CJS + types and a `"use client"` directive.

## Setup

**1. Install**

```bash
npm i @digicroz/react-vite-app-update
```

**2. Add the plugin** – `vite.config.ts`

```ts
import { appUpdatePlugin } from "@digicroz/react-vite-app-update/vite";

export default defineConfig({
    plugins: [react(), appUpdatePlugin()],
});
```

**3. Render the banner once** – in your root component, above the router outlet

```tsx
import { UpdateBanner } from "@digicroz/react-vite-app-update";

<UpdateBanner />;
```

That's it.

## Caching (important)

`index.html` and `version.json` must not be cached, or users never see the new build.

- **Netlify:** `appUpdatePlugin({ netlifyHeaders: true })` emits a `_headers` file for you. (If you already have `public/_headers`, add the rules there instead.)
- **Other hosts:** send `Cache-Control: no-cache` for `/index.html` and `/version.json`. Hashed files in `/assets/*` can stay cached forever.

## Fixed headers

The banner pads `<body>` and sets `--update-banner-h` while visible. If your header is `position: fixed`, offset it:

```css
header { top: var(--update-banner-h, 0px); }
```

## Testing in dev

`vite dev` has no `version.json`, so polling is off. Preview the banner from the browser console:

```js
window.dispatchEvent(new Event("app:update-available"));
```

To test real detection: `vite build && vite preview`, open the app, run `vite build` again, then switch back to the tab (or wait up to a minute).

## API

### `appUpdatePlugin(options?)` — `@digicroz/react-vite-app-update/vite`

| Option           | Default                          | Description                                                                                              |
| ---------------- | -------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `versionFile`    | `"version.json"`                 | File emitted into the build output.                                                                      |
| `buildId`        | commit sha (8 chars) + timestamp | Override the build id. Reads `COMMIT_REF`, `GITHUB_SHA`, `VERCEL_GIT_COMMIT_SHA`, `CF_PAGES_COMMIT_SHA`. |
| `netlifyHeaders` | `false`                          | Also emit a Netlify `_headers` file with no-cache rules.                                                 |

The version URL respects Vite's `base` (absolute bases only).

### `<UpdateBanner />`

| Prop                 | Default                                | Description                                            |
| -------------------- | -------------------------------------- | ------------------------------------------------------ |
| `title`              | `"New version available."`             | Bold headline.                                         |
| `description`        | `"Refresh to get the latest updates…"` | Secondary text (hidden on small screens).              |
| `actionLabel`        | `"Refresh"`                            | Button label.                                          |
| `pushContent`        | `true`                                 | Pad the body / set `--update-banner-h` while visible.  |
| `renderBanner`       | –                                      | `({ reload }) => ReactElement \| null` to replace the default UI. |
| `intervalMs`         | `60000`                                | Poll interval.                                         |
| `versionUrl`         | from plugin                            | Override the version file URL.                         |
| `reloadOnStaleChunk` | `true`                                 | Auto-reload once on lazy-chunk load failure.           |
| `onUpdateAvailable`  | –                                      | Called once when an update is detected.                |

### `useAppUpdate(options?)`

Headless version for fully custom UI: returns `{ updateAvailable, reload }`.

```tsx
const { updateAvailable, reload } = useAppUpdate();
```

### Helpers

`isStaleBundleError(error)`, `reloadOnceSafely()`, `registerStaleBundleReload()`, `fetchLatestBuildId()`, `getCurrentBuildId()`, `simulateUpdateAvailable()`. Also available from `@digicroz/react-vite-app-update/core` without React.

Use `isStaleBundleError` in your router's error component to show "A new version is available" and call `reloadOnceSafely()`:

```tsx
// TanStack Router example
errorComponent: ({ error }) => {
    const stale = isStaleBundleError(error);
    useEffect(() => { if (stale) reloadOnceSafely(); }, [stale]);
    return <ErrorScreen stale={stale} />;
}
```

## Development

Built with [tsdown](https://tsdown.dev) (Rolldown), linted with [oxlint](https://oxc.rs), tested with Vitest.

```bash
npm run check   # typecheck + lint + tests
npm run build
```

## License

MIT
