import L from "leaflet";
import { createLeaderLine } from "./leader-lines";
import { createLegend } from "./legend";
import { type DrawContext, drawLabel, drawNode, drawSegment } from "./map-draw";
import { exportMapImage } from "./map-exporter";
import type { AppConfig, Location, PlacedLabel, TripData, ViewOptions } from "./types";
import { createZoomSlider } from "./zoom-control";

export class MapRenderer {
    private map: L.Map;
    private routesLayer: L.LayerGroup;
    private arrowsLayer: L.LayerGroup;
    private nodesLayer: L.LayerGroup;
    private labelsLayer: L.LayerGroup;
    private leaderLinesLayer: L.LayerGroup;
    private currentData: TripData | null = null;
    private placedLabels: PlacedLabel[] = [];
    private viewOptions: ViewOptions = {
        showBase: true,
        showRoutes: true,
        showNodes: true,
        showLabels: true,
        showArrows: true,
    };
    private tileLayer: L.TileLayer;

    constructor(
        containerId: string,
        private config: AppConfig,
    ) {
        this.map = L.map(containerId, {
            zoomControl: false,
            attributionControl: true,
        }).setView([40, -95], 4);

        this.tileLayer = L.tileLayer(
            "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
            {
                attribution: "&copy; OpenStreetMap &copy; CARTO",
                subdomains: "abcd",
                maxZoom: 19,
            },
        ).addTo(this.map);

        this.routesLayer = L.layerGroup().addTo(this.map);
        this.arrowsLayer = L.layerGroup().addTo(this.map);
        this.nodesLayer = L.layerGroup().addTo(this.map);
        this.labelsLayer = L.layerGroup().addTo(this.map);
        this.leaderLinesLayer = L.layerGroup().addTo(this.map);

        this.addZoomSlider();
        this.map.on("zoomend", () => this.onZoomEnd());
        this.map.on("moveend", () => this.onZoomEnd());
    }

    private addZoomSlider(): void {
        const slider = createZoomSlider(this.map);
        const mapContainer = document.getElementById("map");
        if (mapContainer) {
            mapContainer.appendChild(slider);
        }
    }

    private onZoomEnd(): void {
        if (this.currentData) {
            this.redrawLabels();
            this.updateLeaderLines();
        }
    }

    updateViewOptions(options: Partial<ViewOptions>): void {
        this.viewOptions = { ...this.viewOptions, ...options };
        this.applyVisibility();
    }

    private applyVisibility(): void {
        const toggle = (layer: L.Layer, show: boolean) => {
            if (show) {
                if (!this.map.hasLayer(layer)) this.map.addLayer(layer);
            } else {
                if (this.map.hasLayer(layer)) this.map.removeLayer(layer);
            }
        };

        toggle(this.tileLayer, this.viewOptions.showBase);
        toggle(this.routesLayer, this.viewOptions.showRoutes);
        toggle(this.nodesLayer, this.viewOptions.showNodes);
        toggle(this.labelsLayer, this.viewOptions.showLabels);
        toggle(this.arrowsLayer, this.viewOptions.showArrows);

        if (!this.viewOptions.showLabels) {
            toggle(this.leaderLinesLayer, false);
        } else {
            this.updateLeaderLines();
        }
    }

    private updateLeaderLines(): void {
        this.leaderLinesLayer.clearLayers();
        if (!this.currentData || !this.viewOptions.showLabels) return;

        for (const placed of this.placedLabels) {
            const line = createLeaderLine(
                this.map,
                placed.location,
                placed,
                this.config.nodeStyle.size,
            );
            if (line) line.addTo(this.leaderLinesLayer);
        }
    }

    redrawLabels(): void {
        this.labelsLayer.clearLayers();
        this.placedLabels = [];
        if (!this.currentData) return;

        const ctx = this.getDrawContext();
        const sorted = this.sortLocationsByPriority(this.currentData.locations);
        for (const loc of sorted) {
            const placed = drawLabel(loc, this.currentData.locations, this.placedLabels, ctx);
            this.placedLabels.push(placed);
        }
    }

    updateConfig(config: AppConfig): void {
        this.config = config;
        if (this.currentData) this.render(this.currentData);
    }

    clear(): void {
        this.routesLayer.clearLayers();
        this.nodesLayer.clearLayers();
        this.labelsLayer.clearLayers();
        this.arrowsLayer.clearLayers();
        this.leaderLinesLayer.clearLayers();
        this.placedLabels = [];
        this.currentData = null;
    }

    render(data: TripData): void {
        this.clear();
        this.currentData = data;

        const locationMap = this.buildLocationMap(data.locations);
        const ctx = this.getDrawContext();

        for (const segment of data.segments) {
            drawSegment(segment, locationMap, ctx);
        }
        for (const loc of data.locations) {
            drawNode(loc, ctx);
        }

        this.redrawLabels();

        this.fitBounds(data.locations);
        createLegend(data.segments, this.config.routeTypes, this.config.legendStyle);
        this.updateLeaderLines();
        this.applyVisibility();
    }

    private getDrawContext(): DrawContext {
        return {
            map: this.map,
            config: this.config,
            routesLayer: this.routesLayer,
            arrowsLayer: this.arrowsLayer,
            nodesLayer: this.nodesLayer,
            labelsLayer: this.labelsLayer,
            onUpdate: () => this.updateLeaderLines(),
        };
    }

    private buildLocationMap(locations: Location[]): Record<string, Location> {
        const map: Record<string, Location> = {};
        for (const loc of locations) {
            map[loc.name] = loc;
        }
        return map;
    }

    private sortLocationsByPriority(locations: Location[]): Location[] {
        return [...locations].sort((a, b) => {
            if (a.isStart) return -1;
            if (b.isStart) return 1;
            if (a.isEnd) return -1;
            if (b.isEnd) return 1;
            return 0;
        });
    }

    private fitBounds(locations: Location[]): void {
        if (locations.length === 0) return;
        const bounds = L.latLngBounds(locations.map((loc) => [loc.lat, loc.lng]));
        this.map.fitBounds(bounds, { padding: [80, 80] });
    }

    async exportImage(options: {
        includeBase: boolean;
        includeRoutes: boolean;
        includeLabels: boolean;
    }): Promise<string> {
        const layers = {
            routes: this.routesLayer,
            nodes: this.nodesLayer,
            labels: this.labelsLayer,
            arrows: this.arrowsLayer,
            leaders: this.leaderLinesLayer,
        };
        return exportMapImage(this.map, layers, options);
    }
}
