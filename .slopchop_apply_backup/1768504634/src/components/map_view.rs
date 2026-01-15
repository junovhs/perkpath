use dioxus::prelude::*;
use crate::types::{AppConfig, TripData, Location, RouteType};
use crate::geo::{generate_curve, calculate_arrow_rotation};
use std::collections::HashMap;
use serde::Serialize;
use dioxus::document::eval;

#[derive(PartialEq, Props, Clone, Copy)]
pub struct MapViewProps {
    pub config: Signal<AppConfig>,
    pub trip_data: Signal<TripData>,
}

#[derive(Serialize)]
struct RenderData {
    routes: Vec<RenderRoute>,
    nodes: Vec<RenderNode>,
    labels: Vec<RenderLabel>,
    arrows: Vec<RenderArrow>,
}

#[derive(Serialize)]
struct RenderRoute {
    points: Vec<[f32; 2]>,
    color: String,
    style: String,
}

#[derive(Serialize)]
struct RenderNode {
    lat: f64,
    lng: f64,
    color: String,
    size: u32,
}

#[derive(Serialize)]
struct RenderLabel {
    lat: f64,
    lng: f64,
    text: String,
    bg_color: String,
    text_color: String,
}

#[derive(Serialize)]
struct RenderArrow {
    lat: f32,
    lng: f32,
    rotation: f32,
    color: String,
}

pub fn MapView(props: MapViewProps) -> Element {
    // 1. Initialize Map on Mount
    use_effect(move || {
        let _ = eval(r"
            if (window.init_map) {
                window.init_map();
            }
        ");
    });

    // 2. Memoize calculation logic
    let render_json = use_memo(move || {
        let data = props.trip_data.read();
        let config = props.config.read();
        
        if data.locations.is_empty() {
            return String::new();
        }

        let mut routes = Vec::new();
        let mut nodes = Vec::new();
        let mut labels = Vec::new();
        let mut arrows = Vec::new();

        // O(1) Lookup tables
        let loc_map: HashMap<String, &Location> = data.locations
            .iter()
            .map(|l| (l.name.clone(), l))
            .collect();

        let route_style_map: HashMap<String, &RouteType> = config.route_types
            .iter()
            .map(|rt| (rt.id.clone(), rt))
            .collect();

        // Build Routes & Arrows
        for seg in &data.segments {
            if let (Some(start), Some(end)) = (loc_map.get(&seg.from), loc_map.get(&seg.to)) {
                // Resolved P06: Use HashMap lookup instead of linear search
                let style = route_style_map.get(&seg.transport)
                    .or_else(|| route_style_map.values().next()); // Fallback to first available
                
                let (color, line_style) = match style {
                    Some(s) => (s.color.clone(), s.line_style.clone()),
                    None => ("#888888".to_string(), "solid".to_string()),
                };

                // Generate Curve
                let curve_points = generate_curve(start, end, 50);
                let leaflet_points: Vec<[f32; 2]> = curve_points.iter()
                    .map(|p| [p.y, p.x]) 
                    .collect();

                // Calculate Arrow (Fixes unused code warning by USING it)
                let rotation = calculate_arrow_rotation(&curve_points);
                if let Some(midpoint) = curve_points.get(curve_points.len() / 2) {
                    arrows.push(RenderArrow {
                        lat: midpoint.y,
                        lng: midpoint.x,
                        rotation,
                        color: color.clone(),
                    });
                }

                routes.push(RenderRoute {
                    points: leaflet_points,
                    color,
                    style: line_style,
                });
            }
        }

        // Build Nodes & Labels
        for loc in &data.locations {
            let color = if loc.is_start {
                config.node_colors.start.clone()
            } else if loc.is_end {
                config.node_colors.end.clone()
            } else {
                config.node_colors.default.clone()
            };

            nodes.push(RenderNode {
                lat: loc.lat,
                lng: loc.lng,
                color,
                size: config.node_style.size,
            });

            labels.push(RenderLabel {
                lat: loc.lat,
                lng: loc.lng,
                text: loc.name.clone(),
                bg_color: config.label_style.bg_color.clone(),
                text_color: config.label_style.text_color.clone(),
            });
        }

        let render_data = RenderData { routes, nodes, labels, arrows };
        serde_json::to_string(&render_data).unwrap_or_default()
    });

    // 3. Send Data to JS
    let json_payload = render_json();
    if !json_payload.is_empty() {
        let _ = eval(&format!(r"
            if (window.render_map_data) {{
                window.render_map_data('{}');
            }}
        ", json_payload.replace('\'', "\\'"))); // Fixed Clippy single-char pattern
    }

    rsx! {
        div {
            id: "map",
            style: "width: 100%; height: 100%; background: #a8d4e6;" 
        }
    }
}