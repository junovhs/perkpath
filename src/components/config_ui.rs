use dioxus::prelude::*;
use crate::types::AppConfig;

#[derive(PartialEq, Props, Clone, Copy)]
pub struct ConfigUIProps {
    pub config: Signal<AppConfig>,
}

pub fn ConfigUI(props: ConfigUIProps) -> Element {
    let mut config = props.config;

    rsx! {
        div { class: "config-ui",
            // Section: Label Styling
            div { class: "panel",
                h2 { "Labels" }
                
                div { class: "config-row",
                    label { "Font Size" }
                    input { 
                        r#type: "range", 
                        min: "10", 
                        max: "24", 
                        value: "{config.read().label_style.font_size}",
                        oninput: move |evt| {
                            if let Ok(val) = evt.value().parse::<u32>() {
                                config.write().label_style.font_size = val;
                            }
                        }
                    }
                    span { "{config.read().label_style.font_size}px" }
                }

                div { class: "config-row",
                    label { "Background" }
                    input { 
                        r#type: "color", 
                        value: "{config.read().label_style.bg_color}",
                        oninput: move |evt| config.write().label_style.bg_color = evt.value()
                    }
                }

                div { class: "config-row",
                    label { "Text Color" }
                    input { 
                        r#type: "color", 
                        value: "{config.read().label_style.text_color}",
                        oninput: move |evt| config.write().label_style.text_color = evt.value()
                    }
                }
            }

            // Section: Node Styling
            div { class: "panel",
                h2 { "Nodes" }
                
                div { class: "config-row",
                    label { "Size" }
                    input { 
                        r#type: "range", 
                        min: "4", 
                        max: "20", 
                        value: "{config.read().node_style.size}",
                        oninput: move |evt| {
                            if let Ok(val) = evt.value().parse::<u32>() {
                                config.write().node_style.size = val;
                            }
                        }
                    }
                    span { "{config.read().node_style.size}px" }
                }

                div { class: "config-row",
                    label { "Start Color" }
                    input { 
                        r#type: "color", 
                        value: "{config.read().node_colors.start}",
                        oninput: move |evt| config.write().node_colors.start = evt.value()
                    }
                }

                div { class: "config-row",
                    label { "End Color" }
                    input { 
                        r#type: "color", 
                        value: "{config.read().node_colors.end}",
                        oninput: move |evt| config.write().node_colors.end = evt.value()
                    }
                }
            }
        }
    }
}