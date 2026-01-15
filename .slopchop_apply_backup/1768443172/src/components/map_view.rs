use dioxus::prelude::*;
use crate::types::{AppConfig, TripData};

#[derive(PartialEq, Props, Clone)]
pub struct MapViewProps {
    pub config: Signal<AppConfig>,
    pub trip_data: Signal<TripData>,
}

#[component]
pub fn MapView(props: MapViewProps) -> Element {
    let location_count = props.trip_data.read().locations.len();

    rsx! {
        div {
            id: "map",
            style: "width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: #8b919a; font-size: 1.2rem;",
            if location_count == 0 {
                "Waiting for Itinerary Data..."
            } else {
                "Map Ready ({location_count} locations)"
            }
        }
    }
}