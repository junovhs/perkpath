use dioxus::prelude::*;
use crate::types::{AppConfig, TripData, Location, RouteType};
use crate::geo::{generate_curve, calculate_arrow_rotation};
use std::collections::{HashMap, HashSet};
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
    legend: Vec<RenderLegendItem>, // New Legend Data
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
    font_size: u32,
    node_size: u32,
}

#[derive(Serialize)]
struct RenderArrow {
    lat: f32,
    lng: f32,
    rotation: f32,
    color: String,
    size: u32,
}

#[derive(Serialize)]
struct RenderLegendItem {
    name: String,
    color: String,
    style: String,
}

pub fn MapView(props: MapViewProps) -> Element {
    // 1. Initialize Map on Mount
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
        build_map_json(&data, &config)
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

/// Pure function to transform App State into Renderable JSON for Leaflet
fn build_map_json(data: &TripData, config: &AppConfig) -> String {
    if data.locations.is_empty() {
        return String::new();
    }

    let mut routes = Vec::new();
    let mut nodes = Vec::new();
    let mut labels = Vec::new();
    let mut arrows = Vec::new();
    let mut used_transport_ids = HashSet::new();

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
        used_transport_ids.insert(seg.transport.clone()); // Track for legend

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
                    size: config.node_style.arrow_size,
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
        // Determine colors based on Start/End status
        let (node_color, label_bg, label_text) = if loc.is_start {
            (
                config.node_colors.start.clone(),
                config.node_colors.start.clone(), // Start Label BG = Green
                "#ffffff".to_string()             // Start Label Text = White
            )
        } else if loc.is_end {
            (
                config.node_colors.end.clone(),
                config.node_colors.end.clone(),   // End Label BG = Red
                "#ffffff".to_string()             // End Label Text = White
            )
        } else {
            (
                config.node_colors.default.clone(),
                config.label_style.bg_color.clone(),
                config.label_style.text_color.clone()
            )
        };

        nodes.push(RenderNode {
            lat: loc.lat,
            lng: loc.lng,
            color: node_color,
            size: config.node_style.size,
        });

        labels.push(RenderLabel {
            lat: loc.lat,
            lng: loc.lng,
            text: loc.name.clone(),
            bg_color: label_bg,
            text_color: label_text,
            font_size: config.label_style.font_size,
            node_size: config.node_style.size,
        });
    }

    // Build Legend
    let legend: Vec<RenderLegendItem> = config.route_types
        .iter()
        .filter(|rt| used_transport_ids.contains(&rt.id))
        .map(|rt| RenderLegendItem {
            name: rt.name.clone(),
            color: rt.color.clone(),
            style: rt.line_style.clone(),
        })
        .collect();

    let render_data = RenderData { routes, nodes, labels, arrows, legend };
    serde_json::to_string(&render_data).unwrap_or_default()
}