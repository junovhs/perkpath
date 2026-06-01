import L from "leaflet";
import { createDirectionArrow, generateBezierCurve } from "./geo";
import {
    estimateLabelSize,
    findBestLabelPosition,
    getAnchorForPosition,
    getLabelRect,
} from "./layout";
import type { AppConfig, Location, PlacedLabel, RouteType, Segment } from "./types";

export interface DrawContext {
    map: L.Map;
    config: AppConfig;
    routesLayer: L.LayerGroup;
    arrowsLayer: L.LayerGroup;
    nodesLayer: L.LayerGroup;
    labelsLayer: L.LayerGroup;
    onUpdate: () => void;
}

const DEFAULT_LINE_WIDTH = 5;

export function drawSegment(
    segment: Segment,
    locationMap: Record<string, Location>,
    ctx: DrawContext,
): void {
    const from = locationMap[segment.from];
    const to = locationMap[segment.to];

    if (!from || !to) return;

    const routeConfig = getRouteConfig(segment.transport, ctx.config);
    const color = routeConfig?.color || "#888888";
    const isDashed = routeConfig?.lineStyle === "dashed";

    const curvePoints = generateBezierCurve(from, to);

    L.polyline(curvePoints, {
        color,
        weight: DEFAULT_LINE_WIDTH,
        opacity: 1,
        lineCap: "round",
        lineJoin: "round",
        dashArray: isDashed ? "12, 8" : undefined,
    }).addTo(ctx.routesLayer);

    addArrow(curvePoints, color, ctx);
}

export function drawNode(location: Location, ctx: DrawContext): void {
    const { size, borderWidth } = ctx.config.nodeStyle;
    const { startColor, endColor, defaultColor } = ctx.config.nodeColors;

    let nodeColor = defaultColor;
    if (location.isStart) nodeColor = startColor;
    else if (location.isEnd) nodeColor = endColor;

    L.circleMarker([location.lat, location.lng], {
        radius: size,
        fillColor: nodeColor,
        fillOpacity: 1,
        color: "#ffffff",
        weight: borderWidth,
        opacity: 1,
    }).addTo(ctx.nodesLayer);
}

export function drawLabel(
    location: Location,
    allLocations: Location[],
    placedLabels: PlacedLabel[],
    ctx: DrawContext,
): PlacedLabel {
    const { fontSize, bgColor, textColor } = ctx.config.labelStyle;
    const { startColor, endColor } = ctx.config.nodeColors;
    const bufferRadius = ctx.config.nodeStyle.size * 2;

    const layoutCtx = {
        map: ctx.map,
        placedLabels,
        allLocations,
        nodeSize: ctx.config.nodeStyle.size,
    };

    const position = location.labelPosition || findBestLabelPosition(location, fontSize, layoutCtx);
    const anchor = getAnchorForPosition(position, location.name, fontSize, bufferRadius);
    const pixelPos = ctx.map.latLngToContainerPoint([location.lat, location.lng]);
    const labelSize = estimateLabelSize(location.name, fontSize);
    const rect = getLabelRect(pixelPos, labelSize, position);

    let bg = bgColor;
    let fg = textColor;
    if (location.isStart) {
        bg = startColor;
        fg = "#ffffff";
    } else if (location.isEnd) {
        bg = endColor;
        fg = "#ffffff";
    }

    const icon = L.divIcon({
        className: "location-label-wrapper",
        html: `<div class="location-label-inner" style="background:${bg};color:${fg};font-size:${fontSize}px;">${location.name}</div>`,
        iconAnchor: anchor,
    });

    const marker = L.marker([location.lat, location.lng], {
        icon,
        draggable: true,
        autoPan: true,
        interactive: true,
    }).addTo(ctx.labelsLayer);

    const placedLabel: PlacedLabel = { location, rect, position, marker };

    marker.on("drag", () => {
        const newLatLng = marker.getLatLng();
        const newPoint = ctx.map.latLngToContainerPoint(newLatLng);
        placedLabel.rect.left = newPoint.x;
        placedLabel.rect.top = newPoint.y;
        placedLabel.rect.right = newPoint.x + labelSize.width;
        placedLabel.rect.bottom = newPoint.y + labelSize.height;
        ctx.onUpdate();
    });

    marker.on("click", (e: L.LeafletMouseEvent) => {
        if (e.originalEvent.ctrlKey) {
            ctx.labelsLayer.removeLayer(marker);
            ctx.onUpdate();
            L.DomEvent.stopPropagation(e);
        }
    });

    return placedLabel;
}

function getRouteConfig(transport: string, config: AppConfig): RouteType | undefined {
    return config.routeTypes.find(
        (rt) =>
            rt.id.toLowerCase() === transport.toLowerCase() ||
            rt.name.toLowerCase().includes(transport.toLowerCase()),
    );
}

function addArrow(points: [number, number][], color: string, ctx: DrawContext): void {
    const arrow = createDirectionArrow(points, color, ctx.config.nodeStyle.arrowSize);
    if (arrow) {
        const marker = L.marker(arrow.point, { icon: arrow.icon, interactive: true });
        marker.addTo(ctx.arrowsLayer);

        marker.on("click", (e: L.LeafletMouseEvent) => {
            if (e.originalEvent.ctrlKey) {
                ctx.arrowsLayer.removeLayer(marker);
                L.DomEvent.stopPropagation(e);
            }
        });
    }
}
