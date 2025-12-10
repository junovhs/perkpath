import L from "leaflet";
import type { Location, PlacedLabel } from "./types";

export function createLeaderLine(
    map: L.Map,
    location: Location,
    placedLabel: PlacedLabel,
    nodeSize: number,
): L.Polyline | null {
    const nodePoint = map.latLngToContainerPoint([location.lat, location.lng]);

    // Find the edge of the label closest to the node
    const edgePoint = findClosestLabelEdge(placedLabel.rect, nodePoint);

    // Calculate distance between node center and label edge
    const dist = Math.sqrt((nodePoint.x - edgePoint.x) ** 2 + (nodePoint.y - edgePoint.y) ** 2);

    // Threshold: 2.5 times the node diameter (nodeSize is radius, so diameter is size * 2)
    const nodeDiameter = nodeSize * 2;
    const threshold = nodeDiameter * 2.5;

    if (dist < threshold) return null;

    // Convert back to lat/lng for Polyline
    const nodeLatLng: [number, number] = [location.lat, location.lng];
    const edgeLatLng = map.containerPointToLatLng([edgePoint.x, edgePoint.y]);

    return L.polyline([nodeLatLng, [edgeLatLng.lat, edgeLatLng.lng]], {
        color: "#666666",
        weight: 1,
        opacity: 0.6,
        dashArray: "4, 4",
    });
}

function findClosestLabelEdge(
    rect: { left: number; top: number; right: number; bottom: number },
    point: { x: number; y: number },
): { x: number; y: number } {
    const cx = (rect.left + rect.right) / 2;
    const cy = (rect.top + rect.bottom) / 2;

    // Determine which edge is closest
    const dx = point.x - cx;
    const dy = point.y - cy;

    const halfWidth = (rect.right - rect.left) / 2;
    const halfHeight = (rect.bottom - rect.top) / 2;

    if (Math.abs(dx / halfWidth) > Math.abs(dy / halfHeight)) {
        // Closer to left or right edge
        return { x: dx > 0 ? rect.right : rect.left, y: cy };
    }
    // Closer to top or bottom edge
    return { x: cx, y: dy > 0 ? rect.bottom : rect.top };
}
