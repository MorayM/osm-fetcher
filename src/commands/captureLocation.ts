import { MarkdownView, Notice } from "obsidian";
import type OMapsFetcherPlugin from "../main";
import { parseGeoLink } from "../utils/geo";
import { parseFrontmatter, removeGeoLinkFromBody, updateFrontmatter } from "../utils/frontmatter";
import { queryOverpass } from "../utils/overpass";
import { FeaturePickerModal } from "../ui/FeaturePickerModal";
import type { OverpassElement } from "../types";
import { applyOsmTemplate } from "../utils/osmTemplate";

export async function captureLocationFromGeoLink(plugin: OMapsFetcherPlugin): Promise<void> {
	const view = plugin.app.workspace.getActiveViewOfType(MarkdownView);
	if (!view?.file) {
		new Notice("No active note.");
		return;
	}

	const content = await plugin.app.vault.read(view.file);
	const parsed = parseFrontmatter(content);
	const geoInBody = parseGeoLink(parsed.body);
	const geo = parseGeoLink(content);
	if (!geo) {
		new Notice("No geo link found in this note.");
		return;
	}

	const coordinatesStr = `${geo.lat}, ${geo.lon}`;
	let newContent = updateFrontmatter(content, {
		coordinates: coordinatesStr,
		geoLink: geo.rawLink,
		geoLinkKey: plugin.settings.geoLinkProperty,
	});
	if (plugin.settings.deleteGeoLinkFromBodyAfterCapture && geoInBody) {
		newContent = removeGeoLinkFromBody(newContent, geo.rawLink);
	}
	await plugin.app.vault.modify(view.file, newContent);

	let elements: OverpassElement[];
	new Notice("Querying Overpass API…");
	try {
		elements = await queryOverpass(
			plugin.settings.overpassEndpoint,
			geo.lat,
			geo.lon,
			plugin.settings.radiusMeters,
			plugin.settings.searchAllFeatures,
			`${plugin.manifest.id}/${plugin.manifest.version} (Obsidian plugin; +${plugin.manifest.authorUrl ?? "https://github.com/MorayM/osm-fetcher"})`
		);
	} catch (e) {
		new Notice("Overpass request failed: " + (e instanceof Error ? e.message : String(e)));
		return;
	}

	if (elements.length === 0) {
		new Notice("No OSM features found in radius.");
		return;
	}

	new FeaturePickerModal(plugin.app, elements, (selected) => {
		void plugin.app.vault.process(view.file!, (body) => {
			const { content } = applyOsmTemplate(body, selected, {
				addressPartOrder: plugin.settings.addressPartOrder,
			});
			return content;
		});
		 
		new Notice("OSM feature appended.");
	}).open();
}
