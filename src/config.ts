import type { AppConfig, RouteType, TripData } from "./types";

export const DEFAULT_ROUTE_TYPES: RouteType[] = [
    {
        id: "drive",
        name: "Motorcoach / Drive",
        color: "#00b4d8",
        lineStyle: "solid",
        lineWidth: 5,
    },
    {
        id: "rail",
        name: "Rail",
        color: "#00b4d8",
        lineStyle: "dashed",
        lineWidth: 5,
    },
    {
        id: "cruise",
        name: "Cruise / Boat",
        color: "#f97316",
        lineStyle: "solid",
        lineWidth: 5,
    },
    {
        id: "fly",
        name: "Flight",
        color: "#a855f7",
        lineStyle: "dashed",
        lineWidth: 4,
    },
];

export const DEFAULT_CONFIG: AppConfig = {
    routeTypes: DEFAULT_ROUTE_TYPES,
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
    legendStyle: {
        scale: 1,
        position: { x: 30, y: 30 },
    },
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
