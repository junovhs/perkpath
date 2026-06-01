import "./style.css";
import { ALASKA_EXAMPLE, COLOR_PRESETS, DEFAULT_CONFIG, createRouteTypes } from "./config";
import { ConfigUI } from "./config-ui";
import { MapRenderer } from "./map";
import { generatePromptString } from "./prompt";
import type { AppConfig } from "./types";
import { createRouteTypeElement, showToast, switchTab } from "./ui-helpers";
import { ViewManager } from "./view-manager";

class App {
    private config: AppConfig;
    private mapRenderer: MapRenderer;
    private configUI: ConfigUI;
    private viewManager: ViewManager;
    private generatedPrompt = "";

    constructor() {
        this.config = this.loadConfig();
        this.mapRenderer = new MapRenderer("map", this.config);
        this.configUI = new ConfigUI(this.config, this.mapRenderer, () => this.saveConfig());
        this.viewManager = new ViewManager(this.mapRenderer, {
            getConfig: () => this.config,
            setConfig: (c) => {
                this.config = c;
            },
            saveConfig: () => this.saveConfig(),
        });

        this.initializeUI();
        this.renderRouteTypes();
        this.viewManager.renderList();
    }

    private loadConfig(): AppConfig {
        const saved = localStorage.getItem("perkpath-config");
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (!parsed.nodeColors) {
                    parsed.nodeColors = DEFAULT_CONFIG.nodeColors;
                }
                if (!parsed.activePreset) {
                    parsed.activePreset = "standard";
                }
                return parsed;
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
        this.bindColorPresets();
        this.viewManager.bindControls();
        this.configUI.bindAll();
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

        for (const btn of document.querySelectorAll(".export-btn")) {
            btn.addEventListener("click", () => {
                const exportType = btn.getAttribute("data-export");
                if (exportType) this.exportMap(exportType);
            });
        }
    }

    private bindColorPresets(): void {
        const select = document.getElementById("colorPreset") as HTMLSelectElement;
        if (!select) return;

        // Set initial value
        if (this.config.activePreset) {
            select.value = this.config.activePreset;
        }

        select.addEventListener("change", () => {
            const preset = COLOR_PRESETS[select.value];
            if (preset) {
                this.config.routeTypes = createRouteTypes(preset);
                this.config.nodeColors = { ...preset.nodes };
                this.config.activePreset = select.value;
                this.saveConfig();
                this.renderRouteTypes();
                this.mapRenderer.updateConfig(this.config);
            }
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
        showToast("Prompt generated!", "success");
    }

    private async copyPrompt(): Promise<void> {
        if (!this.generatedPrompt) return;
        try {
            await navigator.clipboard.writeText(this.generatedPrompt);
            showToast("Copied!", "success");
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
            showToast(`Parse error: ${message}`, "error");
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
        for (const [index, rt] of this.config.routeTypes.entries()) {
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
        }
    }

    private async exportMap(type: string): Promise<void> {
        showToast("Exporting...", "success");

        try {
            const opts = {
                includeBase: type === "full" || type === "base",
                includeRoutes: type === "full" || type === "routes",
                includeLabels: type === "full" || type === "labels",
                includeNodes: type === "full" || type === "routes",
                includeArrows: type === "full" || type === "routes",
            };

            const dataUrl = await this.mapRenderer.exportImage(opts);

            const link = document.createElement("a");
            link.download = `perkpath-${type}-${Date.now()}.png`;
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
