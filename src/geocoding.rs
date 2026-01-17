use serde::Deserialize;
use std::collections::HashMap;

static INDEX_DATA: &[u8] = include_bytes!(concat!(env!("OUT_DIR"), "/places.bin"));

#[derive(Deserialize)]
struct SerializedPlace {
    name: String,
    lat: f32,
    lng: f32,
    country: String,
    admin1: String,
    population: u32,
}

#[derive(Deserialize)]
struct SerializedIndex {
    places: Vec<SerializedPlace>,
    name_to_indices: HashMap<String, Vec<u16>>,
}

#[derive(Clone, Debug, PartialEq)]
pub struct SearchResult {
    pub name: String,
    pub display_name: String,
    pub lat: f64,
    pub lng: f64,
    pub score: f32,
}

pub struct Geocoder {
    places: Vec<SerializedPlace>,
    name_to_indices: HashMap<String, Vec<u16>>,
}

impl Geocoder {
    pub fn new() -> Self {
        let index: SerializedIndex =
            bincode::deserialize(INDEX_DATA).expect("Failed to deserialize geocoding index");

        Self {
            places: index.places,
            name_to_indices: index.name_to_indices,
        }
    }

    fn format_display_name(place: &SerializedPlace) -> String {
        // For US, Canada, Australia - show state/province
        if (place.country == "US" || place.country == "CA" || place.country == "AU")
            && !place.admin1.is_empty()
        {
            format!("{}, {}, {}", place.name, place.admin1, place.country)
        } else {
            format!("{}, {}", place.name, place.country)
        }
    }

    pub fn search(&self, query: &str, limit: usize) -> Vec<SearchResult> {
        let query_lower = query.to_lowercase();

        if query_lower.len() < 2 {
            return vec![];
        }

        let mut results: Vec<SearchResult> = vec![];
        let mut seen: std::collections::HashSet<u16> = std::collections::HashSet::new();

        // 1. Exact matches
        if let Some(indices) = self.name_to_indices.get(&query_lower) {
            for &idx in indices {
                if seen.insert(idx) {
                    let place = &self.places[idx as usize];
                    results.push(SearchResult {
                        name: place.name.clone(),
                        display_name: Self::format_display_name(place),
                        lat: place.lat as f64,
                        lng: place.lng as f64,
                        score: 1000.0 + (place.population as f32).log10(),
                    });
                }
            }
        }

        // 2. Prefix matches
        for (name, indices) in &self.name_to_indices {
            if name.starts_with(&query_lower) && name != &query_lower {
                for &idx in indices {
                    if seen.insert(idx) {
                        let place = &self.places[idx as usize];
                        results.push(SearchResult {
                            name: place.name.clone(),
                            display_name: Self::format_display_name(place),
                            lat: place.lat as f64,
                            lng: place.lng as f64,
                            score: 100.0 + (place.population as f32).log10(),
                        });
                    }
                }
            }
        }

        // 3. Contains matches
        if results.len() < limit {
            for (name, indices) in &self.name_to_indices {
                if name.contains(&query_lower) && !name.starts_with(&query_lower) {
                    for &idx in indices {
                        if seen.insert(idx) {
                            let place = &self.places[idx as usize];
                            results.push(SearchResult {
                                name: place.name.clone(),
                                display_name: Self::format_display_name(place),
                                lat: place.lat as f64,
                                lng: place.lng as f64,
                                score: 10.0 + (place.population as f32).log10(),
                            });
                        }
                    }
                }
            }
        }

        // Sort by score descending
        results.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap());
        results.truncate(limit);

        results
    }
}

use std::sync::OnceLock;
static GEOCODER: OnceLock<Geocoder> = OnceLock::new();

pub fn geocoder() -> &'static Geocoder {
    GEOCODER.get_or_init(Geocoder::new)
}

pub fn search(query: &str, limit: usize) -> Vec<SearchResult> {
    geocoder().search(query, limit)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_geocoding_search() {
        let results = search("paris", 5);

        assert!(!results.is_empty());
        assert_eq!(results[0].name, "Paris");

        // Paris, France should rank higher than Paris, Texas
        assert!(results[0].lat > 48.0 && results[0].lat < 49.0);
    }

    #[test]
    fn test_geocoding_prefix() {
        let results = search("lond", 5);

        assert!(results.iter().any(|r| r.name == "London"));
    }

    #[test]
    fn test_us_state_display() {
        let results = search("portland", 5);

        // Should show state for US cities
        assert!(results
            .iter()
            .any(|r| r.display_name.contains(", OR,") || r.display_name.contains(", ME,")));
    }
}
