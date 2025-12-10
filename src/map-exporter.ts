import html2canvas from "html2canvas";
import type L from "leaflet";

interface LayerContext {
    routes: L.LayerGroup;
    nodes: L.LayerGroup;
    labels: L.LayerGroup;
    arrows: L.LayerGroup;
    leaders: L.LayerGroup;
}

interface ExportOptions {
    includeBase: boolean;
    includeRoutes: boolean;
    includeLabels: boolean;
}

export async function exportMapImage(
    map: L.Map,
    layers: LayerContext,
    options: ExportOptions,
): Promise<string> {
    const mapContainer = map.getContainer();
    if (!mapContainer) return "";

    const savedState = captureLayerState(map, layers);
    setLayersForExport(map, layers, options);

    try {
        const { width, height } = mapContainer.getBoundingClientRect();

        // Calculate scale to ensure at least 2000px on the smallest side
        const minDim = Math.min(width, height);
        const targetDim = 2000;
        const scale = minDim < targetDim ? targetDim / minDim : 1;

        const canvas = await html2canvas(mapContainer, {
            useCORS: true,
            allowTaint: true,
            backgroundColor: options.includeBase ? null : "transparent",
            scale: scale,
            logging: false,
        });

        return canvas.toDataURL("image/png");
    } finally {
        restoreLayerState(map, layers, savedState);
    }
}

function captureLayerState(map: L.Map, layers: LayerContext): Record<string, boolean> {
    return {
        routes: map.hasLayer(layers.routes),
        nodes: map.hasLayer(layers.nodes),
        labels: map.hasLayer(layers.labels),
        arrows: map.hasLayer(layers.arrows),
        leaders: map.hasLayer(layers.leaders),
    };
}

function setLayersForExport(map: L.Map, layers: LayerContext, options: ExportOptions): void {
    // We already have the view visibility set by the user (checkboxes).
    // The export options here are overrides (e.g. "Base Only").
    // However, if the user hid "arrows" in view, we probably still want to hide them unless "Routes Only" implies arrows too.
    // For simplicity, this export function assumes specific override intent based on button clicks.

    // Nuke everything first to be safe, then add back what is requested
    map.removeLayer(layers.routes);
    map.removeLayer(layers.nodes);
    map.removeLayer(layers.arrows);
    map.removeLayer(layers.labels);
    map.removeLayer(layers.leaders);

    if (options.includeRoutes) {
        map.addLayer(layers.routes);
        map.addLayer(layers.nodes);
        map.addLayer(layers.arrows);
    }
    if (options.includeLabels) {
        map.addLayer(layers.labels);
        map.addLayer(layers.leaders);
    }
}

function restoreLayerState(map: L.Map, layers: LayerContext, state: Record<string, boolean>): void {
    toggleLayer(map, layers.routes, state.routes);
    toggleLayer(map, layers.nodes, state.nodes);
    toggleLayer(map, layers.labels, state.labels);
    toggleLayer(map, layers.arrows, state.arrows);
    toggleLayer(map, layers.leaders, state.leaders);
}

function toggleLayer(map: L.Map, layer: L.LayerGroup, show: boolean) {
    if (show) {
        if (!map.hasLayer(layer)) map.addLayer(layer);
    } else {
        if (map.hasLayer(layer)) map.removeLayer(layer);
    }
}
