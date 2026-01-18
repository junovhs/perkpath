#![allow(clippy::cast_precision_loss)]

use serde::Deserialize;
use std::cmp::Ordering;
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
        let index: SerializedIndex = bincode::deserialize(INDEX_DATA)
            .unwrap_or_else(|e| panic!("Failed to deserialize geocoding index: {e}"));

        Self {
            places: index.places,
            name_to_indices: index.name_to_indices,
        }
    }

    fn format_display_name(place: &SerializedPlace) -> String {
        if (place.country == "US" || place.country == "CA" || place.country == "AU")
            && !place.admin1.is_empty()
        {
            format!("{}, {}, {}", place.name, place.admin1, place.country)
        } else {
            format!("{}, {}", place.name, place.country)
        }
    }

    fn country_matches(country_code: &str, filter: &str) -> bool {
        let filter_lower = filter.to_lowercase();
        let code = country_code.to_lowercase();

        if code == filter_lower {
            return true;
        }

        match code.as_str() {
            "us" => matches!(filter_lower.as_str(), "usa" | "united states" | "america"),
            "gb" => matches!(
                filter_lower.as_str(),
                "uk" | "united kingdom" | "england" | "britain"
            ),
            "hr" => filter_lower == "croatia",
            "de" => filter_lower == "germany",
            "fr" => filter_lower == "france",
            "it" => filter_lower == "italy",
            "es" => filter_lower == "spain",
            "pt" => filter_lower == "portugal",
            "nl" => matches!(filter_lower.as_str(), "netherlands" | "holland"),
            "be" => filter_lower == "belgium",
            "at" => filter_lower == "austria",
            "ch" => filter_lower == "switzerland",
            "gr" => filter_lower == "greece",
            "pl" => filter_lower == "poland",
            "cz" => matches!(filter_lower.as_str(), "czech" | "czechia"),
            "se" => filter_lower == "sweden",
            "no" => filter_lower == "norway",
            "dk" => filter_lower == "denmark",
            "fi" => filter_lower == "finland",
            "ie" => filter_lower == "ireland",
            "jp" => filter_lower == "japan",
            "cn" => filter_lower == "china",
            "kr" => matches!(filter_lower.as_str(), "korea" | "south korea"),
            "au" => filter_lower == "australia",
            "nz" => filter_lower == "new zealand",
            "ca" => filter_lower == "canada",
            "mx" => filter_lower == "mexico",
            "br" => filter_lower == "brazil",
            "ar" => filter_lower == "argentina",
            "za" => filter_lower == "south africa",
            "eg" => filter_lower == "egypt",
            "tr" => matches!(filter_lower.as_str(), "turkey" | "türkiye"),
            "ru" => filter_lower == "russia",
            "in" => filter_lower == "india",
            "th" => filter_lower == "thailand",
            "vn" => filter_lower == "vietnam",
            "id" => filter_lower == "indonesia",
            "my" => filter_lower == "malaysia",
            "sg" => filter_lower == "singapore",
            "ph" => filter_lower == "philippines",
            "ae" => matches!(filter_lower.as_str(), "uae" | "emirates"),
            "il" => filter_lower == "israel",
            "ma" => filter_lower == "morocco",
            "ke" => filter_lower == "kenya",
            "is" => filter_lower == "iceland",
            "ro" => filter_lower == "romania",
            "hu" => filter_lower == "hungary",
            "bg" => filter_lower == "bulgaria",
            "ua" => filter_lower == "ukraine",
            "sk" => filter_lower == "slovakia",
            "si" => filter_lower == "slovenia",
            "rs" => filter_lower == "serbia",
            "ba" => filter_lower == "bosnia",
            "me" => filter_lower == "montenegro",
            "mk" => matches!(filter_lower.as_str(), "macedonia" | "north macedonia"),
            "al" => filter_lower == "albania",
            "cy" => filter_lower == "cyprus",
            "mt" => filter_lower == "malta",
            "ee" => filter_lower == "estonia",
            "lv" => filter_lower == "latvia",
            "lt" => filter_lower == "lithuania",
            "lu" => filter_lower == "luxembourg",
            "pe" => filter_lower == "peru",
            "cl" => filter_lower == "chile",
            "co" => filter_lower == "colombia",
            "ec" => filter_lower == "ecuador",
            "ve" => filter_lower == "venezuela",
            "cu" => filter_lower == "cuba",
            "jm" => filter_lower == "jamaica",
            "cr" => filter_lower == "costa rica",
            "pa" => filter_lower == "panama",
            _ => false,
        }
    }

    fn make_result(place: &SerializedPlace, base_score: f32) -> SearchResult {
        SearchResult {
            name: place.name.clone(),
            display_name: Self::format_display_name(place),
            lat: f64::from(place.lat),
            lng: f64::from(place.lng),
            score: base_score + (place.population as f32).log10(),
        }
    }

    pub fn search(&self, query: &str, limit: usize) -> Vec<SearchResult> {
        let query_lower = query.to_lowercase().trim().to_string();

        if query_lower.len() < 2 {
            return vec![];
        }

        let words: Vec<&str> = query_lower.split_whitespace().collect();

        let (search_term, country_filter) = if words.len() >= 2 {
            let potential_country = words[words.len() - 1];
            let city_part = words[..words.len() - 1].join(" ");
            (city_part, Some(potential_country))
        } else {
            (query_lower.clone(), None)
        };

        let mut results: Vec<SearchResult> = vec![];
        let mut seen: std::collections::HashSet<u16> = std::collections::HashSet::new();

        let passes_filter = |place: &SerializedPlace| -> bool {
            match country_filter {
                Some(filter) => Self::country_matches(&place.country, filter),
                None => true,
            }
        };

        // 1. Exact matches
        if let Some(indices) = self.name_to_indices.get(&search_term) {
            for &idx in indices {
                if seen.insert(idx) {
                    let place = &self.places[idx as usize];
                    if passes_filter(place) {
                        results.push(Self::make_result(place, 1000.0));
                    }
                }
            }
        }

        // 2. Prefix matches
        for (name, indices) in &self.name_to_indices {
            if name.starts_with(&search_term) && name != &search_term {
                for &idx in indices {
                    if seen.insert(idx) {
                        let place = &self.places[idx as usize];
                        if passes_filter(place) {
                            results.push(Self::make_result(place, 100.0));
                        }
                    }
                }
            }
        }

        // 3. Contains matches
        if results.len() < limit {
            for (name, indices) in &self.name_to_indices {
                if name.contains(&search_term) && !name.starts_with(&search_term) {
                    for &idx in indices {
                        if seen.insert(idx) {
                            let place = &self.places[idx as usize];
                            if passes_filter(place) {
                                results.push(Self::make_result(place, 10.0));
                            }
                        }
                    }
                }
            }
        }

        // If country filter yielded no results, try without it
        if results.is_empty() && country_filter.is_some() {
            return self.search(&search_term, limit);
        }

        results.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap_or(Ordering::Equal));
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

        assert!(results
            .iter()
            .any(|r| r.display_name.contains(", OR,") || r.display_name.contains(", ME,")));
    }

    #[test]
    fn test_country_filter() {
        let results = search("split croatia", 5);

        assert!(!results.is_empty());
        assert!(results[0].display_name.contains("HR"));
    }
}
