use dioxus::prelude::*;
use dioxus::document::eval;
use crate::types::{AppConfig, TripData, Location, RouteType};
use crate::geo::{generate_curve, calculate_arrow_rotation};
use crate::components::legend::{Legend, LegendItem};
use crate::components::toast::{Toast, ToastMessage, ToastType};
use crate::components::map_commands::{MapCommand, LabelParams};
use std::collections::{HashMap, HashSet};

#[derive(PartialEq, Props, Clone, Copy)]
pub struct MapViewProps {
    pub config: Signal<AppConfig>,
    pub trip_data: Signal<TripData>,
}

pub fn MapView(props: MapViewProps) -> Element {
    let mut toast = use_signal(|| Option::<ToastMessage>::None);

    use_effect(move || {
        let _ = eval(r"
            let attempts = 0;
            const initInterval = setInterval(() => {
                attempts++;
                if (window.MapBridge && window.MapBridge.init()) {
                    clearInterval(initInterval);
                } else if (attempts > 10) {
                    clearInterval(initInterval);
                }
            }, 200);
        ");
    });

    let legend_items = use_memo(move || {
        let data = props.trip_data.read();
        let config = props.config.read();
        build_legend_items(&data, &config)
    });

    let _render = use_effect(move || {
        let data = props.trip_data.read();
        let config = props.config.read();

        if data.locations.is_empty() {
            return;
        }

        let commands = build_commands(&data, &config);
        if let Ok(json) = serde_json::to_string(&commands) {
            let escaped = json.replace('\\', "\\\\").replace('\'', "\\'");
            let _ = eval(&format!("window.MapBridge && window.MapBridge.execute(JSON.parse('{escaped}'));"));
            toast.set(Some(ToastMessage { text: "Map Rendered!".into(), toast_type: ToastType::Success }));
        }
    });

    rsx! {
        div {
            id: "map",
            style: "width: 100%; height: 100%; background: #a8d4e6; position: relative;",
            Legend { items: legend_items() }
        }
        Toast {
            message: toast(),
            on_dismiss: move |()| toast.set(None)
        }
    }
}

fn build_legend_items(data: &TripData, config: &AppConfig) -> Vec<LegendItem> {
    let used: HashSet<String> = data.segments.iter().map(|s| s.transport.clone()).collect();
    config.route_types.iter()
        .filter(|rt| used.contains(&rt.id))
        .map(LegendItem::from_route_type)
        .collect()
}

fn build_commands(data: &TripData, config: &AppConfig) -> Vec<MapCommand> {
    let mut cmds = vec![MapCommand::clear()];
    let loc_map: HashMap<String, &Location> = data.locations.iter().map(|l| (l.name.clone(), l)).collect();
    let style_map: HashMap<String, &RouteType> = config.route_types.iter().map(|rt| (rt.id.clone(), rt)).collect();

    for seg in &data.segments {
        if let (Some(start), Some(end)) = (loc_map.get(&seg.from), loc_map.get(&seg.to)) {
            let style = style_map.get(&seg.transport).or_else(|| style_map.values().next());
            let (color, dashed) = style.map_or(("#888".into(), false), |s| (s.color.clone(), s.line_style == "dashed"));
            let curve = generate_curve(start, end, 50);
            let pts: Vec<[f32; 2]> = curve.iter().map(|p| [p.y, p.x]).collect();
            cmds.push(MapCommand::polyline(pts, &color, dashed));
            if let Some(mid) = curve.get(curve.len() / 2) {
                cmds.push(MapCommand::arrow(mid.y, mid.x, calculate_arrow_rotation(&curve), &color, config.node_style.arrow_size));
            }
        }
    }

    for loc in &data.locations {
        let color = if loc.is_start { &config.node_colors.start }
            else if loc.is_end { &config.node_colors.end }
            else { &config.node_colors.default };
        cmds.push(MapCommand::circle(loc.lat, loc.lng, color, config.node_style.size));
        let (bg, fg) = if loc.is_start || loc.is_end { (color.clone(), "#fff".into()) }
            else { (config.label_style.bg_color.clone(), config.label_style.text_color.clone()) };
        cmds.push(MapCommand::label(&LabelParams {
            id: &loc.name, lat: loc.lat, lng: loc.lng, text: &loc.name,
            bg: &bg, fg: &fg, font_size: config.label_style.font_size, node_size: config.node_style.size,
        }));
    }

    let bounds: Vec<[f64; 2]> = data.locations.iter().map(|l| [l.lat, l.lng]).collect();
    if !bounds.is_empty() {
        cmds.push(MapCommand::fit_bounds(bounds));
    }
    cmds
}