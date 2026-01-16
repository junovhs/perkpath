# PerkPath

**High-Integrity Visual Itinerary Map Generator**

PerkPath transforms unstructured travel itinerary text into professional, interactive, and customizable maps. It leverages a Rust-native core for heavy computation and geocoding logic, bridged to a high-performance Leaflet-based rendering layer.

## The Tech Stack

PerkPath is built with a "Brain and Nervous System" architecture:

-   **The Brain (Rust/Dioxus)**: Owns 100% of the state, parsing logic, geospatial math (`geo.rs`), and UI components including Legend and Toast notifications. Type-safe and logic-rot-proof.
-   **The Body (HTML/CSS)**: Decades of layout refinement used for the UI and map overlays.
-   **The Nervous System (JS Bridge)**: A single ~100 line file (`map-bridge.js`) that executes Leaflet API calls. Zero logic — Rust generates commands, JS just runs them.
-   **The Compiler (Trunk)**: Bundles the Rust/WASM binary and assets for web deployment.

### JS Minimization

We follow a "Rust-first" philosophy. The JS footprint has been reduced from 4 files (~15KB) to 1 file (~3KB):

| Component | Before | After |
|-----------|--------|-------|
| Legend | JS (legend.js) | Rust (Dioxus) |
| Toast | JS (interop.js) | Rust (Dioxus) |
| Renderer | JS (renderer.js) | Rust commands |
| Leader Lines | JS (leader-lines.js) | JS bridge |
| Leaflet Calls | Scattered | Single bridge |

The remaining JS exists solely because Leaflet is a JS library. All logic, math, and UI state lives in Rust.

## Development Philosophy

This project adheres to the **Spencer Nunamaker Development Philosophy**:

1.  **Goal-Driven**: We don't solve for "clearing blocks"; we solve for the end-user experience.
2.  **Zero Debt**: Every bug is fixed at the root. We do not suppress warnings or defer maintenance.
3.  **Atomic Units**: Code is decomposed into files under 1500 tokens to ensure reasoning clarity.
4.  **Verification Gates**: Every commit must pass the **SlopChop Protocol** (Clippy + Tests + Structural Audit).

## Getting Started

### Prerequisites
-   Rust (Stable)
-   Trunk: `cargo install trunk`
-   WASM Target: `rustup target add wasm32-unknown-unknown`

### Running Locally
```bash
trunk serve
```
Open `http://localhost:8080` in your browser.

### Deployment
The project deploys automatically via **GitHub Actions** to **Cloudflare Pages**.

-   Push to `main` triggers build and deploy
-   Build: `trunk build --release`
-   Output: `dist/`
-   Live: [perkpath.pages.dev](https://perkpath.pages.dev)

## License
Proprietary / Private. All rights reserved.
