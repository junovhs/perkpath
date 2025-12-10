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
                step="0.1" 
                value="${map.getZoom()}"
            />
        </div>
        <button class="zoom-btn zoom-out" title="Zoom Out">-</button>
    `;

    const slider = container.querySelector(".zoom-slider") as HTMLInputElement;
    const zoomIn = container.querySelector(".zoom-in") as HTMLButtonElement;
    const zoomOut = container.querySelector(".zoom-out") as HTMLButtonElement;

    slider.addEventListener("input", () => {
        map.setZoom(Number.parseFloat(slider.value));
    });

    zoomIn.addEventListener("click", () => {
        map.zoomIn(0.5);
    });

    zoomOut.addEventListener("click", () => {
        map.zoomOut(0.5);
    });

    map.on("zoomend", () => {
        slider.value = String(map.getZoom());
    });

    // Prevent map interactions when using slider
    L.DomEvent.disableClickPropagation(container);
    L.DomEvent.disableScrollPropagation(container);

    return container;
}
