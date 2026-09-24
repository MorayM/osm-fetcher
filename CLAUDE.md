# CLAUDE.md

## Project overview

OSM Fetcher is an Obsidian community plugin (TypeScript, bundled to `main.js` via esbuild). It parses a `geo:` link in the active note, queries the Overpass API for nearby OpenStreetMap features, lets the user pick one, and fills `{=osm:...=}` placeholders in the note from the selected feature's tags. See `README.md` for the full user-facing workflow and placeholder syntax.

## Commands

```bash
npm install       # install dependencies
npm run dev        # esbuild in watch mode
npm run build       # tsc -noEmit type-check, then production esbuild bundle
npm run lint        # eslint .
```

There is no test suite in this repo — do not assume one exists.

To manually test a build, copy `main.js`, `manifest.json`, and `styles.css` into `<Vault>/.obsidian/plugins/osm-fetcher/` and reload Obsidian (this repo *is* that plugin folder inside a live vault, so a build in place is already "installed" — just reload Obsidian).

CI (`.github/workflows/lint.yml`) runs `npm run build` and `npm run lint` on Node 20.x and 22.x for every push/PR branch.

## Architecture

Single command pipeline, entry point `src/main.ts` → `captureLocationFromGeoLink` (`src/commands/captureLocation.ts`), which chains together the modules in `src/utils/` and `src/ui/`:

1. **`utils/geo.ts`** — `parseGeoLink` extracts the first `geo:<lat>,<lon>` link from raw note content (body or frontmatter).
2. **`utils/frontmatter.ts`** — a hand-rolled, minimal frontmatter parser/writer (not a YAML library). `parseFrontmatter` splits content into `fields`/`body`/`hadFrontmatter`; `updateFrontmatter` sets `coordinates` and the configurable geo-link key only when missing/empty, preserving existing values and untouched lines (including indented/multiline values, which are passed through as-is). `removeGeoLinkFromBody` strips the raw `geo:` link from the body only, never from frontmatter.
3. **`utils/overpass.ts`** — `queryOverpass` builds an Overpass QL query (filtered to `name`/`amenity`/`shop`/`tourism` tags unless "search everything" is on) and POSTs it via Obsidian's `requestUrl` (not `fetch`, for CORS/mobile compatibility).
4. **`ui/FeaturePickerModal.ts`** — a `Modal` listing returned Overpass elements for the user to pick one; label falls back through `name` → `amenity` → `shop` → `tourism` → `"<type> <id>"`.
5. **`utils/osmTemplate.ts`** — `applyOsmTemplate` runs a single regex pass (`{=osm:key=}`) over note content, resolving synthetic keys (`osm_raw`, `osm_tags`, `address`, `map_icon`) before falling back to a direct tag lookup on the selected element. Placeholders with no matching data are left in place untouched (by design, so a later run can fill them once data exists) — do not "fix" this into an error or an empty-string replacement.
6. **`utils/osmMapIcon.ts`** — maps OSM tags (amenity, shop, tourism, building, historic, highway, man_made, in that priority order) to a Lucide icon name for `{=osm:map_icon=}`, defaulting to `map-pin`.

Settings (`src/settings.ts`) are persisted via `loadData()`/`saveData()` and include the Overpass endpoint, search radius, search-everything toggle, geo-link frontmatter key, delete-after-capture toggle, and the address part order used by `formatAddress` in `osmTemplate.ts`.

`src/types.ts` holds the shared `GeoLink` and Overpass API (`OverpassElement`/`OverpassResponse`) types.

## Conventions specific to this repo

- Keep `main.ts` limited to plugin lifecycle (`onload`/`onunload`, command/setting-tab registration); feature logic belongs in `src/commands/`, `src/utils/`, or `src/ui/`.
- ESLint uses `eslint-plugin-obsidianmd` with `obsidianmd/ui/sentence-case` enforced as an error (autofixable) — user-facing strings (setting names, notices, command names) must be sentence case. `Overpass` and `OpenStreetMap` are configured brand exceptions; `OSM`, `API`, `ID` are configured acronym exceptions.
- Network requests go through Obsidian's `requestUrl`, not the global `fetch`.
- The plugin only ever talks to the user-configured Overpass endpoint, and only when the capture command is run — no telemetry, no other network calls.
- `manifest.json`'s `id` (`osm-fetcher`) must match this folder name under `.obsidian/plugins/` and must never change once released; `version` is bumped via `npm run version` (runs `version-bump.mjs`, which also updates `versions.json`).
