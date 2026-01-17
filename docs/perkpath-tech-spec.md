# PerkPath Technical Specification: Rust-Native Feature Set

## Document Purpose

This specification details the implementation of advanced features that leverage Rust's unique capabilities in a WASM environment. These features are infeasible or impossible to implement well in JavaScript. They represent PerkPath's technical moat.

This document assumes familiarity with the Design Pivot Brief and builds upon its interaction model.

---

## Feature Registry

| ID | Feature | Phase | Complexity | Dependencies |
|----|---------|-------|------------|--------------|
| F01 | Embedded Geocoding Database | 1 | High | None |
| F02 | Pure-Rust Vector Export | 1 | Medium | F07 |
| F03 | Force-Directed Label Placement | 1 | Medium | F04 |
| F04 | Spatial Index | 1 | Low | None |
| F05 | True Geodesic Flight Paths | 2 | Low | None |
| F06 | Structural Sharing / Undo | 2 | Medium | None |
| F07 | Embedded Font Rendering | 2 | Medium | None |
| F08 | Path Simplification | 2 | Low | None |
| F09 | Custom Binary Format | 2 | Low | None |
| F10 | Automatic Route Deconfliction | 3 | High | F04 |
| F11 | Graph Algorithms / Optimization | 3 | Medium | None |
| F12 | Perceptually Uniform Colors | 3 | Low | None |
| F13 | Custom Cartographic Projections | 4 | High | F14 |
| F14 | Client-Side Map Tile Rendering | 4 | Very High | F07 |
| F15 | Real-Time Path Animation | 4 | Medium | F02, F08 |

---

## Phase 1: Foundation

These features unblock the Design Pivot Brief's interaction model and provide immediate practical value.

---

### F01: Embedded Geocoding Database

**Purpose:** Enable instant, offline, deterministic location search. No API keys, no network latency, no rate limits.

**Data Source:** GeoNames `cities15000.txt` (~25,000 places) augmented with:
- Tourist landmarks (manual curation, ~500 entries)
- Cruise ports (~200 entries)
- Major airports (~1,000 entries)
- National parks (~500 entries)

**Final dataset size:** ~30,000 entries

**Index Structure:**

```
┌─────────────────────────────────────────────────────────────┐
│                     PlaceIndex                              │
├─────────────────────────────────────────────────────────────┤
│  fst: FST<u32>           // name → place_id mapping         │
│  places: Vec<Place>      // place_id → full record          │
│  alt_names: FST<u32>     // alternate names → place_id      │
│  trigrams: HashMap<[u8;3], Vec<u32>>  // fuzzy fallback     │
└─────────────────────────────────────────────────────────────┘

struct Place {
    name: CompactString,      // 24 bytes
    lat: f32,                 // 4 bytes
    lng: f32,                 // 4 bytes
    population: u32,          // 4 bytes
    country_code: [u8; 2],    // 2 bytes
    feature_class: u8,        // 1 byte (city/landmark/port/etc)
    _padding: u8,             // 1 byte
}                             // Total: 40 bytes per place
                              // 30,000 places = 1.2 MB
```

**Search Algorithm:**

```rust
pub fn search(&self, query: &str, limit: usize) -> Vec<SearchResult> {
    let normalized = normalize(query); // lowercase, strip diacritics
    
    // 1. Exact prefix match via FST (sub-microsecond)
    let mut results = self.fst_prefix_search(&normalized);
    
    // 2. Alternate names if insufficient results
    if results.len() < limit {
        results.extend(self.alt_names_search(&normalized));
    }
    
    // 3. Fuzzy fallback via trigram index (if still insufficient)
    if results.len() < limit {
        results.extend(self.trigram_fuzzy_search(&normalized, 2)); // max edit distance 2
    }
    
    // 4. Rank by match_quality * log10(population + 1)
    results.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap());
    results.truncate(limit);
    results
}
```

**Build Process:**

```rust
// build.rs - runs at compile time
fn main() {
    println!("cargo:rerun-if-changed=data/geonames.txt");
    println!("cargo:rerun-if-changed=data/landmarks.txt");
    
    let places = parse_geonames("data/geonames.txt");
    let places = augment_with_landmarks(places, "data/landmarks.txt");
    let index = PlaceIndex::build(&places);
    
    let out_dir = std::env::var("OUT_DIR").unwrap();
    let dest = Path::new(&out_dir).join("places.bin");
    std::fs::write(&dest, index.serialize()).unwrap();
}

// main.rs - embedded at compile time, loaded at runtime
static PLACES_DATA: &[u8] = include_bytes!(concat!(env!("OUT_DIR"), "/places.bin"));

lazy_static! {
    static ref GEOCODER: PlaceIndex = PlaceIndex::deserialize(PLACES_DATA);
}
```

**Performance Target:** < 1ms for any query, including fuzzy fallback.

**Crates:**
- `fst` — finite state transducer for prefix search
- `compact_str` — small string optimization
- `unicase` — case-insensitive comparison
- `deunicode` — strip diacritics for normalization
- `bincode` — fast serialization

**Estimated binary size impact:** ~3-5 MB (compressed FST + place data)

---

### F02: Pure-Rust Vector Export

**Purpose:** Generate print-ready SVG and PDF directly from trip data, bypassing DOM entirely.

**Architecture:**

```
TripData (Rust)
     │
     ├──→ MapCommands ──→ Leaflet (live preview)
     │
     └──→ VectorRenderer ──→ SVG string
                         └──→ PDF bytes
```

**SVG Generation:**

```rust
pub struct SvgRenderer {
    width: f32,
    height: f32,
    projection: Box<dyn Projection>,
    font_renderer: FontRenderer,  // see F07
}

impl SvgRenderer {
    pub fn render(&self, trip: &TripData, config: &RenderConfig) -> String {
        let mut svg = SvgDocument::new(self.width, self.height);
        
        // 1. Render base map (if F14 is implemented) or background
        svg.add(self.render_background(config));
        
        // 2. Render route segments
        for segment in &trip.segments {
            let path = self.compute_path(segment, trip);
            let simplified = simplify_path(&path, config.tolerance); // F08
            svg.add(SvgPath::new(simplified)
                .stroke(&segment.color)
                .stroke_width(config.line_width)
                .stroke_dasharray(segment.dash_pattern()));
        }
        
        // 3. Render arrows at segment midpoints
        for segment in &trip.segments {
            let (pos, rotation) = self.arrow_position(segment, trip);
            svg.add(self.render_arrow(pos, rotation, &segment.color));
        }
        
        // 4. Render stop nodes
        for stop in &trip.stops {
            let pos = self.project(stop.lat, stop.lng);
            svg.add(SvgCircle::new(pos, config.node_radius)
                .fill(&stop.color()));
        }
        
        // 5. Render labels (using F03 positions, F07 font rendering)
        let label_positions = self.compute_label_positions(trip); // F03
        for (stop, pos) in trip.stops.iter().zip(label_positions) {
            svg.add(self.render_label(&stop.name, pos, config));
        }
        
        svg.to_string()
    }
}
```

**PDF Generation:**

```rust
pub fn render_pdf(&self, trip: &TripData, config: &RenderConfig) -> Vec<u8> {
    let svg = self.render(trip, config);
    svg_to_pdf(&svg) // resvg + pdf conversion
}
```

**Crates:**
- `svg` — SVG document construction
- `resvg` + `tiny-skia` — SVG rasterization (for PNG export)
- `printpdf` — PDF generation (alternative: convert SVG to PDF)
- `usvg` — SVG parsing/simplification

**Output Formats:**
- SVG (vector, infinite scale)
- PDF (vector, print-ready)
- PNG (raster, configurable DPI: 72/150/300)

---

### F03: Force-Directed Label Placement

**Purpose:** Automatically position labels to avoid overlaps, eliminating manual adjustment.

**Physics Model:**

```
For each label:
  F_anchor  = spring force toward its stop (Hooke's law)
  F_repel   = repulsion from other labels (Coulomb's law)
  F_bounds  = repulsion from map edges
  
  F_total = F_anchor + Σ(F_repel) + F_bounds
  
  velocity += F_total * dt
  velocity *= damping  // 0.85-0.95
  position += velocity * dt
```

**Implementation:**

```rust
pub struct LabelLayout {
    positions: Vec<Vec2>,      // current positions
    velocities: Vec<Vec2>,     // current velocities
    anchors: Vec<Vec2>,        // stop positions (targets)
    sizes: Vec<Vec2>,          // label bounding boxes
}

impl LabelLayout {
    pub fn compute(&mut self, iterations: usize) -> &[Vec2] {
        for _ in 0..iterations {
            self.step();
        }
        &self.positions
    }
    
    fn step(&mut self) {
        let dt = 1.0;
        let damping = 0.9;
        let anchor_strength = 0.1;
        let repel_strength = 5000.0;
        
        for i in 0..self.positions.len() {
            let mut force = Vec2::ZERO;
            
            // Anchor force (pull toward stop)
            let to_anchor = self.anchors[i] - self.positions[i];
            force += to_anchor * anchor_strength;
            
            // Repulsion from other labels
            for j in 0..self.positions.len() {
                if i == j { continue; }
                
                let delta = self.positions[i] - self.positions[j];
                let dist_sq = delta.length_squared().max(1.0);
                
                // Check bounding box overlap for stronger repulsion
                let overlap = self.bbox_overlap(i, j);
                let strength = if overlap > 0.0 {
                    repel_strength * 10.0 // much stronger when overlapping
                } else {
                    repel_strength
                };
                
                force += delta.normalize() * (strength / dist_sq);
            }
            
            // Update velocity and position
            self.velocities[i] += force * dt;
            self.velocities[i] *= damping;
            self.positions[i] += self.velocities[i] * dt;
        }
    }
    
    fn bbox_overlap(&self, i: usize, j: usize) -> f32 {
        // Returns overlap area, or 0 if no overlap
        let a = Rect::from_center_size(self.positions[i], self.sizes[i]);
        let b = Rect::from_center_size(self.positions[j], self.sizes[j]);
        a.intersection(&b).map(|r| r.area()).unwrap_or(0.0)
    }
}
```

**Integration with Map View:**

```rust
// In map rendering
let label_sizes: Vec<Vec2> = stops.iter()
    .map(|s| measure_label_size(&s.name, config))
    .collect();

let anchors: Vec<Vec2> = stops.iter()
    .map(|s| project(s.lat, s.lng))
    .collect();

let mut layout = LabelLayout::new(anchors.clone(), anchors, label_sizes);
let positions = layout.compute(100); // 100 iterations, sub-millisecond total

for (stop, pos) in stops.iter().zip(positions) {
    render_label(&stop.name, *pos);
}
```

**Performance:** 100 iterations with 50 labels completes in < 1ms.

**Crates:**
- `glam` — fast vector math
- Or use existing `geo` crate's coordinate types

---

### F04: Spatial Index

**Purpose:** Enable O(log n) spatial queries for click detection, proximity search, and collision detection.

**Implementation:**

```rust
use rstar::{RTree, RTreeObject, AABB, PointDistance};

#[derive(Clone)]
pub struct IndexedStop {
    pub id: StopId,
    pub position: [f64; 2], // [lat, lng]
    pub name: String,
}

impl RTreeObject for IndexedStop {
    type Envelope = AABB<[f64; 2]>;
    
    fn envelope(&self) -> Self::Envelope {
        AABB::from_point(self.position)
    }
}

impl PointDistance for IndexedStop {
    fn distance_2(&self, point: &[f64; 2]) -> f64 {
        let dx = self.position[0] - point[0];
        let dy = self.position[1] - point[1];
        dx * dx + dy * dy
    }
}

pub struct SpatialIndex {
    stops: RTree<IndexedStop>,
    segments: RTree<IndexedSegment>, // similar structure for route segments
}

impl SpatialIndex {
    pub fn from_trip(trip: &TripData) -> Self {
        let stops: Vec<IndexedStop> = trip.stops.iter()
            .enumerate()
            .map(|(i, s)| IndexedStop {
                id: StopId(i),
                position: [s.lat, s.lng],
                name: s.name.clone(),
            })
            .collect();
        
        Self {
            stops: RTree::bulk_load(stops),
            segments: Self::build_segment_index(trip),
        }
    }
    
    /// Find the stop nearest to a click point
    pub fn nearest_stop(&self, lat: f64, lng: f64) -> Option<&IndexedStop> {
        self.stops.nearest_neighbor(&[lat, lng])
    }
    
    /// Find all stops within a bounding box
    pub fn stops_in_bounds(&self, bounds: &AABB<[f64; 2]>) -> Vec<&IndexedStop> {
        self.stops.locate_in_envelope(bounds).collect()
    }
    
    /// Find the segment nearest to a click point
    pub fn nearest_segment(&self, lat: f64, lng: f64) -> Option<&IndexedSegment> {
        self.segments.nearest_neighbor(&[lat, lng])
    }
}
```

**Use Cases:**
- Click-to-select: Find which stop/segment the user clicked
- Label collision: Query which labels overlap a given bounding box
- Proximity highlight: Find stops within N km of cursor during hover
- Route deconfliction (F10): Find overlapping segments

**Crates:**
- `rstar` — R-tree implementation

---

## Phase 2: Polish and Persistence

These features improve quality of life and prepare for advanced functionality.

---

### F05: True Geodesic Flight Paths

**Purpose:** Render flight segments along great circle routes, not arbitrary Bezier curves.

**Implementation:**

```rust
use geo::{Point, LineString};
use geo::algorithm::geodesic_intermediate::GeodesicIntermediate;

pub fn geodesic_path(start: &Location, end: &Location, num_points: usize) -> Vec<Point> {
    let p1 = Point::new(start.lng, start.lat);
    let p2 = Point::new(end.lng, end.lat);
    
    (0..=num_points)
        .map(|i| {
            let fraction = i as f64 / num_points as f64;
            p1.geodesic_intermediate(&p2, fraction)
        })
        .collect()
}

pub fn compute_segment_path(segment: &Segment, trip: &TripData) -> Vec<Point> {
    let start = trip.location(&segment.from);
    let end = trip.location(&segment.to);
    
    match segment.transport {
        Transport::Flight => geodesic_path(start, end, 50),
        _ => bezier_path(start, end, 50), // existing curved path for surface travel
    }
}
```

**Visual Effect:** Flights from NYC to Tokyo curve north toward the pole on a Mercator map, reflecting the actual flight path.

**Crates:**
- `geo` (already in use) — has `GeodesicIntermediate` trait

---

### F06: Structural Sharing / Infinite Undo

**Purpose:** Enable unlimited undo/redo with minimal memory overhead.

**Implementation:**

```rust
use im::Vector;

#[derive(Clone)]
pub struct TripState {
    pub stops: Vector<Stop>,       // persistent vector
    pub segments: Vector<Segment>, // persistent vector
    pub config: AppConfig,         // small, just clone it
}

pub struct UndoStack {
    states: Vec<TripState>,
    current: usize,
}

impl UndoStack {
    pub fn new(initial: TripState) -> Self {
        Self {
            states: vec![initial],
            current: 0,
        }
    }
    
    pub fn push(&mut self, state: TripState) {
        // Truncate any redo states
        self.states.truncate(self.current + 1);
        self.states.push(state);
        self.current += 1;
    }
    
    pub fn undo(&mut self) -> Option<&TripState> {
        if self.current > 0 {
            self.current -= 1;
            Some(&self.states[self.current])
        } else {
            None
        }
    }
    
    pub fn redo(&mut self) -> Option<&TripState> {
        if self.current < self.states.len() - 1 {
            self.current += 1;
            Some(&self.states[self.current])
        } else {
            None
        }
    }
    
    pub fn current(&self) -> &TripState {
        &self.states[self.current]
    }
}
```

**Memory Efficiency:**

```
Operation: Add stop "Paris" to [London, Rome]

State 0: [London, Rome]           // 2 allocations
State 1: [London, Rome, Paris]    // shares [London, Rome] node, 1 new allocation

Total memory: ~3 allocations, not 5
```

With 100 undo states of 50 stops each, naive approach uses 5000 allocations. Structural sharing uses ~150.

**Crates:**
- `im` — immutable persistent collections

---

### F07: Embedded Font Rendering

**Purpose:** Render text as vector paths for perfect, consistent output across all export formats.

**Implementation:**

```rust
use ab_glyph::{Font, FontRef, ScaleFont};

static FONT_DATA: &[u8] = include_bytes!("../assets/fonts/DMSans-Bold.ttf");

pub struct FontRenderer {
    font: FontRef<'static>,
}

impl FontRenderer {
    pub fn new() -> Self {
        Self {
            font: FontRef::try_from_slice(FONT_DATA).expect("Invalid font data"),
        }
    }
    
    /// Convert text to SVG path data
    pub fn text_to_path(&self, text: &str, size: f32) -> String {
        let scaled = self.font.as_scaled(size);
        let mut path_data = String::new();
        let mut x = 0.0;
        
        for c in text.chars() {
            let glyph_id = self.font.glyph_id(c);
            let glyph = glyph_id.with_scale(size);
            
            if let Some(outline) = self.font.outline_glyph(glyph) {
                outline.draw(|op| {
                    match op {
                        OutlineCurve::MoveTo(p) => {
                            write!(path_data, "M{:.2},{:.2}", x + p.x, p.y).unwrap();
                        }
                        OutlineCurve::LineTo(p) => {
                            write!(path_data, "L{:.2},{:.2}", x + p.x, p.y).unwrap();
                        }
                        OutlineCurve::QuadTo(p1, p2) => {
                            write!(path_data, "Q{:.2},{:.2},{:.2},{:.2}", 
                                   x + p1.x, p1.y, x + p2.x, p2.y).unwrap();
                        }
                        OutlineCurve::CurveTo(p1, p2, p3) => {
                            write!(path_data, "C{:.2},{:.2},{:.2},{:.2},{:.2},{:.2}",
                                   x + p1.x, p1.y, x + p2.x, p2.y, x + p3.x, p3.y).unwrap();
                        }
                        OutlineCurve::Close => {
                            path_data.push('Z');
                        }
                    }
                });
            }
            
            x += scaled.h_advance(glyph_id);
        }
        
        path_data
    }
    
    /// Measure text bounding box
    pub fn measure(&self, text: &str, size: f32) -> (f32, f32) {
        let scaled = self.font.as_scaled(size);
        let width: f32 = text.chars()
            .map(|c| scaled.h_advance(self.font.glyph_id(c)))
            .sum();
        let height = scaled.height();
        (width, height)
    }
}
```

**Usage in SVG Export:**

```rust
// Instead of <text>Paris</text> which depends on font availability:
let path_data = font_renderer.text_to_path("Paris", 14.0);
svg.add(SvgPath::new(&path_data).fill("#1a1d23"));
// This renders identically everywhere, always.
```

**Crates:**
- `ab_glyph` — modern, pure-Rust font parsing and glyph rendering
- Alternative: `rusttype` (older but also works)

**Font Embedding:**
- Bundle 1-2 fonts (regular + bold) directly in the binary
- ~50-100 KB per font file
- No external font loading, no CORS issues, no FOUT

---

### F08: Path Simplification

**Purpose:** Reduce path complexity for smaller, faster exports without visual difference.

**Implementation:**

```rust
use geo::algorithm::simplify::Simplify;
use geo::LineString;

pub fn simplify_path(path: &[Point], tolerance: f64) -> Vec<Point> {
    let line: LineString = path.iter()
        .map(|p| (p.x as f64, p.y as f64))
        .collect();
    
    let simplified = line.simplify(&tolerance);
    
    simplified.points()
        .map(|p| Point::new(p.x() as f32, p.y() as f32))
        .collect()
}
```

**Tolerance Guidelines:**
- Screen display: 1.0 (aggressive simplification OK)
- SVG export: 0.1 (preserve more detail)
- High-DPI PNG: 0.05 (preserve even more)

**Impact:**
- 500-point geodesic path → ~30 points after simplification
- SVG file size: ~10x smaller
- Render time: ~10x faster

**Crates:**
- `geo` (already in use) — has `Simplify` trait (Ramer-Douglas-Peucker)

---

### F09: Custom Binary Format

**Purpose:** Save/load trips in a compact, fast-loading proprietary format.

**File Extension:** `.perkpath`

**Format Structure:**

```
┌─────────────────────────────────────────┐
│ Magic Number: "PERK" (4 bytes)          │
│ Version: u16 (2 bytes)                  │
│ Flags: u16 (2 bytes)                    │
├─────────────────────────────────────────┤
│ Compressed Payload (LZ4)                │
│   └── bincode-serialized TripData       │
└─────────────────────────────────────────┘
```

**Implementation:**

```rust
const MAGIC: &[u8; 4] = b"PERK";
const VERSION: u16 = 1;

pub fn save_trip(trip: &TripData, path: &Path) -> Result<()> {
    let payload = bincode::serialize(trip)?;
    let compressed = lz4_flex::compress_prepend_size(&payload);
    
    let mut file = File::create(path)?;
    file.write_all(MAGIC)?;
    file.write_all(&VERSION.to_le_bytes())?;
    file.write_all(&0u16.to_le_bytes())?; // flags, reserved
    file.write_all(&compressed)?;
    
    Ok(())
}

pub fn load_trip(path: &Path) -> Result<TripData> {
    let data = std::fs::read(path)?;
    
    if &data[0..4] != MAGIC {
        return Err(Error::InvalidFormat);
    }
    
    let version = u16::from_le_bytes([data[4], data[5]]);
    if version > VERSION {
        return Err(Error::UnsupportedVersion(version));
    }
    
    let compressed = &data[8..];
    let payload = lz4_flex::decompress_size_prepended(compressed)?;
    let trip = bincode::deserialize(&payload)?;
    
    Ok(trip)
}
```

**Size Comparison (20-stop trip):**
- JSON: ~5 KB
- `.perkpath`: ~400 bytes

**Crates:**
- `bincode` — fast binary serialization
- `lz4_flex` — pure-Rust LZ4 compression

---

## Phase 3: Intelligence

These features add algorithmic sophistication.

---

### F10: Automatic Route Deconfliction

**Purpose:** Prevent overlapping route segments from rendering on top of each other.

**Algorithm:**

```rust
pub struct RouteDeconfliction {
    spatial_index: SpatialIndex, // F04
}

impl RouteDeconfliction {
    pub fn compute_offsets(&self, segments: &[Segment]) -> Vec<f64> {
        let mut offsets = vec![0.0; segments.len()];
        
        // Group segments by shared endpoints
        let mut groups: HashMap<(StopId, StopId), Vec<usize>> = HashMap::new();
        for (i, seg) in segments.iter().enumerate() {
            let key = (seg.from.min(seg.to), seg.from.max(seg.to));
            groups.entry(key).or_default().push(i);
        }
        
        // For each group with multiple segments, assign perpendicular offsets
        for (_, indices) in groups {
            if indices.len() > 1 {
                let n = indices.len() as f64;
                let spacing = 0.002; // ~200m in lat/lng
                
                for (rank, &i) in indices.iter().enumerate() {
                    // Center the group around 0
                    offsets[i] = (rank as f64 - (n - 1.0) / 2.0) * spacing;
                }
            }
        }
        
        // Also check for near-parallel segments (not sharing endpoints)
        for i in 0..segments.len() {
            for j in (i + 1)..segments.len() {
                if self.are_near_parallel(&segments[i], &segments[j]) {
                    // Offset the second one if not already offset
                    if offsets[j] == 0.0 {
                        offsets[j] = 0.002;
                    }
                }
            }
        }
        
        offsets
    }
    
    fn are_near_parallel(&self, a: &Segment, b: &Segment) -> bool {
        // Check if segments are within threshold distance and similar bearing
        // Implementation uses spatial index for efficiency
        todo!()
    }
}

pub fn apply_offset(path: &[Point], offset: f64) -> Vec<Point> {
    // Offset each point perpendicular to the path direction
    path.windows(2)
        .map(|w| {
            let dir = (w[1] - w[0]).normalize();
            let perp = Vec2::new(-dir.y, dir.x);
            w[0] + perp * offset as f32
        })
        .collect()
}
```

**Visual Result:**

```
BEFORE (overlapping):          AFTER (deconflicted):
                              
A ════════════► B             A ───────────► B
  ════════════►                 ═══════════►
  (hidden)                      (visible, offset)
```

---

### F11: Graph Algorithms / Route Optimization

**Purpose:** Suggest optimal ordering of stops to minimize total travel distance.

**Implementation:**

```rust
use pathfinding::prelude::*;

pub fn optimize_route(stops: &[Stop], fixed_start: bool, fixed_end: bool) -> Vec<usize> {
    let n = stops.len();
    if n <= 2 {
        return (0..n).collect();
    }
    
    // Build distance matrix
    let distances: Vec<Vec<i64>> = (0..n)
        .map(|i| {
            (0..n)
                .map(|j| haversine_km(&stops[i], &stops[j]) as i64)
                .collect()
        })
        .collect();
    
    // Use nearest-neighbor heuristic + 2-opt improvement
    let mut order = nearest_neighbor_tsp(&distances, fixed_start);
    two_opt_improve(&mut order, &distances);
    
    // Respect fixed start/end constraints
    if fixed_start && order[0] != 0 {
        // Rotate to put start first
        let pos = order.iter().position(|&x| x == 0).unwrap();
        order.rotate_left(pos);
    }
    if fixed_end && order[order.len() - 1] != n - 1 {
        // This is more complex; may need to reverse or adjust
        // For now, just ensure end is last
        let pos = order.iter().position(|&x| x == n - 1).unwrap();
        order.remove(pos);
        order.push(n - 1);
    }
    
    order
}

fn nearest_neighbor_tsp(distances: &[Vec<i64>], start_at_zero: bool) -> Vec<usize> {
    let n = distances.len();
    let mut visited = vec![false; n];
    let mut order = Vec::with_capacity(n);
    
    let start = if start_at_zero { 0 } else { 
        // Start at the city that minimizes total distance to others
        (0..n).min_by_key(|&i| distances[i].iter().sum::<i64>()).unwrap()
    };
    
    order.push(start);
    visited[start] = true;
    
    while order.len() < n {
        let last = *order.last().unwrap();
        let next = (0..n)
            .filter(|&i| !visited[i])
            .min_by_key(|&i| distances[last][i])
            .unwrap();
        order.push(next);
        visited[next] = true;
    }
    
    order
}

fn two_opt_improve(order: &mut Vec<usize>, distances: &[Vec<i64>]) {
    let n = order.len();
    let mut improved = true;
    
    while improved {
        improved = false;
        for i in 0..(n - 1) {
            for j in (i + 2)..n {
                let delta = two_opt_delta(order, distances, i, j);
                if delta < 0 {
                    order[i + 1..=j].reverse();
                    improved = true;
                }
            }
        }
    }
}
```

**UI Integration:**
- "Optimize Route" button in toolbar
- Shows preview of optimized order before applying
- Displays distance saved: "Saves 847 km"

**Crates:**
- `pathfinding` — comprehensive graph algorithms

---

### F12: Perceptually Uniform Color Gradients

**Purpose:** Generate visually even color progressions for multi-segment routes.

**Implementation:**

```rust
use palette::{FromColor, IntoColor, Oklch, Srgb};

pub fn generate_gradient(start: &str, end: &str, steps: usize) -> Vec<String> {
    let start_rgb = parse_hex(start);
    let end_rgb = parse_hex(end);
    
    let start_lch: Oklch = Srgb::new(start_rgb.0, start_rgb.1, start_rgb.2)
        .into_linear()
        .into_color();
    let end_lch: Oklch = Srgb::new(end_rgb.0, end_rgb.1, end_rgb.2)
        .into_linear()
        .into_color();
    
    (0..steps)
        .map(|i| {
            let t = i as f32 / (steps - 1) as f32;
            
            // Interpolate in OKLCH space
            let l = start_lch.l + (end_lch.l - start_lch.l) * t;
            let c = start_lch.chroma + (end_lch.chroma - start_lch.chroma) * t;
            let h = interpolate_hue(start_lch.hue, end_lch.hue, t);
            
            let interpolated = Oklch::new(l, c, h);
            let rgb: Srgb = interpolated.into_color();
            
            format!("#{:02x}{:02x}{:02x}",
                (rgb.red * 255.0) as u8,
                (rgb.green * 255.0) as u8,
                (rgb.blue * 255.0) as u8)
        })
        .collect()
}

fn interpolate_hue(a: f32, b: f32, t: f32) -> f32 {
    // Take the short path around the hue wheel
    let diff = b - a;
    let diff = if diff > 180.0 { diff - 360.0 } 
               else if diff < -180.0 { diff + 360.0 } 
               else { diff };
    (a + diff * t).rem_euclid(360.0)
}
```

**Use Cases:**
- Route colored by day number (Day 1 = blue, Day 14 = gold, smooth gradient between)
- Legend swatches that look evenly spaced
- Auto-generated brand color palettes

**Crates:**
- `palette` — comprehensive color science

---

## Phase 4: The Nuclear Options

These features represent significant undertakings but provide capabilities no competitor can match.

---

### F13: Custom Cartographic Projections

**Purpose:** Render maps in projections other than Web Mercator.

**Available Projections:**

| Projection | Best For | Character |
|------------|----------|-----------|
| Web Mercator | Compatibility | The default, distorts poles |
| Robinson | World maps | Balanced, "National Geographic look" |
| Winkel Tripel | World maps | Even more balanced |
| Orthographic | Hero shots | "View from space" globe |
| Albers Equal-Area | Regional (US, Europe) | Preserves area, good for country-scale |
| Lambert Conformal Conic | Aviation charts | Preserves angles |

**Implementation:**

```rust
use proj::Proj;

pub trait Projection: Send + Sync {
    fn project(&self, lng: f64, lat: f64) -> (f64, f64);
    fn inverse(&self, x: f64, y: f64) -> Option<(f64, f64)>;
    fn bounds(&self) -> Option<Rect>;
}

pub struct ProjProjection {
    proj: Proj,
    name: String,
}

impl ProjProjection {
    pub fn web_mercator() -> Self {
        Self::new("Web Mercator", "+proj=webmerc +datum=WGS84")
    }
    
    pub fn robinson() -> Self {
        Self::new("Robinson", "+proj=robin +datum=WGS84")
    }
    
    pub fn orthographic(center_lng: f64, center_lat: f64) -> Self {
        Self::new("Orthographic", 
            &format!("+proj=ortho +lat_0={} +lon_0={} +datum=WGS84", center_lat, center_lng))
    }
    
    fn new(name: &str, proj_string: &str) -> Self {
        Self {
            proj: Proj::new(proj_string).expect("Invalid projection string"),
            name: name.to_string(),
        }
    }
}

impl Projection for ProjProjection {
    fn project(&self, lng: f64, lat: f64) -> (f64, f64) {
        self.proj.convert((lng, lat)).unwrap_or((f64::NAN, f64::NAN))
    }
    
    fn inverse(&self, x: f64, y: f64) -> Option<(f64, f64)> {
        self.proj.inverse_convert((x, y)).ok()
    }
}
```

**Crates:**
- `proj` — bindings to PROJ library (industry standard)

**Note:** This feature is most valuable when combined with F14 (client-side tile rendering). With external tile servers, you're stuck with Web Mercator.

---

### F14: Client-Side Map Tile Rendering

**Purpose:** Render the base map entirely client-side from embedded vector data. No tile servers. No API keys. Complete visual control.

**Data Source:** Natural Earth (public domain)
- `ne_110m_*` — 1:110 million scale, ~500 KB total (world overview)
- `ne_50m_*` — 1:50 million scale, ~2 MB total (continental detail)
- `ne_10m_*` — 1:10 million scale, ~20 MB total (country detail)

**Strategy:** Embed 110m and 50m scales. Fetch 10m on demand if needed (or skip entirely for travel maps).

**Architecture:**

```
┌─────────────────────────────────────────────────────────────┐
│                    MapRenderer                              │
├─────────────────────────────────────────────────────────────┤
│  coastlines: Vec<LineString>    // Natural Earth data       │
│  borders: Vec<LineString>       // Country boundaries       │
│  lakes: Vec<Polygon>            // Major water bodies       │
│  rivers: Vec<LineString>        // Major rivers (optional)  │
│  cities: Vec<Point>             // For context labels       │
├─────────────────────────────────────────────────────────────┤
│  projection: Box<dyn Projection>                            │
│  style: MapStyle                                            │
│  viewport: Viewport                                         │
└─────────────────────────────────────────────────────────────┘

struct MapStyle {
    land_fill: Color,
    ocean_fill: Color,
    border_stroke: Color,
    border_width: f32,
    coastline_stroke: Color,
    coastline_width: f32,
    lake_fill: Color,
    // ... etc
}
```

**Rendering Pipeline:**

```rust
impl MapRenderer {
    pub fn render_to_svg(&self, viewport: &Viewport) -> String {
        let mut svg = SvgDocument::new(viewport.width, viewport.height);
        
        // 1. Ocean background
        svg.add(SvgRect::new(0, 0, viewport.width, viewport.height)
            .fill(&self.style.ocean_fill));
        
        // 2. Land masses (coastlines as filled polygons)
        for coastline in &self.coastlines {
            let projected = self.project_linestring(coastline);
            let clipped = clip_to_viewport(&projected, viewport);
            if !clipped.is_empty() {
                svg.add(SvgPolygon::new(&clipped)
                    .fill(&self.style.land_fill));
            }
        }
        
        // 3. Lakes (holes in land)
        for lake in &self.lakes {
            let projected = self.project_polygon(lake);
            svg.add(SvgPolygon::new(&projected)
                .fill(&self.style.lake_fill));
        }
        
        // 4. Country borders
        for border in &self.borders {
            let projected = self.project_linestring(border);
            let clipped = clip_to_viewport(&projected, viewport);
            if !clipped.is_empty() {
                svg.add(SvgPath::new(&clipped)
                    .stroke(&self.style.border_stroke)
                    .stroke_width(self.style.border_width));
            }
        }
        
        // 5. Coastlines (on top of land, for crisp edges)
        for coastline in &self.coastlines {
            let projected = self.project_linestring(coastline);
            svg.add(SvgPath::new(&projected)
                .stroke(&self.style.coastline_stroke)
                .stroke_width(self.style.coastline_width));
        }
        
        svg.to_string()
    }
}
```

**Style Presets:**

```rust
impl MapStyle {
    pub fn minimal_light() -> Self {
        Self {
            land_fill: Color::hex("#f5f5f5"),
            ocean_fill: Color::hex("#e0e7ee"),
            border_stroke: Color::hex("#cccccc"),
            border_width: 0.5,
            coastline_stroke: Color::hex("#999999"),
            coastline_width: 0.5,
            lake_fill: Color::hex("#e0e7ee"),
        }
    }
    
    pub fn national_geographic() -> Self {
        Self {
            land_fill: Color::hex("#e8e0d4"),
            ocean_fill: Color::hex("#b8d4e8"),
            border_stroke: Color::hex("#8b7355"),
            border_width: 0.75,
            coastline_stroke: Color::hex("#5c4a3a"),
            coastline_width: 1.0,
            lake_fill: Color::hex("#a8c8dc"),
        }
    }
    
    pub fn dark_mode() -> Self {
        Self {
            land_fill: Color::hex("#2d2d2d"),
            ocean_fill: Color::hex("#1a1a2e"),
            border_stroke: Color::hex("#404040"),
            border_width: 0.5,
            coastline_stroke: Color::hex("#505050"),
            coastline_width: 0.5,
            lake_fill: Color::hex("#1a1a2e"),
        }
    }
}
```

**Crates:**
- `geo` — geometry types and algorithms
- `geojson` — parse Natural Earth GeoJSON exports
- `lyon` — tessellation for GPU rendering (if doing canvas/WebGL instead of SVG)
- `tiny-skia` — CPU rasterization (for PNG export)

**Binary Size Impact:** ~2-5 MB for embedded vector data (compressed)

**Performance:** With proper clipping and level-of-detail selection, renders in < 16ms (60 FPS capable)

---

### F15: Real-Time Path Animation

**Purpose:** Generate smooth animations of routes completing themselves.

**Implementation:**

```rust
use gif::{Encoder, Frame, Repeat};

pub struct AnimationConfig {
    pub width: u16,
    pub height: u16,
    pub fps: u16,
    pub duration_secs: f32,
    pub trail_length: f32,      // 0.0 = no trail, 1.0 = full trail
    pub arrow_enabled: bool,
}

pub fn render_animation(
    trip: &TripData,
    config: &AnimationConfig,
    renderer: &SvgRenderer,
) -> Vec<u8> {
    let frame_count = (config.fps as f32 * config.duration_secs) as usize;
    let total_path_length = compute_total_path_length(trip);
    
    let mut gif_data = Vec::new();
    {
        let mut encoder = Encoder::new(
            &mut gif_data,
            config.width,
            config.height,
            &[], // global palette, or per-frame
        ).unwrap();
        encoder.set_repeat(Repeat::Infinite).unwrap();
        
        for frame_idx in 0..frame_count {
            let t = frame_idx as f32 / frame_count as f32;
            
            // Determine how much of the path to show
            let progress = t * total_path_length;
            let visible_path = truncate_path_to_length(trip, progress);
            
            // Optionally fade out the trail
            let trail_start = if config.trail_length < 1.0 {
                (progress - total_path_length * config.trail_length).max(0.0)
            } else {
                0.0
            };
            
            // Render frame
            let svg = renderer.render_partial(
                trip,
                trail_start,
                progress,
                config.arrow_enabled,
            );
            
            // Rasterize SVG to pixels
            let pixels = rasterize_svg(&svg, config.width, config.height);
            
            // Add frame to GIF
            let frame = Frame::from_rgba(config.width, config.height, &mut pixels.clone());
            encoder.write_frame(&frame).unwrap();
        }
    }
    
    gif_data
}
```

**Output Formats:**
- GIF (universal compatibility)
- APNG (better quality, larger files)
- MP4 (via ffmpeg, if available)
- Lottie JSON (for web playback)

**Crates:**
- `gif` — GIF encoding
- `image` — pixel manipulation
- `resvg` + `tiny-skia` — SVG rasterization

---

## Dependency Summary

```toml
[dependencies]
# Core (already present)
dioxus = { version = "0.6", ... }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
geo = "0.28"

# Phase 1
fst = "0.4"                    # F01: Geocoding index
compact_str = "0.7"            # F01: Memory-efficient strings
bincode = "1.3"                # F01, F09: Binary serialization
rstar = "0.11"                 # F04: R-tree spatial index
glam = "0.25"                  # F03: Vector math

# Phase 2
im = "15.1"                    # F06: Persistent data structures
ab_glyph = "0.2"               # F07: Font rendering
lz4_flex = "0.11"              # F09: Compression

# Phase 3
pathfinding = "4.0"            # F11: Graph algorithms
palette = "0.7"                # F12: Color science

# Phase 4
proj = "0.27"                  # F13: Cartographic projections
gif = "0.12"                   # F15: Animation export
tiny-skia = "0.11"             # F02, F14, F15: Rasterization
resvg = "0.37"                 # F02: SVG rendering

# Build dependencies
[build-dependencies]
bincode = "1.3"
csv = "1.3"                    # Parsing GeoNames data
```

---

## Implementation Order Recommendation

```
Week 1-2:   F04 (Spatial Index) — foundation for many features
            F08 (Path Simplification) — quick win, improves existing code

Week 3-4:   F01 (Geocoding Database) — unlocks Design Pivot Brief
            
Week 5-6:   F02 (Vector Export) — the killer feature
            F07 (Font Rendering) — required for proper export

Week 7-8:   F03 (Force-Directed Labels) — major UX improvement
            F05 (Geodesic Paths) — quick enhancement

Week 9-10:  F06 (Undo System) — quality of life
            F09 (Binary Format) — persistence

Week 11-12: F10 (Route Deconfliction) — visual polish
            F11 (Route Optimization) — power feature

Week 13+:   F12 (Color Gradients) — polish
            F13-F14 (Custom Rendering) — the moonshot
            F15 (Animation) — nice to have
```

---

## Open Questions

1. **Font licensing:** DM Sans is OFL-licensed, which permits embedding. Confirm this is acceptable for your use case.

2. **Natural Earth data format:** GeoJSON is human-readable but larger. Shapefile or FlatGeobuf might be more efficient. Evaluate during F14 implementation.

3. **WASM binary size budget:** Current features might push the binary to 10-15 MB. Is this acceptable? Consider lazy-loading the geocoding data if not.

4. **Offline-first vs. hybrid:** Should the app work 100% offline, or is it acceptable to fetch some data (e.g., high-res map tiles) on demand?

5. **Export resolution limits:** What's the maximum DPI for PNG export? 300 DPI at poster size could mean 10,000+ pixel renders.

---

## Success Metrics

- **F01:** Geocoding search returns results in < 1ms
- **F02:** SVG export completes in < 100ms for 50-stop trip
- **F03:** Label layout converges in < 10ms
- **F04:** Spatial queries complete in < 1μs
- **F06:** Undo/redo is instantaneous (< 1ms)
- **F14:** Full map render in < 16ms (60 FPS)

---

*Document version: 1.0*
*Compatible with: Design Pivot Brief v1.0*
