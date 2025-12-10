import "./style.css";
import { DEFAULT_CONFIG, ALASKA_EXAMPLE } from "./config";
import type { AppConfig, RouteType } from "./types";
import { MapRenderer } from "./map";

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
        localStorage.setItem(
            "itinerary-map-config",
            JSON.stringify(this.config),
        );
    }

    private initializeUI() {
        document.querySelectorAll(".tab").forEach((tab) => {
            tab.addEventListener("click", () =>
                this.switchTab(tab.getAttribute("data-tab")!),
            );
        });

        document
            .getElementById("generatePrompt")
            ?.addEventListener("click", () => this.generatePrompt());
        document
            .getElementById("copyPrompt")
            ?.addEventListener("click", () => this.copyPrompt());
        document
            .getElementById("renderMap")
            ?.addEventListener("click", () => this.renderMap());
        document
            .getElementById("loadExample")
            ?.addEventListener("click", () => this.loadExample());
        document
            .getElementById("addRouteType")
            ?.addEventListener("click", () => this.addRouteType());

        document.querySelectorAll(".export-btn").forEach((btn) => {
            btn.addEventListener("click", () =>
                this.exportMap(btn.getAttribute("data-export")!),
            );
        });

        this.setupConfigListeners();
    }

    private setupConfigListeners() {
        const update = () => {
            this.saveConfig();
            this.mapRenderer.updateConfig(this.config);
        };

        const bind = (id: string, path: string[], isInt = false) => {
            document.getElementById(id)?.addEventListener("change", (e) => {
                const val = (e.target as HTMLInputElement).value;
                // @ts-ignore
                this.config[path[0]][path[1]] = isInt ? parseInt(val) : val;
                update();
            });
        };

        bind("labelFontSize", ["labelStyle", "fontSize"], true);
        bind("labelBgColor", ["labelStyle", "bgColor"]);
        bind("labelTextColor", ["labelStyle", "textColor"]);
        bind("nodeSize", ["nodeStyle", "size"], true);
        bind("nodeBorderWidth", ["nodeStyle", "borderWidth"], true);

        (document.getElementById("labelFontSize") as HTMLInputElement).value =
            this.config.labelStyle.fontSize.toString();
        (document.getElementById("labelBgColor") as HTMLInputElement).value =
            this.config.labelStyle.bgColor;
        (document.getElementById("labelTextColor") as HTMLInputElement).value =
            this.config.labelStyle.textColor;
        (document.getElementById("nodeSize") as HTMLInputElement).value =
            this.config.nodeStyle.size.toString();
        (document.getElementById("nodeBorderWidth") as HTMLInputElement).value =
            this.config.nodeStyle.borderWidth.toString();
    }

    private switchTab(tabId: string) {
        document
            .querySelectorAll(".tab")
            .forEach((t) => t.classList.remove("active"));
        document
            .querySelectorAll(".tab-content")
            .forEach((c) => c.classList.remove("active"));

        document
            .querySelector(`.tab[data-tab="${tabId}"]`)
            ?.classList.add("active");
        document
            .querySelector(`.tab-content[data-tab="${tabId}"]`)
            ?.classList.add("active");
    }

    private generatePrompt() {
        const input = (
            document.getElementById("itineraryInput") as HTMLTextAreaElement
        ).value.trim();

        if (!input) {
            this.showToast("Please enter itinerary text first", "error");
            return;
        }

        this.generatedPrompt = this.buildPromptString(
            input,
            this.config.routeTypes,
        );

        document.getElementById("promptOutput")!.textContent =
            this.generatedPrompt;
        (
            document.getElementById("copyPrompt") as HTMLButtonElement
        ).disabled = false;

        this.switchTab("prompt");
        this.showToast("Prompt generated! Copy and paste to AI.", "success");
    }

    private buildPromptString(
        itineraryText: string,
        routeTypes: RouteType[],
    ): string {
        const transportTypes = routeTypes
            .map((rt) => `"${rt.id}"`)
            .join(" | ");

        return `You are a travel itinerary parser. Parse the itinerary and return ONLY valid JSON.

TRANSPORT TYPES: ${transportTypes}

PARSING RULES:
 Extract all locations (cities, parks, airports, landmarks)
 Get accurate lat/lng coordinates for each
 Determine transport mode from context:
  - "fly/flight"  fly
  - "drive/motor/bus/coach"  drive
  - "rail/train"  rail
  - "cruise/sail/boat/ferry"  cruise
  - Default to "drive" if unclear
 First location: isStart: true
 Last location: isEnd: true
 OPTIONAL: If locations are geographically close together, add "labelPosition" to help avoid overlaps. Options: "right", "left", "top", "bottom", "top-right", "top-left", "bottom-right", "bottom-left"

EXAMPLE INPUT:
Part 1: Alaska
Start in Anchorage
Take rail to Denali
Drive to Fairbanks

EXAMPLE OUTPUT:
{
  "title": "Alaska Adventure",
  "locations": [
    { "name": "Anchorage", "lat": 61.2181, "lng": -149.9003, "isStart": true },
    { "name": "Denali National Park", "lat": 63.1148, "lng": -151.1926, "labelPosition": "left" },
    { "name": "Fairbanks", "lat": 64.8378, "lng": -147.7164, "isEnd": true }
  ],
  "segments": [
    { "from": "Anchorage", "to": "Denali National Park", "transport": "rail" },
    { "from": "Denali National Park", "to": "Fairbanks", "transport": "drive" }
  ]
}

NOW PARSE THIS ITINERARY (return ONLY JSON, no markdown code blocks):

${itineraryText}`;
    }

    private async copyPrompt() {
        if (!this.generatedPrompt) return;

        try {
            await navigator.clipboard.writeText(this.generatedPrompt);
            this.showToast("Copied to clipboard!", "success");
        } catch (err) {
            this.showToast("Failed to copy", "error");
        }
    }

    private renderMap() {
        const jsonInput = (
            document.getElementById("jsonInput") as HTMLTextAreaElement
        ).value.trim();

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
                throw new Error(
                    "Invalid JSON structure: missing locations or segments",
                );
            }

            this.mapRenderer.render(data);
            this.showToast(
                `Rendered ${data.locations.length} locations!`,
                "success",
            );
        } catch (err: any) {
            console.error("Parse error:", err);
            this.showToast(`JSON parse error: ${err.message}`, "error");
        }
    }

    private loadExample() {
        (document.getElementById("jsonInput") as HTMLTextAreaElement).value =
            JSON.stringify(ALASKA_EXAMPLE, null, 2);
        this.renderMap();
    }

    private renderRouteTypes() {
        const container = document.getElementById("routeTypes")!;
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

        item.querySelectorAll("input, select").forEach((input) => {
            input.addEventListener("change", (e) => {
                const field = input.getAttribute("data-field")!;
                let value: any = (e.target as HTMLInputElement).value;
                if (field === "lineWidth") value = parseInt(value);

                // @ts-ignore
                this.config.routeTypes[index][field] = value;
                this.saveConfig();
                this.mapRenderer.updateConfig(this.config);
            });
        });

        item.querySelector(".route-type-remove")?.addEventListener(
            "click",
            () => {
                this.config.routeTypes.splice(index, 1);
                this.saveConfig();
                this.renderRouteTypes();
                this.mapRenderer.updateConfig(this.config);
            },
        );

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
            let dataUrl;

            const opts = {
                includeBase: type === "full" || type === "base",
                includeRoutes: type === "full" || type === "routes",
                includeLabels: type === "full" || type === "labels",
            };

            dataUrl = await this.mapRenderer.exportImage(opts);

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
        const toast = document.getElementById("toast")!;
        toast.textContent = message;
        toast.className = `toast show ${type}`;

        setTimeout(() => toast.classList.remove("show"), 3000);
    }
}

document.addEventListener("DOMContentLoaded", () => new App());