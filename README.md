# OSM Fetcher

Capture location data from `geo:` links in your notes, fetch nearby OpenStreetMap (OSM) features via Overpass, and insert details into the note using simple placeholders.

## Overview

- **Capture coordinates** from a `geo:` link in the current note.
- **Query Overpass** around that location to find nearby OSM features.
- **Pick a feature** from a list.
- **Update the note**:
  - Frontmatter is updated with coordinates and the `geo:` link.
  - OSM placeholders in the note are filled from the selected feature (raw JSON only where you use `{=osm:osm_raw=}`).

## Workflow

1. Add a `geo:` link to your note body or frontmatter, for example:
   - `geo:51.5074,-0.1278`
   - `geo:51.5074,-0.1278?z=18`
2. Run the command **“Capture location from geo link”** while the note is active.
3. The plugin:
   - Parses the first `geo:` link.
   - Updates frontmatter:
     - `coordinates: <lat>, <lon>`
     - `<geoLinkProperty>: geo:...` (defaults to `geo`)
   - Queries your configured Overpass endpoint within the selected radius.
   - Opens a picker with nearby OSM features.
4. After you select a feature, the plugin replaces any `{=osm:...=}` placeholders in the note using that feature.

## OSM placeholders

Placeholders let you insert fields from the selected OSM feature directly into your note content. If you've used my other plugin [OMDb Fetcher](https://github.com/MorayM/omdb-fetcher) then this will be familiar to you!

### Basic syntax

- Use `{=osm:key=}` anywhere in the note (body or frontmatter).
- `key` is matched against the feature’s `tags` object.
- If the tag exists, the placeholder is replaced with the tag value.
- If there is no data for that key, the placeholder is **left unchanged** so it can be filled on a later run when data becomes available.

Examples (for a café feature with `name` and `amenity` tags):

```txt
Name: {=osm:name=}
Type: {=osm:amenity=}
```

### Synthetic placeholders

These do not map directly to a single tag.

- `{=osm:osm_raw=}`  
  - Replaced with pretty-printed JSON for the entire Overpass element, wrapped in a Markdown code block (`` ```json `` … `` ``` ``).

- `{=osm:osm_tags=}`  
  - If the feature has tags, replaced with a Markdown table listing all tag key–value pairs:

    ```txt
    {=osm:osm_tags=}
    ```

    might become:

    ```txt
    | Key | Value |
    | --- | ----- |
    | name | My Café |
    | amenity | cafe |
    ```

  - If the feature has **no tags**, `{=osm:osm_tags=}` is left unchanged.

- `{=osm:address=}`  
  - Replaced with a single-line address built from the feature’s `addr:*` tags. If `addr:full` is present, that value is used (trimmed, newlines turned into spaces). Otherwise, address parts are assembled in the order set in **Settings → Address part order**, separated by comma and space. If there are no address tags, the placeholder is left unchanged.

- `{=osm:map_icon=}`  
  - Replaced with a Lucide icon name (kebab-case, e.g. `coffee`, `hotel`) for the feature type, for use in the map view’s icon property. Uses amenity, shop, tourism, then building (when no other applies), historic, highway, man_made. Fallback: `map-pin`.

### Placeholder behaviour

- Placeholders are processed across the entire note content, including frontmatter.
- Keys are case-sensitive and must match the OSM tag keys exactly (e.g. `addr:housenumber`).
- Unknown keys, or keys without data on the selected feature, are not an error; the placeholder stays in the note for future runs.
- Multiple occurrences of the same placeholder are all replaced when data is available.

## Settings

Under **Settings → Community plugins → OSM Fetcher** you can configure:

- **Search radius (m)**: Distance in meters for the Overpass `around` query.
- **Overpass API endpoint**: URL of the Overpass interpreter. Leave the default unless you use your own instance.
- **Overpass retry attempts**: Number of times to attempt the Overpass API request (including the first try) before giving up on a 504 response (default: `3`).
- **Overpass retry backoff (s)**: Seconds to wait between retry attempts after a 504 response (default: `5`).
- **Geo link frontmatter key**: Frontmatter property name that stores the `geo:` link (default: `geo`).
- **Search everything**:
  - Off: only returns elements with common tags like `name`, `amenity`, `shop`, `tourism`.
  - On: returns all OSM elements within the radius.
- **Address part order**: Comma-separated list of addr part names (e.g. `housenumber`, `street`, `city`, `postcode`, `country`). Used when building `{=osm:address=}` from `addr:*` tags when `addr:full` is not set.

## Privacy and network

- Requests are only sent to the configured Overpass endpoint when you run the command.
- The plugin does not send telemetry or analytics.

## Development

Basic commands for local development:

- `npm install` — install dependencies.
- `npm run dev` — build in watch mode.
- `npm run build` — type-check and build a production bundle.

To use a local build, copy `main.js`, `manifest.json`, and `styles.css` (if present) into your vault’s `.obsidian/plugins/osm-fetcher/` folder and reload Obsidian.

