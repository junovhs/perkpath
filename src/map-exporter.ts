import html2canvas from "html2canvas";
import type L from "leaflet";
import type { ExportOptions } from "./types";

interface LayerContext {
    routes: L.LayerGroup;
    nodes: L.LayerGroup;
    labels: L.LayerGroup;
    arrows: L.LayerGroup;
    leaders: L.LayerGroup;
}

export async function exportMapImage(
    map: L.Map,
    layers: LayerContext,
    options: ExportOptions,
): Promise<string> {
    const mapContainer = map.getContainer();
    if (!mapContainer) return "";

    const hiddenUI = hideElements(mapContainer, [
        ".zoom-slider-container",
        ".leaflet-control-container",
    ]);

    const hiddenLayers = hideLayers(layers, options);

    const tilePane = mapContainer.querySelector(".leaflet-tile-pane") as HTMLElement;
    if (tilePane && !options.includeBase) {
        tilePane.style.visibility = "hidden";
    }

    await delay(200);

    try {
        const rect = mapContainer.getBoundingClientRect();
        const targetDim = 2000;
        const scale = Math.max(targetDim / rect.width, targetDim / rect.height, 1);

        const canvas = await html2canvas(mapContainer, {
            useCORS: true,
            allowTaint: true,
            backgroundColor: options.includeBase ? null : "transparent",
            scale: scale,
            logging: false,
            removeContainer: true,
        });

        return canvas.toDataURL("image/png");
    } finally {
        restoreElements(hiddenUI);
        showLayers(hiddenLayers);
        if (tilePane) {
            tilePane.style.visibility = "";
        }
    }
}

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function hideElements(container: HTMLElement, selectors: string[]): HTMLElement[] {
    const hidden: HTMLElement[] = [];
    for (const selector of selectors) {
        const el = container.querySelector(selector) as HTMLElement;
        if (el) {
            el.style.visibility = "hidden";
            hidden.push(el);
        }
    }
    return hidden;
}

function restoreElements(elements: HTMLElement[]): void {
    for (const el of elements) {
        el.style.visibility = "";
    }
}

interface HiddenLayer {
    container: HTMLElement;
    original: string;
}

function hideLayers(layers: LayerContext, options: ExportOptions): HiddenLayer[] {
    const hidden: HiddenLayer[] = [];

    const hide = (layer: L.LayerGroup) => {
        const container = (layer as unknown as { _container?: HTMLElement })._container;
        if (container) {
            hidden.push({ container, original: container.style.visibility });
            container.style.visibility = "hidden";
        }
    };

    if (!options.includeRoutes) hide(layers.routes);
    if (!options.includeNodes) hide(layers.nodes);
    if (!options.includeArrows) hide(layers.arrows);
    if (!options.includeLabels) {
        hide(layers.labels);
        hide(layers.leaders);
    }

    return hidden;
}

function showLayers(hidden: HiddenLayer[]): void {
    for (const { container, original } of hidden) {
        container.style.visibility = original;
    }
}
