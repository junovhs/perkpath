import type { AppConfig, LabelRect, Location } from "./types";

export interface PlacedLabel {
    location: Location;
    rect: LabelRect;
    position: string;
}

export function findBestLabelPosition(
    location: Location,
    fontSize: number,
    map: L.Map,
    placedLabels: PlacedLabel[],
    allLocations: Location[],
    config: AppConfig,
): string {
    const labelSize = estimateLabelSize(location.name, fontSize);
    const pixelPos = map.latLngToContainerPoint([location.lat, location.lng]);
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
    let bestScore = Number.NEGATIVE_INFINITY;

    for (const pos of positions) {
        const rect = getLabelRect(pixelPos, labelSize, pos);
        const score = calculateScore(rect, pos, location, placedLabels, allLocations, map, config);

        if (score > bestScore) {
            bestScore = score;
            bestPosition = pos;
        }

        // Optimization: Early exit if perfect score
        if (score >= 0) return pos;
    }

    return bestPosition;
}

export function getAnchorForPosition(
    position: string,
    text: string,
    fontSize: number,
): [number, number] {
    const labelSize = estimateLabelSize(text, fontSize);
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
    return anchors[position] || anchors.right;
}

export function getLabelRect(
    pixelPos: { x: number; y: number },
    labelSize: { width: number; height: number },
    position: string,
): LabelRect {
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

    const offset = offsets[position] || offsets.right;

    return {
        left: pixelPos.x + offset.x,
        top: pixelPos.y + offset.y,
        right: pixelPos.x + offset.x + labelSize.width,
        bottom: pixelPos.y + offset.y + labelSize.height,
        position,
    };
}

function estimateLabelSize(text: string, fontSize: number) {
    const charWidth = fontSize * 0.65;
    const padding = 24;
    return {
        width: text.length * charWidth + padding,
        height: fontSize + 12,
    };
}

function calculateScore(
    rect: LabelRect,
    pos: string,
    location: Location,
    placedLabels: PlacedLabel[],
    allLocations: Location[],
    map: L.Map,
    config: AppConfig,
): number {
    let score = 0;
    if (pos.includes("right")) score += 10;
    if (pos.includes("top")) score += 5;

    if (checkLabelOverlap(rect, placedLabels)) score -= 100;
    if (checkNodeOverlap(rect, location, allLocations, map, config)) score -= 50;

    return score;
}

function rectsOverlap(r1: LabelRect, r2: LabelRect, padding = 5): boolean {
    return !(
        r1.right + padding < r2.left - padding ||
        r1.left - padding > r2.right + padding ||
        r1.bottom + padding < r2.top - padding ||
        r1.top - padding > r2.bottom + padding
    );
}

function checkLabelOverlap(rect: LabelRect, placedLabels: PlacedLabel[]): boolean {
    for (const placed of placedLabels) {
        if (rectsOverlap(rect, placed.rect)) return true;
    }
    return false;
}

function checkNodeOverlap(
    rect: LabelRect,
    currentLocation: Location,
    allLocations: Location[],
    map: L.Map,
    config: AppConfig,
): boolean {
    const nodeRadius = config.nodeStyle.size + 5;
    for (const otherLoc of allLocations) {
        if (otherLoc.name === currentLocation.name) continue;
        const point = map.latLngToContainerPoint([otherLoc.lat, otherLoc.lng]);
        const nodeRect: LabelRect = {
            left: point.x - nodeRadius,
            top: point.y - nodeRadius,
            right: point.x + nodeRadius,
            bottom: point.y + nodeRadius,
            position: "node",
        };
        if (rectsOverlap(rect, nodeRect)) return true;
    }
    return false;
}
