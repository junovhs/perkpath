# PerkPath: Evolution and Roadmap

## The Past: Origins and Pivot

PerkPath began as a TypeScript application, then was rewritten in Rust/WASM with Dioxus. The original interaction model was "AI-in-the-loop" — paste an itinerary, generate a prompt, feed it to ChatGPT/Claude, paste the JSON back, render the map.

This worked. It shipped. It solved the immediate problem: making itinerary maps for travel brochures without manually drawing them in Affinity.

But it had a ceiling. LLMs hallucinate coordinates. The workflow required four steps and an external AI. It couldn't be trusted for production work without babysitting.

**The Pivot:** Direct manipulation. No AI in the core loop. A local geocoding database with 25,000+ places. Type to search, click to add, drag to reorder. The map becomes a live preview of a timeline you're directly editing.

## The Present: v0.1.x Stable

**What exists today:**

- Quadratic Bézier curve generation with transport-specific styling
- Draggable labels with leader lines
- Floating map legend
- Config UI for fonts, colors, node sizes
- 60fps rendering via requestAnimationFrame
- GitHub Actions → Trunk → Cloudflare Pages deployment
- **Embedded geocoding database** — 25,000 cities, sub-millisecond search, zero network calls, works offline

**What's partially built:**

- Search input component (working, logs to console)
- Not yet wired to add stops to the map

## The Near Future: v0.2.x — Direct Manipulation

The Design Pivot Brief defines the new interaction model. Implementation priorities:

1. **Wire geocoding to trip data** — clicking a search result adds a stop to the map
2. **Timeline UI** — horizontal sequence of stops, left-to-right, drag to reorder
3. **Segments as first-class objects** — click between stops to set transport type
4. **LocalStorage persistence** — don't lose work on refresh
5. **Manual pin drop** — escape hatch when a location isn't in the database

## The Medium Future: v0.3.x — Rust-Native Features

These leverage Rust's capabilities in ways JavaScript can't match:

| Feature | Purpose |
|---------|---------|
| Pure-Rust SVG/PDF Export | Print-ready vector output, no html2canvas |
| Force-Directed Label Placement | Auto-arrange labels to avoid overlap |
| True Geodesic Flight Paths | Great circle routes, not fake curves |
| Spatial Index (R-tree) | O(log n) click detection and collision queries |
| Structural Sharing Undo | Infinite undo with minimal memory |
| Embedded Font Rendering | Text as vector paths, perfect export fidelity |
| Path Simplification | Smaller exports, same visual quality |
| Custom Binary Format | `.perkpath` files, 10x smaller than JSON |

## The Long Future: v0.4.x — The Moonshots

| Feature | Purpose |
|---------|---------|
| Automatic Route Deconfliction | Overlapping routes offset automatically |
| Graph-Based Route Optimization | "Optimize" button reorders stops to minimize distance |
| Custom Cartographic Projections | Robinson, Winkel Tripel, Orthographic globe view |
| Client-Side Map Tile Rendering | No Mapbox, no Carto, render Natural Earth vectors directly |
| Perceptually Uniform Color Gradients | OKLAB interpolation for mathematically correct palettes |
| Real-Time Path Animation | GIF/video export of route completion |

## Technical Principles

1. **Rust over JavaScript** — JS only for browser APIs that WASM can't access (clipboard, Leaflet bindings). All logic in Rust.
2. **Deterministic over probabilistic** — Local database search, not AI coordinate guessing.
3. **Embedded over networked** — Ship the data in the binary. No API keys, no latency, works offline.
4. **Direct manipulation over forms** — Drag, click, resize. Not text fields and submit buttons.

## The Vision

A travel map tool that:
- Runs entirely in the browser with no backend
- Works offline
- Produces print-ready vector exports
- Supports white-label theming for travel brands
- Feels like a video editor, not a form

**Status:** Foundation complete. Geocoding shipped. Timeline UI next.
