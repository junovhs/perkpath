import type { LabelPlacementContext, LabelRect, PlacedLabel } from "./types";

const POSITIONS = [
    "right",
    "top-right",
    "bottom-right",
    "left",
    "top-left",
    "bottom-left",
    "top",
    "bottom",
];

export function findBestLabelPosition(
    location: { name: string; lat: number; lng: number },
    fontSize: number,
    ctx: LabelPlacementContext,
): string {
    const labelSize = estimateLabelSize(location.name, fontSize);
    const pixelPos = ctx.map.latLngToContainerPoint([location.lat, location.lng]);

    let bestPosition = "right";
    let bestScore = Number.NEGATIVE_INFINITY;

    for (const pos of POSITIONS) {
        const rect = getLabelRect(pixelPos, labelSize, pos);
        const score = calculatePositionScore(rect, pos, ctx);

        if (score > bestScore) {
            bestScore = score;
            bestPosition = pos;
        }

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

export function estimateLabelSize(text: string, fontSize: number) {
    const charWidth = fontSize * 0.65;
    const padding = 24;
    return {
        width: text.length * charWidth + padding,
        height: fontSize + 12,
    };
}

function calculatePositionScore(rect: LabelRect, pos: string, ctx: LabelPlacementContext): number {
    let score = 0;
    if (pos.includes("right")) score += 10;
    if (pos.includes("top")) score += 5;

    if (hasLabelOverlap(rect, ctx.placedLabels)) score -= 100;
    if (hasNodeOverlap(rect, ctx)) score -= 50;

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

function hasLabelOverlap(rect: LabelRect, placedLabels: PlacedLabel[]): boolean {
    for (const placed of placedLabels) {
        if (rectsOverlap(rect, placed.rect)) return true;
    }
    return false;
}

function hasNodeOverlap(rect: LabelRect, ctx: LabelPlacementContext): boolean {
    const nodeRadius = ctx.nodeSize + 5;
    for (const loc of ctx.allLocations) {
        const point = ctx.map.latLngToContainerPoint([loc.lat, loc.lng]);
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
