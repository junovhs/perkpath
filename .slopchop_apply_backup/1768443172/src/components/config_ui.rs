use dioxus::prelude::*;
use crate::types::AppConfig;

#[derive(PartialEq, Props, Clone)]
pub struct ConfigUIProps {
    pub config: Signal<AppConfig>,
}

#[component]
pub fn ConfigUI(_props: ConfigUIProps) -> Element {
    rsx! {
        div { class: "panel",
            h2 { "Configuration" }
            p { "Settings UI Placeholder" }
        }
    }
}