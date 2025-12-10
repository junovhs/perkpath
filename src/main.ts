import "./style.css";
import { ALASKA_EXAMPLE, DEFAULT_CONFIG } from "./config";
import { MapRenderer } from "./map";
import { generatePromptString } from "./prompt";
import type { AppConfig, RouteType } from "./types";
import { createRouteTypeElement, setInputValue, showToast, switchTab } from "./ui-helpers";

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
        const saved = localStorage.getItem("perkpath-config");
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch {
                return DEFAULT_CONFIG;
            }
        }
        return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    }

    private saveConfig(): void {
        localStorage.setItem("perkpath-config", JSON.stringify(this.config));
    }

    private initializeUI(): void {
        this.bindTabs();
        this.bindButtons();
        this.bindConfigInputs();
    }

    private bindTabs(): void {
        for (const tab of document.querySelectorAll(".tab")) {
            tab.addEventListener("click", () => {
                const tabId = tab.getAttribute("data-tab");
                if (tabId) switchTab(tabId);
            });
        }
    }

    private bindButtons(): void {
        document.getElementById("generatePrompt")?.addEventListener("click", () => {
            this.generatePrompt();
        });
        document.getElementById("copyPrompt")?.addEventListener("click", () => {
            this.copyPrompt();
        });
        document.getElementById("renderMap")?.addEventListener("click", () => {
            this.renderMap();
        });
        document.getElementById("loadExample")?.addEventListener("click", () => {
            this.loadExample();
        });
        document.getElementById("addRouteType")?.addEventListener("click", () => {
            this.addRouteType();
        });

        for (const btn of document.querySelectorAll(".export-btn")) {
            btn.addEventListener("click", () => {
                const exportType = btn.getAttribute("data-export");
                if (exportType) this.exportMap(exportType);
            });
        }
    }

    private bindConfigInputs(): void {
        const update = () => {
            this.saveConfig();
            this.mapRenderer.updateConfig(this.config);
        };

        this.bindInput("labelFontSize", "labelStyle", "fontSize", true, update);
        this.bindInput("labelBgColor", "labelStyle", "bgColor", false, update);
        this.bindInput("labelTextColor", "labelStyle", "textColor", false, update);
        this.bindInput("nodeSize", "nodeStyle", "size", true, update);
        this.bindInput("nodeBorderWidth", "nodeStyle", "borderWidth", true, update);

        setInputValue("labelFontSize", this.config.labelStyle.fontSize.toString());
        setInputValue("labelBgColor", this.config.labelStyle.bgColor);
        setInputValue("labelTextColor", this.config.labelStyle.textColor);
        setInputValue("nodeSize", this.config.nodeStyle.size.toString());
        setInputValue("nodeBorderWidth", this.config.nodeStyle.borderWidth.toString());
    }

    private bindInput(
        id: string,
        group: string,
        key: string,
        isInt: boolean,
        cb: () => void,
    ): void {
        document.getElementById(id)?.addEventListener("change", (e) => {
            const val = (e.target as HTMLInputElement).value;
            const cfg = this.config as Record<string, Record<string, unknown>>;
            cfg[group][key] = isInt ? Number.parseInt(val) : val;
            cb();
        });
    }

    private generatePrompt(): void {
        const inputEl = document.getElementById("itineraryInput") as HTMLTextAreaElement | null;
        if (!inputEl) return;

        const input = inputEl.value.trim();
        if (!input) {
            showToast("Please enter itinerary text first", "error");
            return;
        }

        this.generatedPrompt = generatePromptString(input, this.config.routeTypes);
        const outputEl = document.getElementById("promptOutput");
        if (outputEl) outputEl.textContent = this.generatedPrompt;

        const copyBtn = document.getElementById("copyPrompt") as HTMLButtonElement | null;
        if (copyBtn) copyBtn.disabled = false;

        switchTab("prompt");
        showToast("Prompt generated! Copy and paste to AI.", "success");
    }

    private async copyPrompt(): Promise<void> {
        if (!this.generatedPrompt) return;
        try {
            await navigator.clipboard.writeText(this.generatedPrompt);
            showToast("Copied to clipboard!", "success");
        } catch {
            showToast("Failed to copy", "error");
        }
    }

    private renderMap(): void {
        const jsonInputEl = document.getElementById("jsonInput") as HTMLTextAreaElement | null;
        if (!jsonInputEl) return;

        const jsonInput = jsonInputEl.value.trim();
        if (!jsonInput) {
            showToast("Please paste JSON data first", "error");
            return;
        }

        try {
            const data = this.parseJsonInput(jsonInput);
            this.mapRenderer.render(data);
            showToast(`Rendered ${data.locations.length} locations!`, "success");
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            console.error("Parse error:", err);
            showToast(`JSON parse error: ${message}`, "error");
        }
    }

    private parseJsonInput(input: string) {
        let cleanJson = input;
        if (cleanJson.startsWith("\x60\x60\x60")) {
            cleanJson = cleanJson
                .replace(/\x60\x60\x60json?\n?/g, "")
                .replace(/\x60\x60\x60$/g, "")
                .trim();
        }

        const data = JSON.parse(cleanJson);
        if (!data.locations || !data.segments) {
            throw new Error("Invalid JSON: missing locations or segments");
        }
        return data;
    }

    private loadExample(): void {
        const jsonInputEl = document.getElementById("jsonInput") as HTMLTextAreaElement | null;
        if (jsonInputEl) {
            jsonInputEl.value = JSON.stringify(ALASKA_EXAMPLE, null, 2);
            this.renderMap();
        }
    }

    private renderRouteTypes(): void {
        const container = document.getElementById("routeTypes");
        if (!container) return;

        container.innerHTML = "";
        this.config.routeTypes.forEach((rt, index) => {
            const callbacks = {
                onUpdate: () => {
                    this.saveConfig();
                    this.mapRenderer.updateConfig(this.config);
                },
                onRemove: () => {
                    this.config.routeTypes.splice(index, 1);
                    this.saveConfig();
                    this.renderRouteTypes();
                    this.mapRenderer.updateConfig(this.config);
                },
            };
            const item = createRouteTypeElement(rt, index, this.config, callbacks);
            container.appendChild(item);
        });
    }

    private addRouteType(): void {
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

    private async exportMap(type: string): Promise<void> {
        showToast("Exporting...", "success");

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

            showToast("Export complete!", "success");
        } catch (err) {
            console.error("Export error:", err);
            showToast("Export failed", "error");
        }
    }
}

document.addEventListener("DOMContentLoaded", () => new App());
