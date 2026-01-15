use dioxus::prelude::*;
use crate::types::{AppConfig, TripData, Location};
use crate::geo::{generate_curve, calculate_arrow_rotation};
use std::collections::HashMap;

#[derive(PartialEq, Props, Clone, Copy)]
pub struct MapViewProps {
    pub config: Signal<AppConfig>,
    pub trip_data: Signal<TripData>,
}

pub fn MapView(props: MapViewProps) -> Element {
    let trip_data = props.trip_data.read();
    let location_count = trip_data.locations.len();

    // Calculate routes (Geospatial Logic Integration)
    // This memoizes the route calculation, ensuring 'geo' crate logic is actually used.
    let calculated_routes = use_memo(move || {
        let data = props.trip_data.read();
        if data.locations.is_empty() || data.segments.is_empty() {
            return Vec::new();
        }

        let loc_map: HashMap<String, &Location> = data.locations
            .iter()
            .map(|l| (l.name.clone(), l))
            .collect();

        data.segments.iter().filter_map(|seg| {
            let start = loc_map.get(&seg.from)?;
            let end = loc_map.get(&seg.to)?;
            
            let path = generate_curve(start, end, 50);
            let arrow_rot = calculate_arrow_rotation(&path);
            
            Some((seg.clone(), path, arrow_rot))
        }).collect::<Vec<_>>()
    });

    rsx! {
        div {
            id: "map",
            style: "width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #8b919a; font-size: 1.2rem;",
            if location_count == 0 {
                "Waiting for Itinerary Data..."
            } else {
                div {
                    "Map Ready ({location_count} locations)"
                }
                div {
                    style: "font-size: 0.8rem; margin-top: 10px;",
                    "Calculated {calculated_routes.read().len()} routes using Geospatial Engine."
                }
            }
        }
    }
}