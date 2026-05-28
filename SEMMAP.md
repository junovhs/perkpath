# project -- Semantic Map

**Purpose:** To generate beautiful travel itinerary maps from simple language

## Legend

`[ENTRY]` Application entry point

`[CORE]` Core business logic

`[TYPE]` Data structures and types

`[UTIL]` Utility functions

`[HOTSPOT]` High fan-in file imported by 4+ others - request this file early in any task

`[GLOBAL-UTIL]` High fan-in utility imported from 3+ distinct domains

`[DOMAIN-CONTRACT]` Shared contract imported mostly by one subsystem

`[ROLE:model]` Primary domain model or state-holding data structure.

`[ROLE:controller]` Coordinates commands, events, or request handling.

`[ROLE:rendering]` Produces visual output or drawing behavior.

`[ROLE:view]` Represents a reusable UI view or presentation component.

`[ROLE:dialog]` Implements dialog-oriented interaction flow.

`[ROLE:config]` Defines configuration loading or configuration schema behavior.

`[ROLE:os-integration]` Bridges the application to OS-specific APIs or services.

`[ROLE:utility]` Provides cross-cutting helper logic without owning core flow.

`[ROLE:bootstrap]` Initializes the application or wires subsystem startup.

`[ROLE:build-only]` Supports the build toolchain rather than runtime behavior.

`[COUPLING:pure]` Logic stays within the language/runtime without external surface coupling.

`[COUPLING:mixed]` Blends pure logic with side effects or boundary interactions.

`[COUPLING:ui-coupled]` Depends directly on UI framework, rendering, or windowing APIs.

`[COUPLING:os-coupled]` Depends directly on operating-system services or platform APIs.

`[COUPLING:build-only]` Only relevant during build, generation, or compilation steps.

`[BEHAVIOR:owns-state]` Maintains durable in-memory state for a subsystem.

`[BEHAVIOR:mutates]` Changes application or model state in response to work.

`[BEHAVIOR:renders]` Produces rendered output, drawing commands, or visual layout.

`[BEHAVIOR:dispatches]` Routes commands, events, or control flow to other units.

`[BEHAVIOR:observes]` Listens to callbacks, notifications, or external signals.

`[BEHAVIOR:persists]` Reads from or writes to durable storage.

`[BEHAVIOR:spawns-worker]` Creates background workers, threads, or async jobs.

`[BEHAVIOR:sync-primitives]` Coordinates execution with locks, channels, or wait primitives.

`[SURFACE:filesystem]` Touches filesystem paths, files, or directory traversal.

`[SURFACE:ntfs]` Uses NTFS-specific filesystem semantics or metadata.

`[SURFACE:win32]` Touches Win32 platform APIs or Windows-native handles.

`[SURFACE:shell]` Integrates with shell commands, shell UX, or command launch surfaces.

`[SURFACE:clipboard]` Reads from or writes to the system clipboard.

`[SURFACE:gdi]` Uses GDI drawing primitives or related graphics APIs.

`[SURFACE:control]` Represents or manipulates widget/control surfaces.

`[SURFACE:view]` Represents a view-level presentation surface.

`[SURFACE:dialog]` Represents a dialog/window interaction surface.

`[SURFACE:document]` Represents document-oriented editing or display surfaces.

`[SURFACE:frame]` Represents application frame/window chrome surfaces.

## Layer 0 -- Config

`root/` (5 files: 2 .md, 3 .toml)
Representative: Cargo.toml, Dioxus.toml

`src/components/config_ui.rs`
Implements config ui props.
Exports: ConfigUIProps, ConfigUI

## Layer 1 -- Domain (Engine)

`build.rs`
Persists for build via file I/O.

`src/components/legend.rs`
Implements legend props.
Exports: from_route_type, LegendItem, LegendProps, Legend

`src/components/location_search.rs`
Implements location search props.
Exports: LocationSearchProps, LocationSearch

`src/components/map_commands.rs`
Implements label params. [CORE]
Exports: MapCommand, fit_bounds, LabelParams, arrow

`src/components/map_view.rs`
Converts view props.
Exports: MapViewProps, MapView

`src/components/sidebar.rs`
Implements sidebar props.
Exports: SidebarProps, Sidebar

`src/components/toast.rs`
Implements toast message.
Exports: ToastMessage, ToastProps, ToastType, Toast

`src/geo.rs`
Implements generate curve.
Exports: calculate_arrow_rotation, generate_curve
Touch: Contains inline Rust tests alongside runtime code.

`src/types.rs`
Implements node color config. [TYPE] [HOTSPOT]
Exports: NodeColorConfig, RouteType, TripData, AppConfig
Touch: Contains inline Rust tests alongside runtime code.

## Layer 2 -- Adapters / Infra

`src/geocoding.rs`
Finds result. [CORE]
Exports: SearchResult, Geocoder, geocoder, search
Touch: Contains inline Rust tests alongside runtime code.

`src/parser.rs`
Implements generate prompt. [UTIL]
Exports: generate_prompt
Touch: Contains inline Rust tests alongside runtime code.

## Layer 3 -- App / Entrypoints

`assets/map.css`
Implements map functionality. styles.

`assets/style.css`
Implements style functionality. styles.

`assets/ui.css`
Implements ui functionality. styles.

`index.html`
PerkPath [ENTRY]

`src/components/mod.rs`
Re-exports the public API surface. [ENTRY]
Exports: config_ui, location_search, map_commands, map_view

`src/main.rs`
Application entry point. [ENTRY]


## DependencyGraph

```yaml
DependencyGraph:
  # --- Entrypoints ---
  index.html, map.css, style.css, ui.css:
    Imports: []
    ImportedBy: []
  main.rs:
    Imports: [geo.rs, geocoding.rs, mod.rs, parser.rs, types.rs]
    ImportedBy: []
  # --- High Fan-In Hotspots ---
  types.rs:
    Imports: []
    ImportedBy: [config_ui.rs, geo.rs, legend.rs, main.rs, map_view.rs, parser.rs, sidebar.rs]
  # --- Layer 0 -- Config ---
  Cargo.toml, Dioxus.toml, README.md, SEMMAP.md, slopchop.toml:
    Imports: []
    ImportedBy: []
  config_ui.rs:
    Imports: [types.rs]
    ImportedBy: [mod.rs]
  # --- Layer 1 -- Domain (Engine) ---
  build.rs:
    Imports: []
    ImportedBy: []
  geo.rs:
    Imports: [types.rs]
    ImportedBy: [main.rs, map_view.rs]
  legend.rs:
    Imports: [types.rs]
    ImportedBy: [mod.rs]
  location_search.rs:
    Imports: [geocoding.rs]
    ImportedBy: [mod.rs]
  map_commands.rs, toast.rs:
    Imports: []
    ImportedBy: [mod.rs]
  map_view.rs:
    Imports: [geo.rs, mod.rs, types.rs]
    ImportedBy: [mod.rs]
  sidebar.rs:
    Imports: [geocoding.rs, mod.rs, parser.rs, types.rs]
    ImportedBy: [mod.rs]
  # --- Layer 2 -- Adapters / Infra ---
  geocoding.rs:
    Imports: []
    ImportedBy: [location_search.rs, main.rs, sidebar.rs]
  parser.rs:
    Imports: [types.rs]
    ImportedBy: [main.rs, sidebar.rs]
  # --- Layer 3 -- App / Entrypoints ---
  mod.rs:
    Imports: [config_ui.rs, legend.rs, location_search.rs, map_commands.rs, map_view.rs, sidebar.rs, toast.rs]
    ImportedBy: [main.rs, map_view.rs, sidebar.rs]
```
