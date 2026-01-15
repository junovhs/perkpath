use serde::Serialize;

#[derive(Serialize, Default)]
pub struct MapCommand {
    #[serde(rename = "type")]
    pub cmd_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub points: Option<Vec<[f32; 2]>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub options: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub latlng: Option<[f64; 2]>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub html: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub size: Option<[u32; 2]>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub anchor: Option<[u32; 2]>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub bounds: Option<Vec<[f64; 2]>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub padding: Option<[f64; 2]>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub id: Option<String>,
    #[serde(rename = "nodeLat", skip_serializing_if = "Option::is_none")]
    pub node_lat: Option<f64>,
    #[serde(rename = "nodeLng", skip_serializing_if = "Option::is_none")]
    pub node_lng: Option<f64>,
    #[serde(rename = "nodeSize", skip_serializing_if = "Option::is_none")]
    pub node_size: Option<u32>,
}

pub struct LabelParams<'a> {
    pub id: &'a str,
    pub lat: f64,
    pub lng: f64,
    pub text: &'a str,
    pub bg: &'a str,
    pub fg: &'a str,
    pub font_size: u32,
    pub node_size: u32,
}

impl MapCommand {
    pub fn clear() -> Self {
        Self { cmd_type: "clear".into(), ..Default::default() }
    }

    pub fn polyline(points: Vec<[f32; 2]>, color: &str, dashed: bool) -> Self {
        let dash = if dashed { serde_json::json!("10, 10") } else { serde_json::json!(null) };
        Self {
            cmd_type: "polyline".into(),
            points: Some(points),
            options: Some(serde_json::json!({
                "color": color, "weight": 4, "opacity": 0.8,
                "dashArray": dash, "lineCap": "round", "lineJoin": "round"
            })),
            ..Default::default()
        }
    }

    pub fn circle(lat: f64, lng: f64, color: &str, size: u32) -> Self {
        Self {
            cmd_type: "circle".into(),
            latlng: Some([lat, lng]),
            options: Some(serde_json::json!({
                "radius": size, "fillColor": color, "fillOpacity": 1,
                "color": "#ffffff", "weight": 2, "opacity": 1
            })),
            ..Default::default()
        }
    }

    pub fn arrow(lat: f32, lng: f32, rotation: f32, color: &str, size: u32) -> Self {
        let svg = format!(
            r#"<div style="transform:rotate({rotation}deg);color:{color};width:{size}px;height:{size}px;display:flex;align-items:center;justify-content:center;">
            <svg viewBox="0 0 24 24" width="100%" height="100%">
            <path d="M12,5 L20,20 L12,17 L4,20 Z" fill="currentColor" stroke="white" stroke-width="1.5"/>
            </svg></div>"#
        );
        Self {
            cmd_type: "arrow".into(),
            latlng: Some([f64::from(lat), f64::from(lng)]),
            html: Some(svg),
            size: Some([size, size]),
            anchor: Some([size / 2, size / 2]),
            ..Default::default()
        }
    }

    pub fn label(p: &LabelParams<'_>) -> Self {
        let html = format!(
            r#"<div class="label-inner" style="background:{};color:{};padding:6px 10px;border-radius:6px;font-size:{}px;font-weight:700;white-space:nowrap;box-shadow:0 3px 8px rgba(0,0,0,0.2);cursor:grab;">{}</div>"#,
            p.bg, p.fg, p.font_size, p.text
        );
        Self {
            cmd_type: "label".into(),
            latlng: Some([p.lat, p.lng]),
            html: Some(html),
            id: Some(p.id.into()),
            node_lat: Some(p.lat),
            node_lng: Some(p.lng),
            node_size: Some(p.node_size),
            ..Default::default()
        }
    }

    pub fn fit_bounds(bounds: Vec<[f64; 2]>) -> Self {
        Self {
            cmd_type: "fit".into(),
            bounds: Some(bounds),
            padding: Some([100.0, 100.0]),
            ..Default::default()
        }
    }
}