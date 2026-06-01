import L from "leaflet";

export function createZoomSlider(map: L.Map): HTMLDivElement {
    const container = document.createElement("div");
    container.className = "zoom-slider-container";

    const minZoom = map.getMinZoom() || 1;
    const maxZoom = map.getMaxZoom() || 19;

    container.innerHTML = `
        <button class="zoom-btn zoom-in" title="Zoom In">+</button>
        <div class="zoom-slider-track">
            <input type="range" 
                class="zoom-slider" 
                min="${minZoom}" 
                max="${maxZoom}" 
                step="0.01" 
                value="${map.getZoom()}"
            />
        </div>
        <button class="zoom-btn zoom-out" title="Zoom Out">-</button>
    `;

    const slider = container.querySelector(".zoom-slider") as HTMLInputElement;
    const zoomIn = container.querySelector(".zoom-in") as HTMLButtonElement;
    const zoomOut = container.querySelector(".zoom-out") as HTMLButtonElement;

    slider.addEventListener("input", () => {
        const zoom = Number.parseFloat(slider.value);
        map.setZoom(zoom, { animate: false });
    });

    zoomIn.addEventListener("click", () => {
        map.zoomIn(0.25);
    });

    zoomOut.addEventListener("click", () => {
        map.zoomOut(0.25);
    });

    map.on("zoom", () => {
        slider.value = String(map.getZoom());
    });

    L.DomEvent.disableClickPropagation(container);
    L.DomEvent.disableScrollPropagation(container);

    return container;
}

export function enableSmoothZoom(map: L.Map): void {
    // Enable fractional zoom and smooth wheel zooming
    map.options.zoomSnap = 0;
    map.options.zoomDelta = 0.25;
    map.options.wheelPxPerZoomLevel = 120;
}
