# PerkPath Architecture & Design Document

## 1. System Overview

PerkPath is a client-side Single Page Application (SPA) designed to transform unstructured travel data into high-quality visual assets. It operates on a "Human-in-the-Loop" AI workflow:

1.  **Normalization**: The app generates a strict schema prompt.
2.  **Intelligence**: An external LLM performs the extraction and geocoding.
3.  **Visualization**: The app renders the deterministic output.

This approach delegates the "hard" problem of Natural Language Processing (NLP) and Geocoding to the LLM, allowing the application to focus purely on **rendering** and **customization**.

## 2. Architecture: The Atomic Module Pattern

To adhere to the SlopChop protocol (complexity management), the codebase is split into highly specific, atomic modules.

### 2.1 Core Modules

| Module | Responsibility |
| :--- | :--- |
| **`main.ts`** | Application bootstrap. Orchestrates `MapRenderer` and `ConfigUI`. |
| **`map.ts`** | High-level map controller. Manages Leaflet instance and layer groups. |
| **`map-draw.ts`** | "Painter" module. Contains pure functions to draw distinct elements (segments, nodes) onto layers. |
| **`config-ui.ts`** | Handles DOM binding for settings, sliders, and visibility toggles. |
| **`geo.ts`** | Pure math. Bezier curve generation using `turf.bezierSpline` and arrow bearing calculation. |
| **`layout.ts`** | The "Solver". Determines optimal label positions (Top, Left, Right, etc.) based on collision scores. |
| **`leader-lines.ts`** | dynamic logic for drawing lines between nodes and labels when distance thresholds are exceeded. |

### 2.2 Data Flow

```mermaid
[Itinerary Text] -> (Prompt Generator) -> [LLM Prompt]
      |
(User Interactions) -> [External LLM] -> [JSON Data]
                                              |
[Config State] -------------------------> (Map Renderer)
                                              |
                                       [Leaflet Layers]
                                              |
                                       (html2canvas) -> [PNG Export]
```

## 3. Key Algorithms

### 3.1 Bezier Route Generation (`geo.ts`)
Standard straight lines are aesthetically poor for travel maps. We use `turf.js` to generate curves:
1.  Calculate Great Circle distance and bearing.
2.  Project a "Control Point" perpendicular to the midpoint at 15% of the total distance.
3.  Generate a B-Spline through Start -> Control -> End.

### 3.2 Label Collision Avoidance (`layout.ts`)
A scoring system is used to place labels:
1.  Define 8 candidate positions (Right, Top-Right, Top, etc.).
2.  For each position, calculate a bounding box.
3.  **Score**:
    -   Preference for "Right" (+10) and "Top" (+5).
    -   Heavy penalty for overlapping existing labels (-100).
    -   Moderate penalty for overlapping nodes (-50).
4.  Winner takes all. If dragging occurs, manual position overrides automatic placement.

### 3.3 Dynamic Leader Lines (`leader-lines.ts`)
To prevent visual clutter, leader lines are ephemeral:
-   **Condition**: Distance(Node, Label) > 2.5 * NodeDiameter.
-   **Anchor**: Calculates the intersection point on the label's bounding box closest to the node center.

## 4. Export Strategy (`map-exporter.ts`)

Leaflet renders to DOM elements, not Canvas. To export an image:
1.  **State Capture**: Save current layer visibility.
2.  **Filter**: Apply export-specific visibility (e.g., "Labels Only" hides map tiles).
3.  **Scale**: Calculate a scaling factor to ensure the shortest dimension is at least 2000px.
4.  **Rasterize**: Use `html2canvas` with the calculated scale.
5.  **Restore**: Revert layer visibility to user state.

## 5. Technology Decisions

-   **Vite**: Chosen for speed and ES Module support.
-   **Biome**: Replaced ESLint/Prettier for faster, zero-config strict linting.
-   **Leaflet vs Mapbox**: Leaflet chosen for being lightweight, free (no API keys required for tiles if using OSM/Carto), and easier DOM manipulation for custom markers.