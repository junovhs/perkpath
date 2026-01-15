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
    node_size: u32,
}

#[derive(Serialize)]
struct RenderArrow {
    lat: f32,
    lng: f32,
    rotation: f32,
    color: String,
}

pub fn MapView(props: MapViewProps) -> Element {
    // 1. Initialize Map with Retry Logic
    // We poll every 200ms for up to 2 seconds if init fails (e.g. script load delay)
    use_effect(move || {
        let _ = eval(r"
            let attempts = 0;
            const initInterval = setInterval(() => {
                attempts++;
                if (window.init_map && window.init_map()) {
                    clearInterval(initInterval);
                } else if (attempts > 10) {
                    clearInterval(initInterval);
                    console.error('Failed to initialize map after 10 attempts');
                }
            }, 200);
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
                let style = route_style_map.get(&seg.transport)
                    .or_else(|| route_style_map.values().next());
                
                let (color, line_style) = match style {
                    Some(s) => (s.color.clone(), s.line_style.clone()),
                    None => ("#888888".to_string(), "solid".to_string()),
                };

                let curve_points = generate_curve(start, end, 50);
                let leaflet_points: Vec<[f32; 2]> = curve_points.iter()
                    .map(|p| [p.y, p.x]) 
                    .collect();

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
                node_size: config.node_style.size,
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
        ", json_payload.replace('\'', "\\'")));
    }

    rsx! {
        div {
            id: "map",
            style: "width: 100%; height: 100%; background: #a8d4e6;" 
        }
    }
}