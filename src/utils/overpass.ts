import { requestUrl } from "obsidian";
import type { OverpassResponse, OverpassElement } from "../types";

const DEFAULT_TAGS = ["name", "amenity", "shop", "tourism"];

function buildFilteredQuery(lat: number, lon: number, radiusMeters: number): string {
	const parts: string[] = [];
	for (const tag of DEFAULT_TAGS) {
		parts.push(`node(around:${radiusMeters},${lat},${lon})["${tag}"];`);
		parts.push(`way(around:${radiusMeters},${lat},${lon})["${tag}"];`);
		parts.push(`relation(around:${radiusMeters},${lat},${lon})["${tag}"];`);
	}
	return `[out:json][timeout:25];(${parts.join("")});out body;`;
}

function buildUnfilteredQuery(lat: number, lon: number, radiusMeters: number): string {
	return `[out:json][timeout:25];(node(around:${radiusMeters},${lat},${lon});way(around:${radiusMeters},${lat},${lon});relation(around:${radiusMeters},${lat},${lon}););out body;`;
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface OverpassRetryOptions {
	/** Total attempts, including the first; must be at least 1. */
	maxAttempts: number;
	/** Fixed delay between attempts, in seconds. */
	backoffSeconds: number;
	onRetry?: (attempt: number, maxAttempts: number, backoffSeconds: number) => void;
}

export async function queryOverpass(
	endpoint: string,
	lat: number,
	lon: number,
	radiusMeters: number,
	searchAllFeatures: boolean,
	userAgent: string,
	retry: OverpassRetryOptions
): Promise<OverpassElement[]> {
	const query = searchAllFeatures
		? buildUnfilteredQuery(lat, lon, radiusMeters)
		: buildFilteredQuery(lat, lon, radiusMeters);

	for (let attempt = 1; attempt <= retry.maxAttempts; attempt++) {
		const res = await requestUrl({
			url: endpoint,
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
				// Overpass rejects requests with a missing/generic User-Agent (406 Not Acceptable).
				"User-Agent": userAgent,
			},
			body: "data=" + encodeURIComponent(query),
			throw: false,
		});

		// Overpass returns 504 when it's overloaded; this is often transient, so retry before giving up.
		if (res.status === 504 && attempt < retry.maxAttempts) {
			retry.onRetry?.(attempt, retry.maxAttempts, retry.backoffSeconds);
			await sleep(retry.backoffSeconds * 1000);
			continue;
		}

		if (res.status < 200 || res.status >= 300) {
			throw new Error(`Overpass API error: ${res.status}`);
		}

		const data = res.json as OverpassResponse;
		if (!data.elements || !Array.isArray(data.elements)) {
			throw new Error("Invalid Overpass response");
		}
		return data.elements;
	}

	throw new Error("Overpass API error: 504");
}
