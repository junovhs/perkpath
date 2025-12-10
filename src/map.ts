import L from "leaflet";
import * as turf from "@turf/turf";
import html2canvas from "html2canvas";
import type { AppConfig, Location, RouteType, Segment, TripData } from "./types";

export class MapRenderer {
    private map: L.Map;
    private routesLayer: L.LayerGroup;
    private arrowsLayer: L.LayerGroup;
    private nodesLayer: L.LayerGroup;
    private labelsLayer: L.LayerGroup;
    private currentData: TripData | null = null;
    private placedLabels: {
        location: Location;
        rect: {
            left: number;
            top: number;
            right: number;
            bottom: number;
            position: string;
        };
        position: string;
    }[] = [];

    constructor(
        containerId: string,
        private config: AppConfig,
    ) {
        this.map = L.map(containerId, {
            zoomControl: true,
            attributionControl: true,
        }).setView([40, -95], 4);

        L.tileLayer(
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

        sortedLocations.forEach((loc) =>
            this.drawLabelSmart(loc, this.currentData!.locations),
        );
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
        data.locations.forEach((loc) => {
            locationMap[loc.name] = loc;
        });

        data.segments.forEach((segment) =>
            this.drawSegment(segment, locationMap),
        );
        data.locations.forEach((loc) => this.drawNode(loc));

        const sortedLocations = [...data.locations].sort((a, b) => {
            if (a.isStart) return -1;
            if (b.isStart) return 1;
            if (a.isEnd) return -1;
            if (b.isEnd) return 1;
            return 0;
        });

        this.placedLabels = [];
        sortedLocations.forEach((loc) =>
            this.drawLabelSmart(loc, data.locations),
        );

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

    private drawSegment(
        segment: Segment,
        locationMap: Record<string, Location>,
    ) {
        const from = locationMap[segment.from];
        const to = locationMap[segment.to];

        if (!from || !to) {
            console.warn(
                `Could not find locations for segment: ${segment.from} -> ${segment.to}`,
            );
            return;
        }

        const routeConfig = this.getRouteConfig(segment.transport);
        const color = routeConfig?.color || "#888888";
        const isDashed = routeConfig?.lineStyle === "dashed";
        const weight = routeConfig?.lineWidth || 4;

        const curvePoints = this.generateBezierCurve(from, to);

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

    private generateBezierCurve(
        from: Location,
        to: Location,
    ): [number, number][] {
        const start = turf.point([from.lng, from.lat]);
        const end = turf.point([to.lng, to.lat]);

        const distance = turf.distance(start, end, { units: "kilometers" });
        const bearing = turf.bearing(start, end);
        const midPoint = turf.midpoint(start, end);

        const offsetDistance = distance * 0.15;
        const controlPoint = turf.destination(
            midPoint,
            offsetDistance,
            bearing + 90,
            { units: "kilometers" },
        );

        const line = turf.lineString([
            [from.lng, from.lat],
            controlPoint.geometry.coordinates,
            [to.lng, to.lat],
        ]);

        const curved = turf.bezierSpline(line, {
            resolution: 10000,
            sharpness: 0.85,
        });
        return curved.geometry.coordinates.map((coord) => [
            coord[1],
            coord[0],
        ]) as [number, number][];
    }

    private addDirectionArrows(
        points: [number, number][],
        color: string,
        weight: number,
    ) {
        if (points.length < 2) return;

        const totalPoints = points.length;
        const arrowSize = Math.max(12, weight * 2.5);
        const index = Math.floor(totalPoints * 0.5);

        if (index > 0 && index < totalPoints - 1) {
            const point = points[index];
            const prevPoint = points[index - 3] || points[index - 1];
            const nextPoint = points[index + 3] || points[index + 1];

            const angle =
                Math.atan2(
                    nextPoint[0] - prevPoint[0],
                    nextPoint[1] - prevPoint[1],
                ) *
                (180 / Math.PI);

            const arrowIcon = L.divIcon({
                className: "arrow-icon",
                html: `<svg width="${arrowSize * 2}" height="${arrowSize * 2}" viewBox="0 0 24 24" style="transform: rotate(${angle}deg); filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));">
          <path d="M12 4 L20 16 L12 13 L4 16 Z" fill="${color}" stroke="white" stroke-width="1.5"/>
        </svg>`,
                iconSize: [arrowSize * 2, arrowSize * 2],
                iconAnchor: [arrowSize, arrowSize],
            });

            L.marker(point, {
                icon: arrowIcon,
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

    private estimateLabelSize(text: string, fontSize: number) {
        const charWidth = fontSize * 0.65;
        const padding = 24;
        const width = text.length * charWidth + padding;
        const height = fontSize + 12;
        return { width, height };
    }

    private latLngToPixel(lat: number, lng: number) {
        const point = this.map.latLngToContainerPoint([lat, lng]);
        return { x: point.x, y: point.y };
    }

    private rectsOverlap(
        r1: { left: number; right: number; top: number; bottom: number },
        r2: { left: number; right: number; top: number; bottom: number },
        padding = 5,
    ) {
        return !(
            r1.right + padding < r2.left - padding ||
            r1.left - padding > r2.right + padding ||
            r1.bottom + padding < r2.top - padding ||
            r1.top - padding > r2.bottom + padding
        );
    }

    private getLabelRect(
        pixelPos: { x: number; y: number },
        labelSize: { width: number; height: number },
        position: string,
    ) {
        const offsets: Record<string, { x: number; y: number }> = {
            right: { x: 15, y: -labelSize.height / 2 },
            left: { x: -labelSize.width - 15, y: -labelSize.height / 2 },
            top: { x: -labelSize.width / 2, y: -labelSize.height - 15 },
            bottom: { x: -labelSize.width / 2, y: 15 },
            "top-right": { x: 10, y: -labelSize.height - 10 },
            "top-left": { x: -labelSize.width - 10, y: -labelSize.height - 10 },
            "bottom-right": { x: 10, y: 10 },
            "bottom-left": { x: -labelSize.width - 10, y: 10 },
        };

        const offset = offsets[position] || offsets["right"];

        return {
            left: pixelPos.x + offset.x,
            top: pixelPos.y + offset.y,
            right: pixelPos.x + offset.x + labelSize.width,
            bottom: pixelPos.y + offset.y + labelSize.height,
            position: position,
        };
    }

    private findBestLabelPosition(
        location: Location,
        labelSize: { width: number; height: number },
        allLocations: Location[],
    ) {
        const pixelPos = this.latLngToPixel(location.lat, location.lng);
        const positions = [
            "right",
            "top-right",
            "bottom-right",
            "left",
            "top-left",
            "bottom-left",
            "top",
            "bottom",
        ];

        let bestPosition = "right";
        let bestScore = -Infinity;

        for (const pos of positions) {
            const rect = this.getLabelRect(pixelPos, labelSize, pos);
            let score = 0;
            let hasOverlap = false;

            for (const placed of this.placedLabels) {
                if (this.rectsOverlap(rect, placed.rect)) {
                    hasOverlap = true;
                    score -= 100;
                }
            }

            for (const otherLoc of allLocations) {
                if (otherLoc.name === location.name) continue;
                const otherPixel = this.latLngToPixel(
                    otherLoc.lat,
                    otherLoc.lng,
                );
                const nodeRadius = this.config.nodeStyle.size + 5;
                const nodeRect = {
                    left: otherPixel.x - nodeRadius,
                    top: otherPixel.y - nodeRadius,
                    right: otherPixel.x + nodeRadius,
                    bottom: otherPixel.y + nodeRadius,
                };
                if (this.rectsOverlap(rect, nodeRect)) {
                    score -= 50;
                }
            }

            if (pos.includes("right")) score += 10;
            if (pos.includes("top")) score += 5;

            if (score > bestScore) {
                bestScore = score;
                bestPosition = pos;
            }

            if (!hasOverlap && score >= 0) {
                bestPosition = pos;
                break;
            }
        }

        return bestPosition;
    }

    private getAnchorForPosition(
        position: string,
        labelSize: { width: number; height: number },
    ): [number, number] {
        const anchors: Record<string, [number, number]> = {
            right: [-15, labelSize.height / 2],
            left: [labelSize.width + 15, labelSize.height / 2],
            top: [labelSize.width / 2, labelSize.height + 15],
            bottom: [labelSize.width / 2, -15],
            "top-right": [-10, labelSize.height + 10],
            "top-left": [labelSize.width + 10, labelSize.height + 10],
            "bottom-right": [-10, -10],
            "bottom-left": [labelSize.width + 10, -10],
        };
        return anchors[position] || anchors["right"];
    }

    private drawLabelSmart(location: Location, allLocations: Location[]) {
        const { fontSize, bgColor, textColor } = this.config.labelStyle;
        const labelSize = this.estimateLabelSize(location.name, fontSize);

        const position =
            location.labelPosition ||
            this.findBestLabelPosition(location, labelSize, allLocations);
        const anchor = this.getAnchorForPosition(position, labelSize);

        const pixelPos = this.latLngToPixel(location.lat, location.lng);
        const rect = this.getLabelRect(pixelPos, labelSize, position);
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
        const bounds = L.latLngBounds(
            locations.map((loc) => [loc.lat, loc.lng]),
        );
        this.map.fitBounds(bounds, { padding: [80, 80] });
    }

    private updateLegend(segments: Segment[]) {
        const legendItems = document.getElementById("legendItems");
        if (!legendItems) return;

        const usedTransports = new Set(
            segments.map((s) => s.transport.toLowerCase()),
        );
        legendItems.innerHTML = "";

        this.config.routeTypes
            .filter((rt) => usedTransports.has(rt.id.toLowerCase()))
            .forEach((rt) => {
                const item = document.createElement("div");
                item.className = "legend-item";

                const line = document.createElement("div");
                line.className = `legend-line ${rt.lineStyle === "dashed" ? "dashed" : ""}`;
                line.style.backgroundColor =
                    rt.lineStyle === "dashed" ? "transparent" : rt.color;
                line.style.color = rt.color;
                if (rt.lineStyle !== "dashed") line.style.background = rt.color;

                const label = document.createElement("span");
                label.textContent = rt.name;

                item.appendChild(line);
                item.appendChild(label);
                legendItems.appendChild(item);
            });
    }

    async exportImage(options: {
        includeBase: boolean;
        includeRoutes: boolean;
        includeLabels: boolean;
    }) {
        const {
            includeBase = true,
            includeRoutes = true,
            includeLabels = true,
        } = options;

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

        const mapContainer = document.getElementById("map")!;
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