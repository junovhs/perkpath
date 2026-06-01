import type { AppConfig, ColorPreset, RouteType, TripData } from "./types";

export const COLOR_PRESETS: Record<string, ColorPreset> = {
    standard: {
        name: "Standard",
        routes: { drive: "#00b4d8", rail: "#00b4d8", cruise: "#f97316", fly: "#a855f7" },
        nodes: { startColor: "#22c55e", endColor: "#ef4444", defaultColor: "#f97316" },
    },
    ocean: {
        name: "Ocean",
        routes: { drive: "#0ea5e9", rail: "#0284c7", cruise: "#06b6d4", fly: "#0369a1" },
        nodes: { startColor: "#06b6d4", endColor: "#0369a1", defaultColor: "#0ea5e9" },
    },
    earth: {
        name: "Earth",
        routes: { drive: "#84cc16", rail: "#65a30d", cruise: "#ca8a04", fly: "#b45309" },
        nodes: { startColor: "#84cc16", endColor: "#b45309", defaultColor: "#65a30d" },
    },
    sunset: {
        name: "Sunset",
        routes: { drive: "#f97316", rail: "#ea580c", cruise: "#dc2626", fly: "#be185d" },
        nodes: { startColor: "#fbbf24", endColor: "#dc2626", defaultColor: "#f97316" },
    },
};

export function createRouteTypes(preset: ColorPreset): RouteType[] {
    return [
        { id: "drive", name: "Motorcoach / Drive", color: preset.routes.drive, lineStyle: "solid" },
        { id: "rail", name: "Rail", color: preset.routes.rail, lineStyle: "dashed" },
        { id: "cruise", name: "Cruise / Boat", color: preset.routes.cruise, lineStyle: "solid" },
        { id: "fly", name: "Flight", color: preset.routes.fly, lineStyle: "dashed" },
    ];
}

export const DEFAULT_CONFIG: AppConfig = {
    routeTypes: createRouteTypes(COLOR_PRESETS.standard),
    labelStyle: {
        fontSize: 14,
        bgColor: "#ffffff",
        textColor: "#1a1d23",
    },
    nodeStyle: {
        size: 12,
        borderWidth: 3,
        arrowSize: 20,
    },
    nodeColors: COLOR_PRESETS.standard.nodes,
    legendStyle: {
        scale: 1,
        position: { x: 30, y: 30 },
    },
    activePreset: "standard",
};

export const ALASKA_EXAMPLE: TripData = {
    title: "Alaska Cruise & Land Tour",
    locations: [
        {
            name: "Denali Ntl Park",
            lat: 63.1148,
            lng: -151.1926,
            isStart: true,
            labelPosition: "left",
        },
        { name: "Talkeetna", lat: 62.3209, lng: -150.1066, labelPosition: "top" },
        { name: "Anchorage", lat: 61.2181, lng: -149.9003, labelPosition: "left" },
        { name: "Girdwood", lat: 60.9426, lng: -149.1663, labelPosition: "top-right" },
        { name: "Seward", lat: 60.1042, lng: -149.4422, labelPosition: "left" },
        { name: "Hubbard Glacier", lat: 60.0192, lng: -139.4716, labelPosition: "top-right" },
        { name: "Skagway", lat: 59.4583, lng: -135.3139, labelPosition: "right" },
        { name: "Sitka", lat: 57.0531, lng: -135.33, labelPosition: "right" },
        { name: "Ketchikan", lat: 55.3422, lng: -131.6461, labelPosition: "right" },
        { name: "Vancouver", lat: 49.2827, lng: -123.1207, isEnd: true, labelPosition: "bottom" },
    ],
    segments: [
        { from: "Denali Ntl Park", to: "Talkeetna", transport: "rail" },
        { from: "Talkeetna", to: "Anchorage", transport: "rail" },
        { from: "Anchorage", to: "Girdwood", transport: "drive" },
        { from: "Girdwood", to: "Seward", transport: "drive" },
        { from: "Seward", to: "Hubbard Glacier", transport: "cruise" },
        { from: "Hubbard Glacier", to: "Skagway", transport: "cruise" },
        { from: "Skagway", to: "Sitka", transport: "cruise" },
        { from: "Sitka", to: "Ketchikan", transport: "cruise" },
        { from: "Ketchikan", to: "Vancouver", transport: "cruise" },
    ],
};
