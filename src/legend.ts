import type { LegendStyle, RouteType, Segment } from "./types";

export function createLegend(
    segments: Segment[],
    routeTypes: RouteType[],
    style: LegendStyle,
): HTMLDivElement {
    const legend = document.getElementById("legend") as HTMLDivElement;
    if (!legend) return document.createElement("div");

    applyLegendStyle(legend, style);
    setupDraggable(legend, style);

    const itemsContainer = legend.querySelector("#legendItems") as HTMLDivElement;
    if (itemsContainer) {
        renderLegendItems(itemsContainer, segments, routeTypes);
    }

    return legend;
}

export function renderLegend(segments: Segment[], routeTypes: RouteType[]): void {
    const legendItems = document.getElementById("legendItems");
    if (!legendItems) return;
    renderLegendItems(legendItems as HTMLDivElement, segments, routeTypes);
}

function renderLegendItems(
    container: HTMLDivElement,
    segments: Segment[],
    routeTypes: RouteType[],
): void {
    const usedTransports = new Set(segments.map((s) => s.transport.toLowerCase()));
    container.innerHTML = "";

    const typesToRender = routeTypes.filter((rt) => usedTransports.has(rt.id.toLowerCase()));

    for (const rt of typesToRender) {
        const item = createLegendItem(rt);
        container.appendChild(item);
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

function applyLegendStyle(legend: HTMLDivElement, style: LegendStyle): void {
    legend.style.transform = `scale(${style.scale})`;
    legend.style.transformOrigin = "bottom left";
    legend.style.left = `${style.position.x}px`;
    legend.style.bottom = `${style.position.y}px`;
    legend.style.cursor = "move"; // Indicate draggable
}

function setupDraggable(legend: HTMLDivElement, style: LegendStyle): void {
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let startLeft = style.position.x;
    let startBottom = style.position.y;

    // Remove old handle if exists (we want full body drag now)
    const oldHandle = legend.querySelector(".legend-drag-handle");
    if (oldHandle) oldHandle.remove();

    legend.addEventListener("mousedown", (e) => {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        startLeft = Number.parseInt(legend.style.left) || style.position.x;
        startBottom = Number.parseInt(legend.style.bottom) || style.position.y;
        legend.classList.add("dragging");
        e.preventDefault();
    });

    document.addEventListener("mousemove", (e) => {
        if (!isDragging) return;

        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        legend.style.left = `${startLeft + dx}px`;
        legend.style.bottom = `${startBottom - dy}px`;

        style.position.x = startLeft + dx;
        style.position.y = startBottom - dy;
    });

    document.addEventListener("mouseup", () => {
        if (isDragging) {
            isDragging = false;
            legend.classList.remove("dragging");
        }
    });
}

export function updateLegendScale(scale: number): void {
    const legend = document.getElementById("legend") as HTMLDivElement;
    if (legend) {
        legend.style.transform = `scale(${scale})`;
    }
}
