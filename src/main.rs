#![allow(non_snake_case)]

use components::map_view::MapView;
use components::sidebar::Sidebar;
use dioxus::prelude::*;
use types::{AppConfig, TripData};

mod components;
mod geo;
mod geocoding;
mod parser;
mod types;

fn main() {
    // Basic launch.
    // Since we disabled default features in Cargo.toml, the devtools client
    // (which causes the WebSocket errors) will not be initialized.
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
