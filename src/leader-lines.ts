import L from "leaflet";
import type { Location, PlacedLabel } from "./types";

export function createLeaderLine(
    map: L.Map,
    location: Location,
    placedLabel: PlacedLabel,
    nodeSize: number,
): L.Polyline | null {
    const rect = getLabelRect(map, placedLabel);
    if (!rect) return null;

    const nodePoint = map.latLngToContainerPoint([location.lat, location.lng]);
    const closestCorner = findClosestCorner(rect, nodePoint);

    const dist = Math.sqrt(
        (nodePoint.x - closestCorner.x) ** 2 + (nodePoint.y - closestCorner.y) ** 2,
    );

    const threshold = nodeSize * 5;
    if (dist < threshold) return null;

    const angle = Math.atan2(closestCorner.y - nodePoint.y, closestCorner.x - nodePoint.x);
    const nodeEdge = {
        x: nodePoint.x + Math.cos(angle) * nodeSize,
        y: nodePoint.y + Math.sin(angle) * nodeSize,
    };

    const nodeEdgeLatLng = map.containerPointToLatLng([nodeEdge.x, nodeEdge.y]);
    const cornerLatLng = map.containerPointToLatLng([closestCorner.x, closestCorner.y]);

    return L.polyline(
        [
            [nodeEdgeLatLng.lat, nodeEdgeLatLng.lng],
            [cornerLatLng.lat, cornerLatLng.lng],
        ],
        {
            color: "#666666",
            weight: 1,
            opacity: 0.6,
            dashArray: "4, 4",
        },
    );
}

function getLabelRect(
    map: L.Map,
    placedLabel: PlacedLabel,
): { left: number; top: number; right: number; bottom: number } | null {
    if (!placedLabel.marker) return null;

    const el = placedLabel.marker.getElement();
    if (!el) return null;

    // Get the inner label element for accurate dimensions
    const inner = el.querySelector(".location-label-inner") as HTMLElement;
    if (!inner) return null;

    const containerRect = map.getContainer().getBoundingClientRect();
    const labelRect = inner.getBoundingClientRect();

    return {
        left: labelRect.left - containerRect.left,
        top: labelRect.top - containerRect.top,
        right: labelRect.right - containerRect.left,
        bottom: labelRect.bottom - containerRect.top,
    };
}

function findClosestCorner(
    rect: { left: number; top: number; right: number; bottom: number },
    point: { x: number; y: number },
): { x: number; y: number } {
    const corners = [
        { x: rect.left, y: rect.top },
        { x: rect.right, y: rect.top },
        { x: rect.left, y: rect.bottom },
        { x: rect.right, y: rect.bottom },
    ];

    let closest = corners[0];
    let minDist = Number.MAX_VALUE;

    for (const corner of corners) {
        const d = (point.x - corner.x) ** 2 + (point.y - corner.y) ** 2;
        if (d < minDist) {
            minDist = d;
            closest = corner;
        }
    }

    return closest;
}
