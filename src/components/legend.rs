use dioxus::prelude::*;
use crate::types::RouteType;

#[derive(PartialEq, Props, Clone)]
pub struct LegendProps {
    pub items: Vec<LegendItem>,
}

#[derive(Clone, PartialEq)]
pub struct LegendItem {
    pub name: String,
    pub color: String,
    pub style: String,
}

impl LegendItem {
    pub fn from_route_type(rt: &RouteType) -> Self {
        Self {
            name: rt.name.clone(),
            color: rt.color.clone(),
            style: rt.line_style.clone(),
        }
    }
}

#[allow(clippy::needless_pass_by_value)]
pub fn Legend(props: LegendProps) -> Element {
    let mut position = use_signal(|| (30.0_f64, 30.0_f64));
    let mut dragging = use_signal(|| false);
    let mut drag_start = use_signal(|| (0.0_f64, 0.0_f64));

    if props.items.is_empty() {
        return rsx! {};
    }

    let (right, bottom) = *position.read();

    let onmousedown = move |e: MouseEvent| {
        dragging.set(true);
        let coords = e.client_coordinates();
        drag_start.set((coords.x, coords.y));
    };

    let onmouseup = move |_| {
        dragging.set(false);
    };

    let onmousemove = move |e: MouseEvent| {
        if *dragging.read() {
            let coords = e.client_coordinates();
            let (start_x, start_y) = *drag_start.read();
            let (cur_right, cur_bottom) = *position.read();
            let dx = coords.x - start_x;
            let dy = coords.y - start_y;
            position.set((cur_right - dx, cur_bottom - dy));
            drag_start.set((coords.x, coords.y));
        }
    };

    let cursor = if *dragging.read() { "grabbing" } else { "grab" };

    rsx! {
        div {
            class: "map-legend",
            style: "right: {right}px; bottom: {bottom}px; cursor: {cursor};",
            onmousedown: onmousedown,
            onmouseup: onmouseup,
            onmousemove: onmousemove,
            onmouseleave: move |_| dragging.set(false),

            div { class: "legend-header", "LEGEND" }

            for item in props.items.iter() {
                LegendRow { item: item.clone() }
            }
        }
    }
}

#[component]
fn LegendRow(item: LegendItem) -> Element {
    let line_style = if item.style == "dashed" {
        format!(
            "background: repeating-linear-gradient(90deg, {0}, {0} 5px, transparent 5px, transparent 10px);",
            item.color
        )
    } else {
        format!("background-color: {};", item.color)
    };

    rsx! {
        div { class: "legend-row",
            div { class: "legend-line", style: "{line_style}" }
            span { "{item.name}" }
        }
    }
}