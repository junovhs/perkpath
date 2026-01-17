# PerkPath Design Pivot Brief

## Executive Summary

PerkPath is transitioning from a text-parsing interface to a direct manipulation trip builder. The new interaction model borrows from the decades-mature patterns of non-linear video editors: an ordered sequence of objects, a live preview, and intuitive drag-based reordering. The learning surface should approach zero — users discover capabilities through natural exploration, not instruction.

---

## Core Architectural Principle

**The list is the source of truth. The map is the visualization.**

This is a unidirectional data flow. Users build a trip by composing an ordered sequence of stops in a timeline interface. The map renders that sequence as a route. Users never "draw on the map" to create a trip — they manipulate the list, and the map reflects their work in real time.

This separation is critical:
- The timeline is the primary workspace where all meaningful editing happens
- The map is a live preview that confirms the user's work visually
- Coordinates flow from list → map, with one exception: corrective pin dragging (see Escape Hatches below)

---

## The Timeline Interface

### Conceptual Model

The trip timeline is a horizontal sequence of stops, reading left to right. The leftmost stop is where the trip begins. The rightmost stop is where it ends. Time flows in the direction you read. This requires no explanation — the directionality is culturally implicit.

Each stop is a discrete, tangible object in the timeline. The spaces between stops represent the travel segments connecting them. Both stops and segments are selectable, editable, first-class entities.

### Stops

A stop represents a location in the itinerary. At minimum, a stop has:
- A name (displayed as a label)
- Coordinates (latitude/longitude, used for map placement)
- An overnight count (how many nights spent here, defaulting to 0 for pass-through stops)

Visually, a stop should feel like something you can grab and manipulate. It is not a row in a table. It is not a form field. It is an object with presence.

### Duration as Width

Stops with overnight stays should be visually wider than pass-through stops. A 3-night stay appears wider than a 1-night stay. This makes the trip's pacing legible at a glance — you can see where the long stays are without reading numbers.

The overnight count should be adjustable by dragging the edge of a stop, the same way you trim a clip in a video editor. Drag the right edge further right to add nights. Drag it left to reduce. This interaction should feel immediate and physical.

For stops with zero overnights (pass-through points), the stop appears at its minimum width — just enough to display the label and provide a grab handle.

### Segments

The space between two stops represents the travel segment connecting them. This is where transport type is specified (motorcoach, rail, ferry, flight, etc.).

Clicking the segment selects it. When selected, the user can change the transport type. This could be a dropdown, a set of icon buttons, or another appropriate control — the specific UI treatment is flexible, but the key insight is that the segment itself is selectable.

Visually, segments could be styled to reflect their transport type even in the timeline (not just on the map). A dashed connector for ferries, a solid line for motorcoach. This creates consistency between the timeline and the map rendering.

### Reordering

Stops can be dragged to reorder. Grab a stop, drag it left or right, drop it in a new position. The route on the map updates immediately to reflect the new sequence.

The drag interaction should have clear affordances:
- Cursor changes on hover to indicate draggability
- The dragged stop should lift visually (shadow, scale, z-index) to indicate it's being moved
- Drop zones should highlight as the stop passes over valid positions
- The map should update in real time as the user drags, so they can preview the route change before committing

### Selection and Focus

Clicking a stop selects it. When a stop is selected:
- It is visually highlighted in the timeline
- The map smoothly pans and centers on that stop's location
- A detail panel or inline expansion may appear, allowing the user to edit properties (name, coordinates, overnights)

This selection-focus behavior creates a constant relationship between timeline and map. The user always knows where they are spatially.

### Hover Preview

As the user hovers along the timeline (without clicking), the map can subtly indicate the hovered location. This is a lightweight preview, not a full selection. It answers the question "where is this?" without requiring commitment.

The implementation could be a subtle crosshair or highlight on the map, or simply a tooltip showing coordinates. The key is that it's non-intrusive — hovering is exploratory, not an action.

---

## Adding Stops: The Three Input Methods

When the user adds a new stop to the timeline, they need to specify a location. There are exactly three ways to do this:

### 1. Database Search (Primary Method)

The user types a location name. An autocomplete dropdown appears with matches from the local geocoding database.

The search must be:
- **Fast**: Sub-100ms response, ideally sub-10ms. No perceptible delay between keystroke and results.
- **Fuzzy**: Handles typos, partial matches, alternate spellings. "Stonehendge" finds Stonehenge. "Munich" and "München" both find the same city.
- **Disambiguated**: When multiple places share a name, results include context. "Paris, France" and "Paris, Texas" both appear as distinct options.
- **Ranked**: More populous or more commonly visited places should rank higher. When someone types "Paris", France should appear above Texas.

The database should include:
- All cities above a reasonable population threshold (GeoNames `cities15000` as a baseline)
- Major tourist destinations, landmarks, and points of interest
- Alternate names in multiple languages
- Country and region context for disambiguation

The user selects a result from the dropdown. The coordinates are populated automatically. The stop appears in the timeline, the pin appears on the map.

If the user types a query and no results appear, the UI should gracefully indicate this and guide them toward the escape hatches (see below).

### 2. Direct Coordinate Input (Power User Method)

A power user may know the exact coordinates of a location. The UI should accept direct input of latitude and longitude.

This could be:
- A toggle or mode switch that reveals coordinate fields
- Pasting coordinates into the search field and having them recognized automatically (detect patterns like "48.8566, 2.3522" or "48.8566°N 2.3522°E")
- An "Advanced" expansion on the stop detail panel

This method is not the default flow, but it must exist and be discoverable by users who need it.

### 3. Manual Pin Drop (Escape Hatch)

When a location doesn't exist in the database, the user needs to place it manually. This could be:
- A small safari camp with 12 beds
- A newly opened attraction
- A specific trailhead or viewpoint
- A private residence

The flow:
1. User searches, finds no results (or finds results that aren't quite right)
2. User invokes "Place manually" or similar action
3. The interface enters a pin-drop mode with clear cursor feedback (crosshair, changed cursor icon)
4. User clicks the map at the desired location
5. Pin is placed, coordinates are captured, the stop is added to the timeline with a default or user-entered name
6. The mode exits automatically (single-shot) or the user can exit explicitly

This mode should be obviously temporary. The cursor feedback is critical — the user must know they're in a special mode and how to exit it.

### Corrective Dragging

Even after a stop is added via database search, the coordinates may be slightly off. The geocoding database might place "Stonehenge" at the visitor center, but the user wants the pin on the actual stones.

The user should be able to drag the pin on the map to adjust its position. This is the one exception to the "list → map" unidirectional flow — coordinates can flow from map → list when the user explicitly corrects a pin.

This should be a direct manipulation interaction:
- Click and drag the pin
- The pin follows the cursor
- On release, the coordinates update in the timeline data
- The route (curves connecting stops) redraws if necessary

---

## Geocoding Database: Technical Requirements

### Data Source

GeoNames provides free downloadable datasets. The `cities15000` dataset contains approximately 25,000 places with population over 15,000. For broader coverage, `allCountries` is larger but may be excessive.

The data includes:
- Canonical name
- Alternate names (in various languages and scripts)
- Country code
- Latitude and longitude
- Population (useful for ranking)
- Feature class (city, landmark, etc.)

### Embedding Strategy

The database should be embedded in the application, not fetched from an external API. This provides:
- Instant lookups with no network latency
- Offline functionality
- No rate limits or external dependencies
- Fully deterministic behavior

The data could be:
- Compiled into the Rust binary as a static asset
- Shipped as a separate file and loaded at startup
- Indexed using an efficient structure (prefix trie, BK-tree for fuzzy matching)

### Search Implementation

The search needs to support:
- **Prefix matching**: "Lon" matches "London"
- **Fuzzy matching**: "Londn" matches "London" (Levenshtein distance ≤ 2)
- **Alternate name matching**: "NYC" matches "New York City"
- **Ranked results**: Population-weighted, with exact matches ranked above fuzzy matches

A suggested approach:
1. Build a prefix trie from all names and alternate names
2. For each query, collect prefix matches
3. If insufficient results, fall back to fuzzy matching using edit distance
4. Rank results by match quality (exact > prefix > fuzzy) and population
5. Return top N results for the autocomplete dropdown

This should all happen synchronously and complete in under 10ms for typical queries.

### Did You Mean?

If the user's query has no exact matches but there are close fuzzy matches, the UI should suggest alternatives. "Did you mean: Stonehenge?" This transforms a dead-end into a helpful nudge.

---

## Map Behavior

### Route Rendering

The map displays the trip as a connected route. Stops appear as nodes (pins, circles, or styled markers). Segments appear as curves connecting the nodes.

The curves should be smooth and continuous. Currently, PerkPath uses per-segment quadratic beziers, which creates angular connections at nodes. The v0.1.1 plan addresses this with Catmull-Rom splines — a single continuous curve passing through all points.

Segment styling (color, dash pattern) reflects transport type. Ferries might be dashed, motorcoach solid, flights in a different color. The legend on the map explains the styling.

### Fit and Focus

When the trip is first rendered (or significantly changed), the map should fit the entire route in view with appropriate padding.

When a stop is selected in the timeline, the map should pan smoothly to center on that stop. Zoom level may adjust to keep context visible, but aggressive zooming should be avoided — the user wants to see where the stop is in relation to the route, not a close-up of just that pin.

### Base Map Styling (Future)

A long-term goal is control over base map styling — simplification level, color palette, label density. This enables the "white label" vision where different travel brands can match their visual identity. This is out of scope for immediate implementation but should inform architectural decisions (don't hard-code tile sources, don't assume a single visual style).

---

## Progressive Disclosure

The interface should be learnable through exploration, not instruction.

**Immediate and obvious:**
- Add a stop (prominent button or input field)
- See the stop appear in the timeline
- See the pin appear on the map
- The route connects the pins

**Discoverable through natural interaction:**
- Click a stop to select it (standard pattern, no learning required)
- Drag a stop to reorder it (grab handles should suggest this)
- Click between stops to select a segment (may require subtle visual affordance)
- Drag the edge of a stop to change overnight count (this is less obvious — may need a hint on first hover)

**Revealed when needed:**
- Manual pin drop mode (appears when search fails or user explicitly requests it)
- Direct coordinate input (hidden until user looks for it)
- Advanced styling options (collapsed or in a separate panel)

The goal is a minimal initial surface. The user should be able to build a basic trip without reading any documentation. Power features exist but don't clutter the default experience.

---

## Visual Design Principles

### Clarity Over Decoration

Every visual element should communicate something. No ornament for its own sake. If a color is used, it means something. If an element is larger, it's more important or represents more time.

### Consistency Between Timeline and Map

The styling vocabulary should be shared. If ferries are dashed lines on the map, they should be dashed connectors in the timeline. If a stop is green in the timeline (start) or red (end), the corresponding pin should match. The two views are representations of the same data — they should look like it.

### Responsiveness and Feedback

Every action should have immediate visual feedback. Drag a stop — it moves with your cursor, the route redraws. Hover an autocomplete result — something highlights. Click a segment — it selects visibly.

Latency is the enemy. Any delay between action and feedback breaks the sense of direct manipulation. This is where Rust's performance matters — smooth 60fps interactions, sub-frame updates, no jank.

---

## What This Is Not

### Not a Map-Drawing Tool

Users don't draw routes on the map. They build a list, the map reflects the list. The map is output, not input (with the narrow exception of corrective pin dragging).

### Not AI-Dependent

There is no AI in the geocoding flow. Database search is deterministic. Manual pin drop is user-controlled. No probabilistic coordinate guessing, no hallucination risk.

AI may exist elsewhere in the product (e.g., parsing unstructured itinerary text into structured data), but the core trip-building interaction is direct manipulation, not natural language.

### Not Overwhelming

This is a professional tool, but professional doesn't mean complex. The best professional tools feel simple because they're well-designed, not because they lack power. The surface is small; the depth is revealed progressively.

---

## Summary

PerkPath's new interaction model is:
- **List-driven**: The timeline is the source of truth, the map is a visualization
- **Direct manipulation**: Drag to reorder, drag to trim, click to select
- **Deterministic**: Local geocoding database, no AI coordinate guessing
- **Progressive**: Core actions are obvious, advanced features are discoverable
- **Responsive**: Immediate feedback, smooth performance, no perceptible latency

The user builds a trip by composing a sequence of stops. The map shows them what they've built. Everything else is refinement.