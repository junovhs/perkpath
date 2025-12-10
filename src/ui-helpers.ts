import type { AppConfig, RouteType } from "./types";

export function showToast(message: string, type: "success" | "error"): void {
    const toast = document.getElementById("toast");
    if (!toast) return;

    toast.textContent = message;
    toast.className = `toast show ${type}`;

    setTimeout(() => toast.classList.remove("show"), 3000);
}

export function setInputValue(id: string, value: string): void {
    const el = document.getElementById(id) as HTMLInputElement | null;
    if (el) el.value = value;
}

export function switchTab(tabId: string): void {
    for (const t of document.querySelectorAll(".tab")) {
        t.classList.remove("active");
    }
    for (const c of document.querySelectorAll(".tab-content")) {
        c.classList.remove("active");
    }

    document.querySelector(`.tab[data-tab="${tabId}"]`)?.classList.add("active");
    document.querySelector(`.tab-content[data-tab="${tabId}"]`)?.classList.add("active");
}

interface RouteTypeCallbacks {
    onUpdate: () => void;
    onRemove: () => void;
}

export function createRouteTypeElement(
    routeType: RouteType,
    index: number,
    config: AppConfig,
    callbacks: RouteTypeCallbacks,
): HTMLDivElement {
    const item = document.createElement("div");
    item.className = "route-type-item";
    item.innerHTML = buildRouteTypeHtml(routeType);

    bindRouteTypeInputs(item, index, config, callbacks.onUpdate);
    item.querySelector(".route-type-remove")?.addEventListener("click", callbacks.onRemove);

    return item;
}

function buildRouteTypeHtml(routeType: RouteType): string {
    const solidSelected = routeType.lineStyle === "solid" ? "selected" : "";
    const dashedSelected = routeType.lineStyle === "dashed" ? "selected" : "";

    return `
        <div class="route-type-header">
            <input type="text" value="${routeType.name}" data-field="name" />
            <button class="route-type-remove" title="Remove">x</button>
        </div>
        <div class="route-type-options">
            <label>
                ID (for parsing)
                <input type="text" value="${routeType.id}" data-field="id" style="width: 100%;" />
            </label>
            <label>
                Color
                <input type="color" value="${routeType.color}" data-field="color" />
            </label>
            <label>
                Line Style
                <select data-field="lineStyle">
                    <option value="solid" ${solidSelected}>Solid</option>
                    <option value="dashed" ${dashedSelected}>Dashed</option>
                </select>
            </label>
            <label>
                Line Width
                <input type="number" value="${routeType.lineWidth}" data-field="lineWidth" min="1" max="12" style="width: 100%;" />
            </label>
        </div>
    `;
}

function bindRouteTypeInputs(
    item: HTMLDivElement,
    index: number,
    config: AppConfig,
    onUpdate: () => void,
): void {
    for (const input of item.querySelectorAll("input, select")) {
        input.addEventListener("change", (e) => {
            const field = input.getAttribute("data-field");
            if (!field) return;

            let value: string | number = (e.target as HTMLInputElement).value;
            if (field === "lineWidth") value = Number.parseInt(value);

            // Double cast required for dynamic property access
            (config.routeTypes[index] as unknown as Record<string, unknown>)[field] = value;
            onUpdate();
        });
    }
}
