# PerkPath by TravelPerks

**Live Demo:** [perkpath.vercel.app](https://perkpath.vercel.app)

PerkPath is a precision tool for travel agents and enthusiasts to generate professional visual itinerary maps from text descriptions. It leverages AI to structure unstructured itinerary text into geospatial JSON, which is then rendered onto an interactive, customizable map.

## Key Features

-   **AI-Powered Parsing**: Converts raw text (e.g., "Flight to Nairobi, drive to Serengeti") into structured map data.
-   **Smart Layouts**: Automatic label collision detection and placement optimization.
-   **Bezier Routes**: Aesthetic curved paths with transport-specific styling (dashed for flight/rail, solid for drive/cruise).
-   **Draggable Customization**:
    -   Drag labels to fine-tune placement.
    -   Dynamic leader lines appear when labels are moved far from nodes.
    -   Drag the legend to position it perfectly.
-   **High-Res Export**: Export 2k+ resolution PNGs with transparent backgrounds (optional) for brochures and web use.
-   **Layer Management**: Toggle visibility of base maps, routes, nodes, labels, and arrows independently.

## Tech Stack

-   **Core**: TypeScript, Vite
-   **Mapping**: Leaflet, CartoDB Voyager Tiles
-   **Geospatial**: Turf.js (Bezier curves, bearing calculations)
-   **Export**: html2canvas
-   **Linting/Formatting**: Biome
-   **Architecture**: Atomic Module Pattern (SlopChop Compliant)

## Setup & Development

1.  **Install Dependencies**
    ```bash
    npm install
    ```

2.  **Run Development Server**
    ```bash
    npm run dev
    ```

3.  **Type Check & Lint**
    ```bash
    npm run check
    ```

4.  **Build for Production**
    ```bash
    npm run build
    ```

## Usage Workflow

1.  **Input**: Paste itinerary text into the **Input** tab.
2.  **Prompt**: Click "Generate AI Prompt". Copy the result.
3.  **AI Processing**: Paste the prompt into an LLM (Claude, ChatGPT). Copy the JSON response.
4.  **Render**: Paste the JSON into the **Render** tab.
5.  **Refine**:
    -   Use **Config** to adjust colors, sizes, and transport types.
    -   Drag labels on the map to fix overlaps.
    -   Ctrl+Click arrows or labels to hide specific elements.
6.  **Export**: Use the **Export** buttons to download high-res assets.

## Project Structure

This project follows the **SlopChop Protocol**, enforcing strict file size limits (<2000 tokens) and complexity rules to ensure maintainability.

-   `src/map.ts`: Main renderer entry point.
-   `src/map-draw.ts`: Low-level drawing logic (nodes, segments).
-   `src/geo.ts`: Geospatial math (curves, arrow rotation).
-   `src/layout.ts`: Label positioning algorithms.
-   `src/config-ui.ts`: UI state management.
-   `src/leader-lines.ts`: Dynamic connector lines logic.

## License

Private / Proprietary.