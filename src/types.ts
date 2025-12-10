export interface RouteType {
    id: string;
    name: string;
    color: string;
    lineStyle: "solid" | "dashed";
    lineWidth: number;
}

export interface AppConfig {
    routeTypes: RouteType[];
    labelStyle: {
        fontSize: number;
        bgColor: string;
        textColor: string;
    };
    nodeStyle: {
        size: number;
        borderWidth: number;
    };
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
