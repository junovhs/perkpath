import * as turf from "@turf/turf";
import L from "leaflet";
import type { Location } from "./types";

export function generateBezierCurve(from: Location, to: Location): [number, number][] {
    const start = turf.point([from.lng, from.lat]);
    const end = turf.point([to.lng, to.lat]);

    const distance = turf.distance(start, end, { units: "kilometers" });
    const bearing = turf.bearing(start, end);
    const midPoint = turf.midpoint(start, end);

    const offsetDistance = distance * 0.15;
    const controlPoint = turf.destination(midPoint, offsetDistance, bearing + 90, {
        units: "kilometers",
    });

    const line = turf.lineString([
        [from.lng, from.lat],
        controlPoint.geometry.coordinates,
        [to.lng, to.lat],
    ]);

    const curved = turf.bezierSpline(line, {
        resolution: 10000,
        sharpness: 0.85,
    });
    return curved.geometry.coordinates.map((coord) => [coord[1], coord[0]]) as [number, number][];
}

export function createDirectionArrow(
    points: [number, number][],
    color: string,
    arrowSize: number,
): { point: [number, number]; icon: L.DivIcon } | null {
    if (points.length < 2) return null;

    const index = Math.floor(points.length * 0.5);
    const point = points[index];

    // Use Turf to calculate geographic bearing between surrounding points
    // points are [lat, lng], turf needs [lng, lat]
    const p1 = points[Math.max(0, index - 5)];
    const p2 = points[Math.min(points.length - 1, index + 5)];

    if (!p1 || !p2) return null;

    const start = turf.point([p1[1], p1[0]]);
    const end = turf.point([p2[1], p2[0]]);

    // Bearing is decimal degrees, clockwise from North (0)
    const angle = turf.bearing(start, end);

    const icon = L.divIcon({
        className: "arrow-icon",
        html: `<svg width="${arrowSize}" height="${arrowSize}" viewBox="0 0 24 24" style="transform: rotate(${angle}deg); filter: drop-shadow(0 2px 3px rgba(0,0,0,0.4)); display: block;">
            <path d="M12 2 L22 18 L12 14 L2 18 Z" fill="${color}" stroke="white" stroke-width="2"/>
        </svg>`,
        iconSize: [arrowSize, arrowSize],
        iconAnchor: [arrowSize / 2, arrowSize / 2],
    });

    return { point, icon };
}
