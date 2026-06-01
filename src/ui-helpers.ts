import type { AppConfig, RouteType } from "./types";

export function showToast(message: string, type: "success" | "error"): void {
    const toast = document.getElementById("toast");
    if (!toast) return;

    toast.textContent = message;
    toast.className = `toast ${type} show`;

    setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}

export function setInputValue(id: string, value: string): void {
    const el = document.getElementById(id) as HTMLInputElement | null;
    if (el) el.value = value;
}

export function switchTab(tabId: string): void {
    for (const t of document.querySelectorAll(".tab")) {
        t.classList.toggle("active", t.getAttribute("data-tab") === tabId);
    }
    for (const c of document.querySelectorAll(".tab-content")) {
        c.classList.toggle("active", c.getAttribute("data-tab") === tabId);
    }
}

export interface RouteTypeCallbacks {
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
    item.innerHTML = buildRouteHtml(routeType);

    bindRouteInputs(item, index, config, callbacks.onUpdate);
    item.querySelector(".route-type-remove")?.addEventListener("click", callbacks.onRemove);

    return item;
}

function buildRouteHtml(routeType: RouteType): string {
    const solidSel = routeType.lineStyle === "solid" ? "selected" : "";
    const dashedSel = routeType.lineStyle === "dashed" ? "selected" : "";

    return `
        <div class="route-type-row">
            <input type="text" value="${routeType.name}" data-field="name" class="route-name" />
            <input type="color" value="${routeType.color}" data-field="color" class="route-color" />
            <select data-field="lineStyle" class="route-style">
                <option value="solid" ${solidSel}>Solid</option>
                <option value="dashed" ${dashedSel}>Dashed</option>
            </select>
            <button class="route-type-remove" title="Remove">x</button>
        </div>
    `;
}

function bindRouteInputs(
    item: HTMLDivElement,
    index: number,
    config: AppConfig,
    onUpdate: () => void,
): void {
    for (const input of item.querySelectorAll("input, select")) {
        input.addEventListener("change", (e) => {
            const field = input.getAttribute("data-field");
            if (!field) return;

            const value = (e.target as HTMLInputElement).value;
            (config.routeTypes[index] as unknown as Record<string, unknown>)[field] = value;
            onUpdate();
        });
    }
}
