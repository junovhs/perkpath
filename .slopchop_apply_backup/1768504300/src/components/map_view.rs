use dioxus::prelude::*;
use crate::types::{AppConfig, TripData, Location};
use crate::geo::{generate_curve, calculate_arrow_rotation};
use std::collections::HashMap;
use serde::Serialize;

#[derive(PartialEq, Props, Clone, Copy)]
pub struct MapViewProps {
    pub config: Signal<AppConfig>,
    pub trip_data: Signal<TripData>,
}

// Data structures specifically for sending to JS
#[derive(Serialize)]
struct RenderData {
    routes: Vec<RenderRoute>,
    nodes: Vec<RenderNode>,
    labels: Vec<RenderLabel>,
}

#[derive(Serialize)]
struct RenderRoute {
    points: Vec<[f32; 2]>, // [lat, lng] format for Leaflet
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

pub fn MapView(props: MapViewProps) -> Element {
    // Need an evaluator to talk to JS
    let mut eval = use_eval();

    // 1. Initialize Map on Mount
    use_effect(move || {
        let _ = eval(r#"
            if (window.init_map) {
                window.init_map();
            }
        "#);
    });

    // 2. Memoize the calculation logic so we don't crunch math on every render
    let render_json = use_memo(move || {
        let data = props.trip_data.read();
        let config = props.config.read();
        
        if data.locations.is_empty() {
            return String::new();
        }

        let mut routes = Vec::new();
        let mut nodes = Vec::new();
        let mut labels = Vec::new();

        let loc_map: HashMap<String, &Location> = data.locations
            .iter()
            .map(|l| (l.name.clone(), l))
            .collect();

        // Build Routes
        for seg in &data.segments {
            if let (Some(start), Some(end)) = (loc_map.get(&seg.from), loc_map.get(&seg.to)) {
                // Find styling for this transport type
                let style = config.route_types.iter()
                    .find(|rt| rt.id == seg.transport)
                    .or_else(|| config.route_types.first()); // Fallback
                
                let (color, line_style) = match style {
                    Some(s) => (s.color.clone(), s.line_style.clone()),
                    None => ("#888888".to_string(), "solid".to_string()),
                };

                // Generate Curve
                // NOTE: Geo crate uses (x=lng, y=lat). Leaflet wants [lat, lng].
                let curve_points = generate_curve(start, end, 50);
                let leaflet_points: Vec<[f32; 2]> = curve_points.iter()
                    .map(|p| [p.y, p.x]) // Swap for Leaflet
                    .collect();

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

        let render_data = RenderData { routes, nodes, labels };
        serde_json::to_string(&render_data).unwrap_or_default()
    });

    // 3. Send Data to JS when it changes
    let json_payload = render_json();
    if !json_payload.is_empty() {
        let _ = eval(&format!(r#"
            if (window.render_map_data) {{
                window.render_map_data('{}');
            }}
        "#, json_payload.replace("'", "\\'"))); // Basic escape for JS string
    }

    rsx! {
        div {
            id: "map",
            style: "width: 100%; height: 100%; background: #a8d4e6;" 
        }
    }
}