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
    weight: number,
): { point: [number, number]; icon: L.DivIcon } | null {
    if (points.length < 2) return null;

    const totalPoints = points.length;
    const arrowSize = Math.max(12, weight * 2.5);
    const index = Math.floor(totalPoints * 0.5);

    if (index <= 0 || index >= totalPoints - 1) return null;

    const point = points[index];
    const prevPoint = points[index - 3] || points[index - 1];
    const nextPoint = points[index + 3] || points[index + 1];

    const angle =
        Math.atan2(nextPoint[0] - prevPoint[0], nextPoint[1] - prevPoint[1]) * (180 / Math.PI);

    const icon = L.divIcon({
        className: "arrow-icon",
        html: `<svg width="${arrowSize * 2}" height="${arrowSize * 2}" viewBox="0 0 24 24" style="transform: rotate(${angle}deg); filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));">
      <path d="M12 4 L20 16 L12 13 L4 16 Z" fill="${color}" stroke="white" stroke-width="1.5"/>
    </svg>`,
        iconSize: [arrowSize * 2, arrowSize * 2],
        iconAnchor: [arrowSize, arrowSize],
    });

    return { point, icon };
}
