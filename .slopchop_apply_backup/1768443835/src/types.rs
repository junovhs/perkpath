use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct RouteType {
    pub id: String,
    pub name: String,
    pub color: String,
    #[serde(rename = "lineStyle")]
    pub line_style: String, // "solid" | "dashed"
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct LabelStyle {
    #[serde(rename = "fontSize")]
    pub font_size: u32,
    #[serde(rename = "bgColor")]
    pub bg_color: String,
    #[serde(rename = "textColor")]
    pub text_color: String,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct NodeStyle {
    pub size: u32,
    #[serde(rename = "borderWidth")]
    pub border_width: u32,
    #[serde(rename = "arrowSize")]
    pub arrow_size: u32,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct NodeColorConfig {
    #[serde(rename = "startColor")]
    pub start: String,
    #[serde(rename = "endColor")]
    pub end: String,
    #[serde(rename = "defaultColor")]
    pub default: String,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct LegendStyle {
    pub scale: f32,
    pub position: Point,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct Point {
    pub x: f32,
    pub y: f32,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct AppConfig {
    #[serde(rename = "routeTypes")]
    pub route_types: Vec<RouteType>,
    #[serde(rename = "labelStyle")]
    pub label_style: LabelStyle,
    #[serde(rename = "nodeStyle")]
    pub node_style: NodeStyle,
    #[serde(rename = "nodeColors")]
    pub node_colors: NodeColorConfig,
    #[serde(rename = "legendStyle")]
    pub legend_style: LegendStyle,
    #[serde(rename = "activePreset")]
    pub active_preset: String,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct Location {
    pub name: String,
    pub lat: f64,
    pub lng: f64,
    #[serde(rename = "isStart", default)]
    pub is_start: bool,
    #[serde(rename = "isEnd", default)]
    pub is_end: bool,
    #[serde(rename = "labelPosition")]
    pub label_position: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct Segment {
    pub from: String,
    pub to: String,
    pub transport: String,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, Default)]
pub struct TripData {
    pub title: String,
    pub locations: Vec<Location>,
    pub segments: Vec<Segment>,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            route_types: vec![
                RouteType { id: "drive".into(), name: "Motorcoach / Drive".into(), color: "#00b4d8".into(), line_style: "solid".into() },
                RouteType { id: "rail".into(), name: "Rail".into(), color: "#00b4d8".into(), line_style: "dashed".into() },
                RouteType { id: "cruise".into(), name: "Cruise / Boat".into(), color: "#f97316".into(), line_style: "solid".into() },
                RouteType { id: "fly".into(), name: "Flight".into(), color: "#a855f7".into(), line_style: "dashed".into() },
            ],
            label_style: LabelStyle { font_size: 14, bg_color: "#ffffff".into(), text_color: "#1a1d23".into() },
            node_style: NodeStyle { size: 12, border_width: 3, arrow_size: 20 },
            node_colors: NodeColorConfig { start: "#22c55e".into(), end: "#ef4444".into(), default: "#f97316".into() },
            legend_style: LegendStyle { scale: 1.0, position: Point { x: 30.0, y: 30.0 } },
            active_preset: "standard".into(),
        }
    }
}