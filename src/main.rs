#![allow(non_snake_case)]

use dioxus::prelude::*;
use components::sidebar::Sidebar;
use components::map_view::MapView;
use types::{AppConfig, TripData};

mod components;
mod geo;
mod parser;
mod types;

fn main() {
    launch(App);
}

fn App() -> Element {
    // Global State
    let config = use_signal(AppConfig::default);
    let trip_data = use_signal(TripData::default);

    rsx! {
        div { class: "app",
            Sidebar {
                config: config,
                trip_data: trip_data
            }
            main { class: "map-container",
                MapView {
                    config: config,
                    trip_data: trip_data
                }
            }
        }
    }
}