# PerkPath: Evolution and Roadmap

## ?? The Past: The Great Pivot
PerkPath began as a standard TypeScript application. While functional, it suffered from the inherent fragility of the JS ecosystem-subtle runtime bugs and "clever" abstractions that created maintenance debt.

**The Pivot Point:**
During the port to Rust, we encountered "Dependency Hell" with the standard `dioxus-cli`. Instead of hacking a solution or downgrading our environment, we pivoted to **Trunk**. This stabilized the build pipeline and allowed us to implement a high-integrity bridge between Rust-native logic and the WebAssembly runtime.

## ?? The Present: Stability and Precision
We are currently at **v0.1.0 Stable**. 

**Current Capabilities:**
-   **Expert Pathing**: Quadratic Bezier curve generation with transport-specific styling (Flight/Dashed vs. Drive/Solid).
-   **Smart Interactivity**: Draggable labels and a floating map legend.
-   **Visual Feedback**: Real-time leader lines that snap to the nearest edge center of label containers.
-   **Performance**: A `requestAnimationFrame` game loop handles DOM updates, ensuring 60FPS even during rapid zooming or dragging.
-   **Config UI**: Live adjustment of font sizes, node colors, and arrow scales.

## ?? The Near Future: Utility and Persistence
Immediate next steps to move from "Tool" to "Product":

1.  **PNG/SVG Export**: Integration with `html2canvas` to allow users to download high-resolution snapshots of their maps for print/web.
2.  **Persistent Storage**: Implementing `LocalStorage` persistence for the Config and TripData so users don't lose work on refresh.
3.  **View Management**: The ability to "Save/Load" different itinerary views.

## ?? The Long-term Future: The Style Engine
PerkPath is being built to support a "White Label" future for travel organizations.

### 1. The Preset Engine
Architecting a way to swap "Style Layers" to emulate industry standards:
-   **The Globus Preset**: Grayscale base maps, numbered overnight nodes, and halo-text labels.
-   **The National Geographic Preset**: Topographical focus with antique color palettes.

### 2. Fine-Tuning Handles
While the paths are currently opinionated and automatic, we will introduce "Path Handles" (B�zier control points) allowing designers to manually pull and shape paths for complex overlapping routes.

### 3. Dynamic Animation
Leveraging the `f32` point data from Rust to produce:
-   **Animated Path GIFs**: Showing the route completing itself point-by-point.
-   **"Flight Progress"**: Arrows that move along the path during the animation.

### 4. Semantic Parsing 2.0
Expanding the AI prompt layer to handle "Overnights" automatically (e.g., parsing "Stay 2 nights in Paris" into a node numbered "2").

---
**Status**: PerkPath is now a robust, antifragile foundation ready for feature expansion.