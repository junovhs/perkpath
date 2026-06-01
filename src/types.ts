export interface RouteType {
    id: string;
    name: string;
    color: string;
    lineStyle: "solid" | "dashed";
}

export interface LabelStyle {
    fontSize: number;
    bgColor: string;
    textColor: string;
}

export interface NodeStyle {
    size: number;
    borderWidth: number;
    arrowSize: number;
}

export interface NodeColorConfig {
    startColor: string;
    endColor: string;
    defaultColor: string;
}

export interface LegendStyle {
    scale: number;
    position: { x: number; y: number };
}

export interface ColorPreset {
    name: string;
    routes: { drive: string; rail: string; cruise: string; fly: string };
    nodes: NodeColorConfig;
}

export interface AppConfig {
    routeTypes: RouteType[];
    labelStyle: LabelStyle;
    nodeStyle: NodeStyle;
    nodeColors: NodeColorConfig;
    legendStyle: LegendStyle;
    activePreset: string;
}

export interface Location {
    name: string;
    lat: number;
    lng: number;
    isStart?: boolean;
    isEnd?: boolean;
    labelPosition?: string;
}

export interface Segment {
    from: string;
    to: string;
    transport: string;
}

export interface TripData {
    title: string;
    locations: Location[];
    segments: Segment[];
}

export interface LabelRect {
    left: number;
    top: number;
    right: number;
    bottom: number;
    position: string;
}

export interface PlacedLabel {
    location: Location;
    rect: LabelRect;
    position: string;
    marker?: L.Marker;
}

export interface LabelPlacementContext {
    map: L.Map;
    placedLabels: PlacedLabel[];
    allLocations: Location[];
    nodeSize: number;
}

export interface ViewOptions {
    showBase: boolean;
    showRoutes: boolean;
    showNodes: boolean;
    showLabels: boolean;
    showArrows: boolean;
}

export interface SavedView {
    id: string;
    name: string;
    timestamp: number;
    tripData: TripData;
    center: { lat: number; lng: number };
    zoom: number;
    config: AppConfig;
}

export interface ExportOptions {
    includeBase: boolean;
    includeRoutes: boolean;
    includeLabels: boolean;
    includeNodes: boolean;
    includeArrows: boolean;
}
