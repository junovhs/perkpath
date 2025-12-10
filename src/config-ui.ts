import { updateLegendScale } from "./legend";
import type { MapRenderer } from "./map";
import type { AppConfig } from "./types";
import { setInputValue } from "./ui-helpers";

export class ConfigUI {
    constructor(
        private config: AppConfig,
        private mapRenderer: MapRenderer,
        private onSave: () => void,
    ) {}

    bindAll(): void {
        this.bindConfigInputs();
        this.bindVisibilityControls();
    }

    private bindConfigInputs(): void {
        const update = () => {
            this.onSave();
            this.mapRenderer.updateConfig(this.config);
        };

        // Font Size Slider
        const fsInput = document.getElementById("labelFontSize");
        if (fsInput) {
            fsInput.addEventListener("input", (e) => {
                const val = (e.target as HTMLInputElement).value;
                this.config.labelStyle.fontSize = Number.parseInt(val);

                const display = document.getElementById("labelFontSizeValue");
                if (display) display.textContent = `${val}px`;

                update();
            });
        }

        this.bindInput("labelBgColor", "labelStyle", "bgColor", false, update);
        this.bindInput("labelTextColor", "labelStyle", "textColor", false, update);
        this.bindInput("nodeSize", "nodeStyle", "size", true, update);
        this.bindInput("nodeBorderWidth", "nodeStyle", "borderWidth", true, update);
        this.bindInput("arrowSize", "nodeStyle", "arrowSize", true, update);

        this.bindLegendScale();
        this.initializeValues();
    }

    private initializeValues(): void {
        const fsDisplay = document.getElementById("labelFontSizeValue");
        if (fsDisplay) {
            fsDisplay.textContent = `${this.config.labelStyle.fontSize}px`;
        }

        setInputValue("labelFontSize", this.config.labelStyle.fontSize.toString());
        setInputValue("labelBgColor", this.config.labelStyle.bgColor);
        setInputValue("labelTextColor", this.config.labelStyle.textColor);
        setInputValue("nodeSize", this.config.nodeStyle.size.toString());
        setInputValue("nodeBorderWidth", this.config.nodeStyle.borderWidth.toString());
        setInputValue("arrowSize", this.config.nodeStyle.arrowSize.toString());
        setInputValue("legendScale", this.config.legendStyle.scale.toString());
        this.updateLegendScaleDisplay();
    }

    private bindVisibilityControls(): void {
        const bind = (
            id: string,
            key: "showBase" | "showRoutes" | "showNodes" | "showLabels" | "showArrows",
        ) => {
            document.getElementById(id)?.addEventListener("change", (e) => {
                const checked = (e.target as HTMLInputElement).checked;
                this.mapRenderer.updateViewOptions({ [key]: checked });
            });
        };

        bind("showBase", "showBase");
        bind("showRoutes", "showRoutes");
        bind("showNodes", "showNodes");
        bind("showLabels", "showLabels");
        bind("showArrows", "showArrows");
    }

    private bindLegendScale(): void {
        const slider = document.getElementById("legendScale") as HTMLInputElement | null;
        if (!slider) return;

        slider.addEventListener("input", () => {
            const scale = Number.parseFloat(slider.value);
            this.config.legendStyle.scale = scale;
            updateLegendScale(scale);
            this.updateLegendScaleDisplay();
            this.onSave();
        });
    }

    private updateLegendScaleDisplay(): void {
        const display = document.getElementById("legendScaleValue");
        if (display) {
            display.textContent = this.config.legendStyle.scale.toFixed(1);
        }
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
            // Double cast required for dynamic property access on typed interface
            const cfg = this.config as unknown as Record<string, Record<string, unknown>>;
            cfg[group][key] = isInt ? Number.parseInt(val) : val;
            cb();
        });
    }
}
