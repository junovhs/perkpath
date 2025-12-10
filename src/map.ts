import html2canvas from "html2canvas";
import L from "leaflet";
import { createDirectionArrow, generateBezierCurve } from "./geo";
import {
    type PlacedLabel,
    findBestLabelPosition,
    getAnchorForPosition,
    getLabelRect,
} from "./layout";
import type { AppConfig, Location, RouteType, Segment, TripData } from "./types";

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

        this.map.on("zoomend", () => {
            if (this.currentData) {
                this.redrawLabels();
            }
        });
    }

    redrawLabels() {
        this.labelsLayer.clearLayers();
        this.placedLabels = [];

        if (!this.currentData) return;

        const sortedLocations = [...this.currentData.locations].sort((a, b) => {
            if (a.isStart) return -1;
            if (b.isStart) return 1;
            if (a.isEnd) return -1;
            if (b.isEnd) return 1;
            return 0;
        });

        for (const loc of sortedLocations) {
            this.drawLabelSmart(loc, this.currentData.locations);
        }
    }

    updateConfig(config: AppConfig) {
        this.config = config;
        if (this.currentData) this.render(this.currentData);
    }

    clear() {
        this.routesLayer.clearLayers();
        this.nodesLayer.clearLayers();
        this.labelsLayer.clearLayers();
        this.arrowsLayer.clearLayers();
        this.placedLabels = [];
        this.currentData = null;
    }

    render(data: TripData) {
        this.clear();
        this.currentData = data;

        const locationMap: Record<string, Location> = {};
        for (const loc of data.locations) {
            locationMap[loc.name] = loc;
        }

        for (const segment of data.segments) {
            this.drawSegment(segment, locationMap);
        }
        for (const loc of data.locations) {
            this.drawNode(loc);
        }

        const sortedLocations = [...data.locations].sort((a, b) => {
            if (a.isStart) return -1;
            if (b.isStart) return 1;
            if (a.isEnd) return -1;
            if (b.isEnd) return 1;
            return 0;
        });

        this.placedLabels = [];
        for (const loc of sortedLocations) {
            this.drawLabelSmart(loc, data.locations);
        }

        this.fitBounds(data.locations);
        this.updateLegend(data.segments);
    }

    private getRouteConfig(transport: string): RouteType | undefined {
        return this.config.routeTypes.find(
            (rt) =>
                rt.id.toLowerCase() === transport.toLowerCase() ||
                rt.name.toLowerCase().includes(transport.toLowerCase()),
        );
    }

    private drawSegment(segment: Segment, locationMap: Record<string, Location>) {
        const from = locationMap[segment.from];
        const to = locationMap[segment.to];

        if (!from || !to) {
            console.warn(`Could not find locations for segment: ${segment.from} -> ${segment.to}`);
            return;
        }

        const routeConfig = this.getRouteConfig(segment.transport);
        const color = routeConfig?.color || "#888888";
        const isDashed = routeConfig?.lineStyle === "dashed";
        const weight = routeConfig?.lineWidth || 4;

        const curvePoints = generateBezierCurve(from, to);

        const polyline = L.polyline(curvePoints, {
            color: color,
            weight: weight,
            opacity: 1,
            lineCap: "round",
            lineJoin: "round",
            dashArray: isDashed ? "12, 8" : undefined,
        });

        polyline.addTo(this.routesLayer);
        this.addDirectionArrows(curvePoints, color, weight);
    }

    private addDirectionArrows(points: [number, number][], color: string, weight: number) {
        const arrow = createDirectionArrow(points, color, weight);
        if (arrow) {
            L.marker(arrow.point, {
                icon: arrow.icon,
                interactive: false,
            }).addTo(this.arrowsLayer);
        }
    }

    private drawNode(location: Location) {
        const { size, borderWidth } = this.config.nodeStyle;
        let nodeColor = "#f97316";

        if (location.isStart) nodeColor = "#22c55e";

        const marker = L.circleMarker([location.lat, location.lng], {
            radius: size,
            fillColor: nodeColor,
            fillOpacity: 1,
            color: "#ffffff",
            weight: borderWidth,
            opacity: 1,
        });

        marker.addTo(this.nodesLayer);
    }

    private drawLabelSmart(location: Location, allLocations: Location[]) {
        const { fontSize, bgColor, textColor } = this.config.labelStyle;

        const position =
            location.labelPosition ||
            findBestLabelPosition(
                location,
                fontSize,
                this.map,
                this.placedLabels,
                allLocations,
                this.config,
            );

        const anchor = getAnchorForPosition(position, location.name, fontSize);
        const pixelPos = this.map.latLngToContainerPoint([location.lat, location.lng]);
        const rect = getLabelRect(
            pixelPos,
            {
                width: location.name.length * (fontSize * 0.65) + 24,
                height: fontSize + 12,
            },
            position,
        );

        this.placedLabels.push({ location, rect, position });

        const icon = L.divIcon({
            className: "location-label-wrapper",
            html: `<div class="location-label-inner" style="
        background: ${location.isStart ? "#22c55e" : location.isEnd ? "#1a1d23" : bgColor};
        color: ${location.isStart || location.isEnd ? "#ffffff" : textColor};
        font-size: ${fontSize}px;
      ">${location.name}</div>`,
            iconAnchor: anchor,
        });

        L.marker([location.lat, location.lng], {
            icon,
            interactive: false,
        }).addTo(this.labelsLayer);
    }

    private fitBounds(locations: Location[]) {
        if (locations.length === 0) return;
        const bounds = L.latLngBounds(locations.map((loc) => [loc.lat, loc.lng]));
        this.map.fitBounds(bounds, { padding: [80, 80] });
    }

    private updateLegend(segments: Segment[]) {
        const legendItems = document.getElementById("legendItems");
        if (!legendItems) return;

        const usedTransports = new Set(segments.map((s) => s.transport.toLowerCase()));
        legendItems.innerHTML = "";

        const typesToRender = this.config.routeTypes.filter((rt) =>
            usedTransports.has(rt.id.toLowerCase()),
        );

        for (const rt of typesToRender) {
            const item = document.createElement("div");
            item.className = "legend-item";

            const line = document.createElement("div");
            line.className = `legend-line ${rt.lineStyle === "dashed" ? "dashed" : ""}`;
            line.style.backgroundColor = rt.lineStyle === "dashed" ? "transparent" : rt.color;
            line.style.color = rt.color;
            if (rt.lineStyle !== "dashed") line.style.background = rt.color;

            const label = document.createElement("span");
            label.textContent = rt.name;

            item.appendChild(line);
            item.appendChild(label);
            legendItems.appendChild(item);
        }
    }

    async exportImage(options: {
        includeBase: boolean;
        includeRoutes: boolean;
        includeLabels: boolean;
    }) {
        const { includeBase = true, includeRoutes = true, includeLabels = true } = options;

        const routesVisible = this.map.hasLayer(this.routesLayer);
        const nodesVisible = this.map.hasLayer(this.nodesLayer);
        const labelsVisible = this.map.hasLayer(this.labelsLayer);
        const arrowsVisible = this.map.hasLayer(this.arrowsLayer);

        if (!includeRoutes) {
            this.map.removeLayer(this.routesLayer);
            this.map.removeLayer(this.nodesLayer);
            this.map.removeLayer(this.arrowsLayer);
        }
        if (!includeLabels) {
            this.map.removeLayer(this.labelsLayer);
        }

        const mapContainer = document.getElementById("map");
        if (!mapContainer) return "";

        const canvas = await html2canvas(mapContainer, {
            useCORS: true,
            allowTaint: true,
            backgroundColor: includeBase ? null : "transparent",
        });

        if (routesVisible) this.map.addLayer(this.routesLayer);
        if (nodesVisible) this.map.addLayer(this.nodesLayer);
        if (labelsVisible) this.map.addLayer(this.labelsLayer);
        if (arrowsVisible) this.map.addLayer(this.arrowsLayer);

        return canvas.toDataURL("image/png");
    }
}
