import type { MapRenderer } from "./map";
import type { AppConfig, SavedView } from "./types";
import { showToast } from "./ui-helpers";
import {
    deleteView,
    exportViewToFile,
    getSavedViews,
    importViewFromFile,
    saveView,
} from "./view-storage";

export interface ViewManagerCallbacks {
    getConfig: () => AppConfig;
    setConfig: (config: AppConfig) => void;
    saveConfig: () => void;
}

export class ViewManager {
    constructor(
        private mapRenderer: MapRenderer,
        private callbacks: ViewManagerCallbacks,
    ) {}

    bindControls(): void {
        document.getElementById("saveView")?.addEventListener("click", () => this.handleSave());
        document.getElementById("importView")?.addEventListener("click", () => {
            document.getElementById("viewFileInput")?.click();
        });
        document.getElementById("viewFileInput")?.addEventListener("change", (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) this.handleImport(file);
        });
    }

    handleSave(): void {
        const data = this.mapRenderer.getCurrentData();
        if (!data) {
            showToast("Render a map first", "error");
            return;
        }

        const name = prompt("Enter a name for this view:", data.title || "My View");
        if (!name) return;

        const map = this.mapRenderer.getMap();
        const center = map.getCenter();
        const config = this.callbacks.getConfig();

        saveView(name, data, { lat: center.lat, lng: center.lng }, map.getZoom(), config);
        this.renderList();
        showToast("View saved!", "success");
    }

    async handleImport(file: File): Promise<void> {
        try {
            const view = await importViewFromFile(file);
            this.loadView(view);
            this.renderList();
            showToast("View imported!", "success");
        } catch {
            showToast("Failed to import view", "error");
        }
    }

    loadView(view: SavedView): void {
        this.callbacks.setConfig({ ...view.config });
        this.callbacks.saveConfig();
        this.mapRenderer.updateConfig(view.config);
        this.mapRenderer.render(view.tripData);
        this.mapRenderer.getMap().setView([view.center.lat, view.center.lng], view.zoom);
    }

    renderList(): void {
        const container = document.getElementById("savedViewsList");
        if (!container) return;

        const views = getSavedViews();
        if (views.length === 0) {
            container.innerHTML = '<p class="hint">No saved views yet.</p>';
            return;
        }

        container.innerHTML = views.map((v) => itemHtml(v)).join("");
        this.bindViewItems(container, views);
    }

    private bindViewItems(container: HTMLElement, views: SavedView[]): void {
        for (const item of container.querySelectorAll(".saved-view-item")) {
            const id = item.getAttribute("data-id");
            const view = views.find((v) => v.id === id);
            if (!view) continue;

            item.querySelector(".view-load")?.addEventListener("click", () => this.loadView(view));
            item.querySelector(".view-export")?.addEventListener("click", () =>
                exportViewToFile(view),
            );
            item.querySelector(".view-delete")?.addEventListener("click", () => {
                deleteView(view.id);
                this.renderList();
            });
        }
    }
}

function itemHtml(view: SavedView): string {
    return `
        <div class="saved-view-item" data-id="${view.id}">
            <span class="view-name">${view.name}</span>
            <div class="view-actions">
                <button class="view-btn view-load" title="Load">Load</button>
                <button class="view-btn view-export" title="Download">Save</button>
                <button class="view-btn view-delete" title="Delete">X</button>
            </div>
        </div>
    `;
}
