import type { GeoLink } from "../types";

const GEO_LINK_REGEX = /geo:(-?[\d.]+),(-?[\d.]+)(?:\?[^\s\]]*)?/i;
const COORDINATE_PAIR_REGEX = /(-?\d+\.\d+), ?(-?\d+\.\d+)/g;

function isValidLatLon(lat: number, lon: number): boolean {
	return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}

/**
 * Find first geo: link in note content (body or frontmatter).
 * Falls back to the first plausible bare lat/lon pair (e.g. "51.5074, -0.1278")
 * if no geo: link is present, synthesizing a geo: URI for it.
 * Returns { lat, lon, rawLink, matchedText } or null.
 */
export function parseGeoLink(content: string): GeoLink | null {
	const match = content.match(GEO_LINK_REGEX);
	if (match && match[1] !== undefined && match[2] !== undefined) {
		const lat = parseFloat(match[1]);
		const lon = parseFloat(match[2]);
		if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
			return { lat, lon, rawLink: match[0], matchedText: match[0] };
		}
	}

	for (const pairMatch of content.matchAll(COORDINATE_PAIR_REGEX)) {
		if (pairMatch[1] === undefined || pairMatch[2] === undefined) continue;
		const lat = parseFloat(pairMatch[1]);
		const lon = parseFloat(pairMatch[2]);
		if (!Number.isNaN(lat) && !Number.isNaN(lon) && isValidLatLon(lat, lon)) {
			return { lat, lon, rawLink: `geo:${lat},${lon}`, matchedText: pairMatch[0] };
		}
	}

	return null;
}
