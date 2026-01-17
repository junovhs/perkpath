use crate::components::config_ui::ConfigUI;
use crate::components::location_search::LocationSearch;
use crate::geocoding::SearchResult;
use crate::parser::generate_prompt;
use crate::types::{AppConfig, TripData};
use dioxus::document::eval;
use dioxus::prelude::*;

#[derive(PartialEq, Props, Clone)]
pub struct SidebarProps {
    pub config: Signal<AppConfig>,
    pub trip_data: Signal<TripData>,
}

pub fn Sidebar(mut props: SidebarProps) -> Element {
    const TABS: &[&str] = &["input", "prompt", "render", "config"];

    let mut active_tab = use_signal(|| "input".to_string());
    let mut itinerary_input = use_signal(String::new);
    let mut generated_prompt = use_signal(String::new);
    let mut json_input = use_signal(String::new);

    rsx! {
        aside { class: "sidebar",
            header { class: "sidebar-header",
                h1 { "Perk", span { class: "accent", "Path" } }
                p { class: "tagline", "Itinerary -> Prompt -> JSON -> Map" }
            }

            nav { class: "tabs",
                for tab in TABS {
                    button {
                        class: if active_tab() == *tab { "tab active" } else { "tab" },
                        onclick: move |_| active_tab.set((*tab).to_string()),
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
                            generated_prompt.set(prompt.clone());
                            active_tab.set("prompt".to_string());

                            let js = format!("navigator.clipboard.writeText(`{}`).then(() => window.show_toast('Prompt copied to clipboard!', 'success'), () => window.show_toast('Failed to copy', 'error'));", prompt.replace('`', "\\`"));
                            let _ = eval(&js);
                        },
                        "Generate Prompt & Copy ->"
                    }
                }

                div { class: "panel",
                    h2 { "Quick Add Stop" }
                    LocationSearch {
                        placeholder: "Search cities...",
                        on_select: move |result: SearchResult| {
                            web_sys::console::log_1(
                                &format!("Selected: {} at ({}, {})", result.name, result.lat, result.lng).into()
                            );
                        }
                    }
                }
            }

            // PROMPT TAB
            div { class: if active_tab() == "prompt" { "tab-content active" } else { "tab-content" },
                div { class: "panel",
                    h2 { "Copy to AI" }
                    div { class: "prompt-output", "{generated_prompt}" }
                    p { class: "hint", "Prompt is already copied! Paste this into ChatGPT/Claude, then copy the JSON response." }
                    button {
                        class: "secondary-btn",
                        onclick: move |_| {
                            let prompt = generated_prompt();
                            let js = format!("navigator.clipboard.writeText(`{}`).then(() => window.show_toast('Prompt copied!', 'success'));", prompt.replace('`', "\\`"));
                            let _ = eval(&js);
                        },
                        "Copy Again"
                    }
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
                                Ok(data) => {
                                    props.trip_data.set(data);
                                    let _ = eval("window.show_toast('Parsing JSON...', 'success')");
                                },
                                Err(e) => {
                                    println!("JSON Error: {e}");
                                    let msg = format!("JSON Error: {e}");
                                    let js = format!("window.show_toast(`{}`, 'error')", msg.replace('`', "\\`"));
                                    let _ = eval(&js);
                                }
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
