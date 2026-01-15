use dioxus::prelude::*;
use crate::types::{AppConfig, TripData};
use crate::parser::generate_prompt;
use crate::components::config_ui::ConfigUI;

#[derive(PartialEq, Props, Clone)]
pub struct SidebarProps {
    pub config: Signal<AppConfig>,
    pub trip_data: Signal<TripData>,
}

#[component]
pub fn Sidebar(mut props: SidebarProps) -> Element {
    let mut active_tab = use_signal(|| "input".to_string());
    let mut itinerary_input = use_signal(String::new);
    let mut generated_prompt = use_signal(String::new);
    let mut json_input = use_signal(String::new);

    let tabs = vec!["input", "prompt", "render", "config"];

    rsx! {
        aside { class: "sidebar",
            header { class: "sidebar-header",
                h1 { "Perk", span { class: "accent", "Path" } }
                p { class: "tagline", "Itinerary -> Prompt -> JSON -> Map" }
            }

            nav { class: "tabs",
                for tab in tabs {
                    button {
                        class: if active_tab() == *tab { "tab active" } else { "tab" },
                        onclick: move |_| active_tab.set(tab.to_string()),
                        "{tab.to_uppercase()}"
                    }
                }
            }

            // INPUT TAB
            div { class: if active_tab() == "input" { "tab-content active" } else { "tab-content" },
                div { class: "panel",
                    h2 { "Paste Itinerary" }
                    textarea {
                        placeholder: "Paste travel text here...",
                        value: "{itinerary_input}",
                        oninput: move |evt| itinerary_input.set(evt.value())
                    }
                    button {
                        class: "primary-btn",
                        onclick: move |_| {
                            let prompt = generate_prompt(&itinerary_input(), &props.config.read().route_types);
                            generated_prompt.set(prompt);
                            active_tab.set("prompt".to_string());
                        },
                        "Generate Prompt ->"
                    }
                }
            }

            // PROMPT TAB
            div { class: if active_tab() == "prompt" { "tab-content active" } else { "tab-content" },
                div { class: "panel",
                    h2 { "Copy to AI" }
                    div { class: "prompt-output", "{generated_prompt}" }
                    p { class: "hint", "Paste this into ChatGPT/Claude, then copy the JSON response." }
                }
            }

            // RENDER TAB
            div { class: if active_tab() == "render" { "tab-content active" } else { "tab-content" },
                div { class: "panel",
                    h2 { "Paste JSON Response" }
                    textarea {
                        placeholder: "Paste JSON here...",
                        value: "{json_input}",
                        oninput: move |evt| json_input.set(evt.value())
                    }
                    button {
                        class: "primary-btn",
                        onclick: move |_| {
                            match serde_json::from_str::<TripData>(&json_input()) {
                                Ok(data) => props.trip_data.set(data),
                                Err(e) => println!("JSON Error: {e}"),
                            }
                        },
                        "Render Map"
                    }
                }
            }

            // CONFIG TAB
            div { class: if active_tab() == "config" { "tab-content active" } else { "tab-content" },
                ConfigUI { config: props.config }
            }
        }
    }
}