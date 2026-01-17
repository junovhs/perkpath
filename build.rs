use std::collections::HashMap;
use std::env;
use std::fs::File;
use std::io::{BufRead, BufReader, Write};
use std::path::Path;

fn main() {
    println!("cargo:rerun-if-changed=data/cities15000.txt");

    let out_dir = env::var("OUT_DIR").unwrap();
    let dest_path = Path::new(&out_dir).join("places.bin");

    eprintln!("Building geocoding index...");

    let places = parse_geonames("data/cities15000.txt");
    eprintln!("Parsed {} places", places.len());

    let index_data = build_index(&places);

    let mut file = File::create(&dest_path).unwrap();
    file.write_all(&index_data).unwrap();

    eprintln!("Wrote index to {:?}", dest_path);
}

#[derive(Clone)]
struct Place {
    name: String,
    ascii_name: String,
    alt_names: Vec<String>,
    lat: f32,
    lng: f32,
    country: String,
    admin1: String, // State/province code
    population: u32,
}

fn parse_geonames(path: &str) -> Vec<Place> {
    let file = File::open(path).expect("Failed to open geonames file");
    let reader = BufReader::new(file);

    reader
        .lines()
        .filter_map(|line| {
            let line = line.ok()?;
            let cols: Vec<&str> = line.split('\t').collect();

            if cols.len() < 15 {
                return None;
            }

            let population: u32 = cols[14].parse().unwrap_or(0);

            if population < 1000 {
                return None;
            }

            let alt_names: Vec<String> = cols[3]
                .split(',')
                .filter(|s| !s.is_empty() && s.len() > 2)
                .take(10)
                .map(|s| s.to_lowercase())
                .collect();

            Some(Place {
                name: cols[1].to_string(),
                ascii_name: cols[2].to_lowercase(),
                alt_names,
                lat: cols[4].parse().unwrap_or(0.0),
                lng: cols[5].parse().unwrap_or(0.0),
                country: cols[8].to_string(),
                admin1: cols[10].to_string(), // State code for US
                population,
            })
        })
        .collect()
}

fn build_index(places: &[Place]) -> Vec<u8> {
    #[derive(serde::Serialize)]
    struct SerializedPlace {
        name: String,
        lat: f32,
        lng: f32,
        country: String,
        admin1: String,
        population: u32,
    }

    #[derive(serde::Serialize)]
    struct SerializedIndex {
        places: Vec<SerializedPlace>,
        name_to_indices: HashMap<String, Vec<u16>>,
    }

    let serialized_places: Vec<SerializedPlace> = places
        .iter()
        .map(|p| SerializedPlace {
            name: p.name.clone(),
            lat: p.lat,
            lng: p.lng,
            country: p.country.clone(),
            admin1: p.admin1.clone(),
            population: p.population,
        })
        .collect();

    let mut name_to_indices: HashMap<String, Vec<u16>> = HashMap::new();

    for (i, place) in places.iter().enumerate() {
        let idx = i as u16;

        name_to_indices
            .entry(place.ascii_name.clone())
            .or_default()
            .push(idx);

        for alt in &place.alt_names {
            name_to_indices.entry(alt.clone()).or_default().push(idx);
        }
    }

    let index = SerializedIndex {
        places: serialized_places,
        name_to_indices,
    };

    bincode::serialize(&index).unwrap()
}
