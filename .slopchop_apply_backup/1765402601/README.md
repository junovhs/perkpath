# RouteMap Generator

A tool to generate visual itinerary maps from text descriptions using AI.

## Setup

1.  **Install Dependencies**
    ```bash
    npm install
    ```

2.  **Run Development Server**
    ```bash
    npm run dev
    ```

3.  **Lint & Fix**
    ```bash
    npm run check
    npm run fix
    ```

## Architecture

-   **Frontend**: Vanilla TypeScript + Vite
-   **Map**: Leaflet + CartoDB tiles
-   **Geo**: Turf.js for bezier curves
-   **Styling**: CSS Variables (Cyberpunk/Dark theme)

## Usage

1.  Paste itinerary text into the "Input" tab.
2.  Generate AI prompt.
3.  Paste prompt to LLM (Claude/GPT).
4.  Paste JSON response into "Render" tab.
5.  Export map image.