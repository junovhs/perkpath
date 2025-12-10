import type { RouteType, Segment } from "./types";

export function renderLegend(segments: Segment[], routeTypes: RouteType[]): void {
    const legendItems = document.getElementById("legendItems");
    if (!legendItems) return;

    const usedTransports = new Set(segments.map((s) => s.transport.toLowerCase()));
    legendItems.innerHTML = "";

    const typesToRender = routeTypes.filter((rt) => usedTransports.has(rt.id.toLowerCase()));

    for (const rt of typesToRender) {
        const item = createLegendItem(rt);
        legendItems.appendChild(item);
    }
}

function createLegendItem(rt: RouteType): HTMLDivElement {
    const item = document.createElement("div");
    item.className = "legend-item";

    const line = document.createElement("div");
    line.className = `legend-line ${rt.lineStyle === "dashed" ? "dashed" : ""}`;
    line.style.backgroundColor = rt.lineStyle === "dashed" ? "transparent" : rt.color;
    line.style.color = rt.color;
    if (rt.lineStyle !== "dashed") line.style.background = rt.color;

    const label = document.createElement("span");
    label.textContent = rt.name;

    item.appendChild(line);
    item.appendChild(label);
    return item;
}
