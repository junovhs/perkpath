import html2canvas from "html2canvas";
import L from "leaflet";
import { createDirectionArrow, generateBezierCurve } from "./geo";
import {
    estimateLabelSize,
    findBestLabelPosition,
    getAnchorForPosition,
    getLabelRect,
} from "./layout";
import { renderLegend } from "./legend";
import type { AppConfig, Location, PlacedLabel, RouteType, Segment, TripData } from "./types";

export class MapRenderer {
    private map: L.Map;
    private routesLayer: L.LayerGroup;
    private arrowsLayer: L.LayerGroup;
    private nodesLayer: L.LayerGroup;
    private labelsLayer: L.LayerGroup;
    private currentData: TripData | null = null;
    private placedLabels: PlacedLabel[] = [];

    constructor(
        containerId: string,
        private config: AppConfig,
    ) {
        this.map = L.map(containerId, {
            zoomControl: true,
            attributionControl: true,
        }).setView([40, -95], 4);

        L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
            attribution: "&copy; OpenStreetMap &copy; CARTO",
            subdomains: "abcd",
            maxZoom: 19,
        }).addTo(this.map);

        this.routesLayer = L.layerGroup().addTo(this.map);
        this.arrowsLayer = L.layerGroup().addTo(this.map);
        this.nodesLayer = L.layerGroup().addTo(this.map);
        this.labelsLayer = L.layerGroup().addTo(this.map);

        this.map.on("zoomend", () => this.onZoomEnd());
    }

    private onZoomEnd(): void {
        if (this.currentData) this.redrawLabels();
    }

    redrawLabels(): void {
        this.labelsLayer.clearLayers();
        this.placedLabels = [];
        if (!this.currentData) return;

        const sorted = this.sortLocationsByPriority(this.currentData.locations);
        for (const loc of sorted) {
            this.drawLabel(loc, this.currentData.locations);
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
        this.placedLabels = [];
        this.currentData = null;
    }

    render(data: TripData): void {
        this.clear();
        this.currentData = data;

        const locationMap = this.buildLocationMap(data.locations);

        for (const segment of data.segments) {
            this.drawSegment(segment, locationMap);
        }
        for (const loc of data.locations) {
            this.drawNode(loc);
        }

        const sorted = this.sortLocationsByPriority(data.locations);
        for (const loc of sorted) {
            this.drawLabel(loc, data.locations);
        }

        this.fitBounds(data.locations);
        renderLegend(data.segments, this.config.routeTypes);
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

    private getRouteConfig(transport: string): RouteType | undefined {
        return this.config.routeTypes.find(
            (rt) =>
                rt.id.toLowerCase() === transport.toLowerCase() ||
                rt.name.toLowerCase().includes(transport.toLowerCase()),
        );
    }

    private drawSegment(segment: Segment, locationMap: Record<string, Location>): void {
        const from = locationMap[segment.from];
        const to = locationMap[segment.to];

        if (!from || !to) {
            console.warn(`Missing locations: ${segment.from} -> ${segment.to}`);
            return;
        }

        const routeConfig = this.getRouteConfig(segment.transport);
        const color = routeConfig?.color || "#888888";
        const isDashed = routeConfig?.lineStyle === "dashed";
        const weight = routeConfig?.lineWidth || 4;

        const curvePoints = generateBezierCurve(from, to);

        L.polyline(curvePoints, {
            color,
            weight,
            opacity: 1,
            lineCap: "round",
            lineJoin: "round",
            dashArray: isDashed ? "12, 8" : undefined,
        }).addTo(this.routesLayer);

        this.addArrow(curvePoints, color, weight);
    }

    private addArrow(points: [number, number][], color: string, weight: number): void {
        const arrow = createDirectionArrow(points, color, weight);
        if (arrow) {
            L.marker(arrow.point, { icon: arrow.icon, interactive: false }).addTo(this.arrowsLayer);
        }
    }

    private drawNode(location: Location): void {
        const { size, borderWidth } = this.config.nodeStyle;
        const nodeColor = location.isStart ? "#22c55e" : "#f97316";

        L.circleMarker([location.lat, location.lng], {
            radius: size,
            fillColor: nodeColor,
            fillOpacity: 1,
            color: "#ffffff",
            weight: borderWidth,
            opacity: 1,
        }).addTo(this.nodesLayer);
    }

    private drawLabel(location: Location, allLocations: Location[]): void {
        const { fontSize, bgColor, textColor } = this.config.labelStyle;
        const ctx = {
            map: this.map,
            placedLabels: this.placedLabels,
            allLocations,
            nodeSize: this.config.nodeStyle.size,
        };

        const position = location.labelPosition || findBestLabelPosition(location, fontSize, ctx);
        const anchor = getAnchorForPosition(position, location.name, fontSize);
        const pixelPos = this.map.latLngToContainerPoint([location.lat, location.lng]);
        const labelSize = estimateLabelSize(location.name, fontSize);
        const rect = getLabelRect(pixelPos, labelSize, position);

        this.placedLabels.push({ location, rect, position });

        const bg = location.isStart ? "#22c55e" : location.isEnd ? "#1a1d23" : bgColor;
        const fg = location.isStart || location.isEnd ? "#ffffff" : textColor;

        const icon = L.divIcon({
            className: "location-label-wrapper",
            html: `<div class="location-label-inner" style="background:${bg};color:${fg};font-size:${fontSize}px;">${location.name}</div>`,
            iconAnchor: anchor,
        });

        L.marker([location.lat, location.lng], { icon, interactive: false }).addTo(
            this.labelsLayer,
        );
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
        const layers = this.captureLayerState();
        this.setLayersForExport(options);

        const mapContainer = document.getElementById("map");
        if (!mapContainer) return "";

        const canvas = await html2canvas(mapContainer, {
            useCORS: true,
            allowTaint: true,
            backgroundColor: options.includeBase ? null : "transparent",
        });

        this.restoreLayerState(layers);
        return canvas.toDataURL("image/png");
    }

    private captureLayerState() {
        return {
            routes: this.map.hasLayer(this.routesLayer),
            nodes: this.map.hasLayer(this.nodesLayer),
            labels: this.map.hasLayer(this.labelsLayer),
            arrows: this.map.hasLayer(this.arrowsLayer),
        };
    }

    private setLayersForExport(options: { includeRoutes: boolean; includeLabels: boolean }): void {
        if (!options.includeRoutes) {
            this.map.removeLayer(this.routesLayer);
            this.map.removeLayer(this.nodesLayer);
            this.map.removeLayer(this.arrowsLayer);
        }
        if (!options.includeLabels) {
            this.map.removeLayer(this.labelsLayer);
        }
    }

    private restoreLayerState(state: Record<string, boolean>): void {
        if (state.routes) this.map.addLayer(this.routesLayer);
        if (state.nodes) this.map.addLayer(this.nodesLayer);
        if (state.labels) this.map.addLayer(this.labelsLayer);
        if (state.arrows) this.map.addLayer(this.arrowsLayer);
    }
}
