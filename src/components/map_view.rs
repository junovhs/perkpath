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
    legend: Vec<RenderLegendItem>,
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

    let render_json = use_memo(move || {
        let data = props.trip_data.read();
        let config = props.config.read();
        build_map_json(&data, &config)
    });

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

fn build_map_json(data: &TripData, config: &AppConfig) -> String {
    if data.locations.is_empty() {
        return String::new();
    }

    let mut used_transport_ids = HashSet::new();
    let (routes, arrows) = create_render_routes(data, config, &mut used_transport_ids);
    let (nodes, labels) = create_render_nodes_and_labels(data, config);
    
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

fn create_render_routes(
    data: &TripData, 
    config: &AppConfig,
    used_ids: &mut HashSet<String>
) -> (Vec<RenderRoute>, Vec<RenderArrow>) {
    let mut routes = Vec::new();
    let mut arrows = Vec::new();

    let loc_map: HashMap<String, &Location> = data.locations
        .iter().map(|l| (l.name.clone(), l)).collect();

    let style_map: HashMap<String, &RouteType> = config.route_types
        .iter().map(|rt| (rt.id.clone(), rt)).collect();

    for seg in &data.segments {
        used_ids.insert(seg.transport.clone());
        if let (Some(start), Some(end)) = (loc_map.get(&seg.from), loc_map.get(&seg.to)) {
            let style = style_map.get(&seg.transport).or_else(|| style_map.values().next());
            let (color, l_style) = style.map_or(("#888".to_owned(), "solid".to_owned()), |s| (s.color.clone(), s.line_style.clone()));

            let curve = generate_curve(start, end, 50);
            let leaflet_pts: Vec<[f32; 2]> = curve.iter().map(|p| [p.y, p.x]).collect();

            if let Some(mid) = curve.get(curve.len() / 2) {
                arrows.push(RenderArrow {
                    lat: mid.y, lng: mid.x, rotation: calculate_arrow_rotation(&curve),
                    color: color.clone(), size: config.node_style.arrow_size,
                });
            }
            routes.push(RenderRoute { points: leaflet_pts, color, style: l_style });
        }
    }
    (routes, arrows)
}

fn create_render_nodes_and_labels(data: &TripData, config: &AppConfig) -> (Vec<RenderNode>, Vec<RenderLabel>) {
    let mut nodes = Vec::new();
    let mut labels = Vec::new();

    for loc in &data.locations {
        let (n_color, l_bg, l_txt) = if loc.is_start {
            (config.node_colors.start.clone(), config.node_colors.start.clone(), "#fff".to_owned())
        } else if loc.is_end {
            (config.node_colors.end.clone(), config.node_colors.end.clone(), "#fff".to_owned())
        } else {
            (config.node_colors.default.clone(), config.label_style.bg_color.clone(), config.label_style.text_color.clone())
        };

        nodes.push(RenderNode { lat: loc.lat, lng: loc.lng, color: n_color, size: config.node_style.size });
        labels.push(RenderLabel {
            lat: loc.lat, lng: loc.lng, text: loc.name.clone(),
            bg_color: l_bg, text_color: l_txt,
            font_size: config.label_style.font_size, node_size: config.node_style.size,
        });
    }
    (nodes, labels)
}