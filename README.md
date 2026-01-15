# PerkPath

**High-Integrity Visual Itinerary Map Generator**

PerkPath transforms unstructured travel itinerary text into professional, interactive, and customizable maps. It leverages a Rust-native core for heavy computation and geocoding logic, bridged to a high-performance Leaflet-based rendering layer.

## ?? The Tech Stack

PerkPath is built with a "Brain and Nervous System" architecture:

-   **The Brain (Rust/Dioxus)**: Owns 100% of the state, parsing logic, and geospatial math (`geo.rs`). It ensures type safety and prevents logic rot.
-   **The Body (HTML/CSS)**: Decades of layout refinement used for the UI and map overlays.
-   **The Nervous System (JS Interop)**: A thin, mechanical bridge to the Leaflet ecosystem. Optimized with a **60FPS Game Loop** pattern to ensure buttery smooth interactions.
-   **The Compiler (Trunk)**: Bundles the Rust/WASM binary and assets for web deployment.

## ?? Development Philosophy

This project adheres to the **Spencer Nunamaker Development Philosophy**:

1.  **Goal-Driven**: We don't solve for "clearing blocks"; we solve for the end-user experience.
2.  **Zero Debt**: Every bug is fixed at the root. We do not suppress warnings or defer maintenance.
3.  **Atomic Units**: Code is decomposed into files under 1500 tokens to ensure reasoning clarity.
4.  **Verification Gates**: Every commit must pass the **SlopChop Protocol** (Clippy + Tests + Structural Audit).

## ?? Getting Started

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
The project is configured for **Cloudflare Pages**. 
-   **Output Dir**: `dist`
-   **Build Command**: `trunk build --release`

## ?? License
Proprietary / Private. All rights reserved.