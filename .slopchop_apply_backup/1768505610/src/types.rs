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

impl Point {
    pub fn new(x: f32, y: f32) -> Self {
        Self { x, y }
    }
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
    #[serde(default)]
    pub title: String,
    #[serde(default)]
    pub locations: Vec<Location>,
    #[serde(default)]
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_trip_data_defaults() {
        // Empty JSON object should result in default values
        let json = "{}";
        let data: TripData = serde_json::from_str(json).unwrap();
        
        assert_eq!(data.title, "");
        assert!(data.locations.is_empty());
        assert!(data.segments.is_empty());
    }

    #[test]
    fn test_location_defaults() {
        // Only required fields (name, lat, lng)
        let json = r#"{ "name": "Test", "lat": 10.0, "lng": 20.0 }"#;
        let loc: Location = serde_json::from_str(json).unwrap();
        
        assert_eq!(loc.name, "Test");
        assert!(!loc.is_start);
        assert!(!loc.is_end);
        assert!(loc.label_position.is_none());
    }

    #[test]
    fn test_full_roundtrip() {
        let original = TripData {
            title: "My Trip".into(),
            locations: vec![
                Location {
                    name: "Loc1".into(),
                    lat: 10.0,
                    lng: 10.0,
                    is_start: true,
                    is_end: false,
                    label_position: Some("top".into()),
                }
            ],
            segments: vec![
                Segment {
                    from: "Loc1".into(),
                    to: "Loc2".into(),
                    transport: "drive".into(),
                }
            ],
        };
        
        let json = serde_json::to_string(&original).unwrap();
        let parsed: TripData = serde_json::from_str(&json).unwrap();
        
        assert_eq!(parsed.title, original.title);
        assert_eq!(parsed.locations.len(), 1);
        assert_eq!(parsed.locations[0].name, "Loc1");
        assert!(parsed.locations[0].is_start);
        assert_eq!(parsed.locations[0].label_position, Some("top".to_string()));
    }
}