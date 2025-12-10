import "./style.css";
import { ALASKA_EXAMPLE, DEFAULT_CONFIG } from "./config";
import { MapRenderer } from "./map";
import { generatePromptString } from "./prompt";
import type { AppConfig, RouteType } from "./types";

class App {
    private config: AppConfig;
    private mapRenderer: MapRenderer;
    private generatedPrompt = "";

    constructor() {
        this.config = this.loadConfig();
        this.mapRenderer = new MapRenderer("map", this.config);
        this.initializeUI();
        this.renderRouteTypes();
    }

    private loadConfig(): AppConfig {
        const saved = localStorage.getItem("itinerary-map-config");
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch {
                return DEFAULT_CONFIG;
            }
        }
        return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    }

    private saveConfig() {
        localStorage.setItem("itinerary-map-config", JSON.stringify(this.config));
    }

    private initializeUI() {
        for (const tab of document.querySelectorAll(".tab")) {
            tab.addEventListener("click", () => {
                const tabId = tab.getAttribute("data-tab");
                if (tabId) this.switchTab(tabId);
            });
        }

        document
            .getElementById("generatePrompt")
            ?.addEventListener("click", () => this.generatePrompt());
        document.getElementById("copyPrompt")?.addEventListener("click", () => this.copyPrompt());
        document.getElementById("renderMap")?.addEventListener("click", () => this.renderMap());
        document.getElementById("loadExample")?.addEventListener("click", () => this.loadExample());
        document
            .getElementById("addRouteType")
            ?.addEventListener("click", () => this.addRouteType());

        for (const btn of document.querySelectorAll(".export-btn")) {
            btn.addEventListener("click", () => {
                const exportType = btn.getAttribute("data-export");
                if (exportType) this.exportMap(exportType);
            });
        }

        this.setupConfigListeners();
    }

    private setupConfigListeners() {
        const update = () => {
            this.saveConfig();
            this.mapRenderer.updateConfig(this.config);
        };

        const bind = (id: string, path: string[], isInt = false) => {
            const el = document.getElementById(id);
            if (!el) return;

            el.addEventListener("change", (e) => {
                const val = (e.target as HTMLInputElement).value;
                // @ts-ignore
                this.config[path[0]][path[1]] = isInt ? Number.parseInt(val) : val;
                update();
            });
        };

        bind("labelFontSize", ["labelStyle", "fontSize"], true);
        bind("labelBgColor", ["labelStyle", "bgColor"]);
        bind("labelTextColor", ["labelStyle", "textColor"]);
        bind("nodeSize", ["nodeStyle", "size"], true);
        bind("nodeBorderWidth", ["nodeStyle", "borderWidth"], true);

        this.setInputValue("labelFontSize", this.config.labelStyle.fontSize.toString());
        this.setInputValue("labelBgColor", this.config.labelStyle.bgColor);
        this.setInputValue("labelTextColor", this.config.labelStyle.textColor);
        this.setInputValue("nodeSize", this.config.nodeStyle.size.toString());
        this.setInputValue("nodeBorderWidth", this.config.nodeStyle.borderWidth.toString());
    }

    private setInputValue(id: string, value: string) {
        const el = document.getElementById(id) as HTMLInputElement | null;
        if (el) el.value = value;
    }

    private switchTab(tabId: string) {
        for (const t of document.querySelectorAll(".tab")) {
            t.classList.remove("active");
        }
        for (const c of document.querySelectorAll(".tab-content")) {
            c.classList.remove("active");
        }

        document.querySelector(`.tab[data-tab="${tabId}"]`)?.classList.add("active");
        document.querySelector(`.tab-content[data-tab="${tabId}"]`)?.classList.add("active");
    }

    private generatePrompt() {
        const inputEl = document.getElementById("itineraryInput") as HTMLTextAreaElement | null;
        if (!inputEl) return;

        const input = inputEl.value.trim();

        if (!input) {
            this.showToast("Please enter itinerary text first", "error");
            return;
        }

        this.generatedPrompt = generatePromptString(input, this.config.routeTypes);

        const outputEl = document.getElementById("promptOutput");
        if (outputEl) outputEl.textContent = this.generatedPrompt;

        const copyBtn = document.getElementById("copyPrompt") as HTMLButtonElement | null;
        if (copyBtn) copyBtn.disabled = false;

        this.switchTab("prompt");
        this.showToast("Prompt generated! Copy and paste to AI.", "success");
    }

    private async copyPrompt() {
        if (!this.generatedPrompt) return;

        try {
            await navigator.clipboard.writeText(this.generatedPrompt);
            this.showToast("Copied to clipboard!", "success");
        } catch {
            this.showToast("Failed to copy", "error");
        }
    }

    private renderMap() {
        const jsonInputEl = document.getElementById("jsonInput") as HTMLTextAreaElement | null;
        if (!jsonInputEl) return;

        const jsonInput = jsonInputEl.value.trim();

        if (!jsonInput) {
            this.showToast("Please paste JSON data first", "error");
            return;
        }

        try {
            let cleanJson = jsonInput;
            if (cleanJson.startsWith("\x60\x60\x60")) {
                cleanJson = cleanJson
                    .replace(/\x60\x60\x60json?\n?/g, "")
                    .replace(/\x60\x60\x60$/g, "")
                    .trim();
            }

            const data = JSON.parse(cleanJson);

            if (!data.locations || !data.segments) {
                throw new Error("Invalid JSON structure: missing locations or segments");
            }

            this.mapRenderer.render(data);
            this.showToast(`Rendered ${data.locations.length} locations!`, "success");
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            console.error("Parse error:", err);
            this.showToast(`JSON parse error: ${message}`, "error");
        }
    }

    private loadExample() {
        const jsonInputEl = document.getElementById("jsonInput") as HTMLTextAreaElement | null;
        if (jsonInputEl) {
            jsonInputEl.value = JSON.stringify(ALASKA_EXAMPLE, null, 2);
            this.renderMap();
        }
    }

    private renderRouteTypes() {
        const container = document.getElementById("routeTypes");
        if (!container) return;

        container.innerHTML = "";

        this.config.routeTypes.forEach((rt, index) => {
            const item = this.createRouteTypeElement(rt, index);
            container.appendChild(item);
        });
    }

    private createRouteTypeElement(routeType: RouteType, index: number) {
        const item = document.createElement("div");
        item.className = "route-type-item";
        item.innerHTML = `
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
            <option value="solid" ${routeType.lineStyle === "solid" ? "selected" : ""}>Solid</option>
            <option value="dashed" ${routeType.lineStyle === "dashed" ? "selected" : ""}>Dashed</option>
          </select>
        </label>
        <label>
          Line Width
          <input type="number" value="${routeType.lineWidth}" data-field="lineWidth" min="1" max="12" style="width: 100%;" />
        </label>
      </div>
    `;

        for (const input of item.querySelectorAll("input, select")) {
            input.addEventListener("change", (e) => {
                const field = input.getAttribute("data-field");
                if (!field) return;

                let value: string | number = (e.target as HTMLInputElement).value;
                if (field === "lineWidth") value = Number.parseInt(value);

                // @ts-ignore
                this.config.routeTypes[index][field] = value;
                this.saveConfig();
                this.mapRenderer.updateConfig(this.config);
            });
        }

        item.querySelector(".route-type-remove")?.addEventListener("click", () => {
            this.config.routeTypes.splice(index, 1);
            this.saveConfig();
            this.renderRouteTypes();
            this.mapRenderer.updateConfig(this.config);
        });

        return item;
    }

    private addRouteType() {
        const newType: RouteType = {
            id: `type${this.config.routeTypes.length + 1}`,
            name: "New Type",
            color: "#888888",
            lineStyle: "solid",
            lineWidth: 4,
        };

        this.config.routeTypes.push(newType);
        this.saveConfig();
        this.renderRouteTypes();
    }

    private async exportMap(type: string) {
        this.showToast("Exporting...", "success");

        try {
            const opts = {
                includeBase: type === "full" || type === "base",
                includeRoutes: type === "full" || type === "routes",
                includeLabels: type === "full" || type === "labels",
            };

            const dataUrl = await this.mapRenderer.exportImage(opts);

            const link = document.createElement("a");
            link.download = `map-${type}-${Date.now()}.png`;
            link.href = dataUrl;
            link.click();

            this.showToast("Export complete!", "success");
        } catch (err) {
            console.error("Export error:", err);
            this.showToast("Export failed", "error");
        }
    }

    private showToast(message: string, type: "success" | "error") {
        const toast = document.getElementById("toast");
        if (!toast) return;

        toast.textContent = message;
        toast.className = `toast show ${type}`;

        setTimeout(() => toast.classList.remove("show"), 3000);
    }
}

document.addEventListener("DOMContentLoaded", () => new App());
