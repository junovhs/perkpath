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

// Reduced buffer to bring labels closer to nodes
const BUFFER_MULTIPLIER = 1.2;

export function findBestLabelPosition(
    location: { name: string; lat: number; lng: number },
    fontSize: number,
    ctx: LabelPlacementContext,
): string {
    const labelSize = estimateLabelSize(location.name, fontSize);
    const pixelPos = ctx.map.latLngToContainerPoint([location.lat, location.lng]);
    const bufferRadius = ctx.nodeSize * BUFFER_MULTIPLIER;

    let bestPosition = "right";
    let bestScore = Number.NEGATIVE_INFINITY;

    for (const pos of POSITIONS) {
        const rect = getLabelRectWithBuffer(pixelPos, labelSize, pos, bufferRadius);
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
    bufferRadius: number,
): [number, number] {
    const labelSize = estimateLabelSize(text, fontSize);

    // Tighter offsets for diagonal positions to bring corners closer
    const offset = bufferRadius + 2;

    // Anchor is the point inside the icon (in pixels) that corresponds to the latLng.
    // X goes Right, Y goes Down.
    // e.g., 'right': label is to the right. Anchor must be on the LEFT side of label.
    // Anchor X = 0 (Left edge) - offset.
    // Anchor Y = Half height.

    const anchors: Record<string, [number, number]> = {
        right: [-offset, labelSize.height / 2],
        left: [labelSize.width + offset, labelSize.height / 2],
        top: [labelSize.width / 2, labelSize.height + offset],
        bottom: [labelSize.width / 2, -offset],

        // For diagonal, we want the closest corner near the node.
        // top-right: Label is Top-Right. Closest corner is Bottom-Left.
        // So Anchor should be at Bottom-Left of label.
        // X = 0 (Left). Y = Height (Bottom).
        "top-right": [-offset * 0.5, labelSize.height + offset * 0.5],

        "top-left": [labelSize.width + offset * 0.5, labelSize.height + offset * 0.5],
        "bottom-right": [-offset * 0.5, -offset * 0.5],
        "bottom-left": [labelSize.width + offset * 0.5, -offset * 0.5],
    };
    return anchors[position] || anchors.right;
}

export function getLabelRect(
    pixelPos: { x: number; y: number },
    labelSize: { width: number; height: number },
    position: string,
): LabelRect {
    return getLabelRectWithBuffer(pixelPos, labelSize, position, 10);
}

function getLabelRectWithBuffer(
    pixelPos: { x: number; y: number },
    labelSize: { width: number; height: number },
    position: string,
    buffer: number,
): LabelRect {
    // This calculates the screen bounding box of the label relative to the node pixelPos
    const offsets: Record<string, { x: number; y: number }> = {
        right: { x: buffer, y: -labelSize.height / 2 },
        left: { x: -labelSize.width - buffer, y: -labelSize.height / 2 },
        top: { x: -labelSize.width / 2, y: -labelSize.height - buffer },
        bottom: { x: -labelSize.width / 2, y: buffer },

        // Adjusted for tighter diagonal fitting
        "top-right": { x: buffer * 0.5, y: -labelSize.height - buffer * 0.5 },
        "top-left": { x: -labelSize.width - buffer * 0.5, y: -labelSize.height - buffer * 0.5 },
        "bottom-right": { x: buffer * 0.5, y: buffer * 0.5 },
        "bottom-left": { x: -labelSize.width - buffer * 0.5, y: buffer * 0.5 },
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
