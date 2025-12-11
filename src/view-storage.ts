import type { AppConfig, SavedView, TripData } from "./types";

const STORAGE_KEY = "perkpath-saved-views";

export function saveView(
    name: string,
    tripData: TripData,
    center: { lat: number; lng: number },
    zoom: number,
    config: AppConfig,
): SavedView {
    const view: SavedView = {
        id: `view-${Date.now()}`,
        name,
        timestamp: Date.now(),
        tripData,
        center,
        zoom,
        config,
    };

    const views = getSavedViews();
    views.push(view);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(views));

    return view;
}

export function getSavedViews(): SavedView[] {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}

export function deleteView(id: string): void {
    const views = getSavedViews().filter((v) => v.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(views));
}

export function exportViewToFile(view: SavedView): void {
    const json = JSON.stringify(view, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `perkpath-${view.name.replace(/\s+/g, "-")}-${view.id}.json`;
    link.click();

    URL.revokeObjectURL(url);
}

function readFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsText(file);
    });
}

function parseView(content: string): SavedView {
    const view = JSON.parse(content) as SavedView;
    if (!view.tripData || !view.center || !view.zoom) {
        throw new Error("Invalid view file format");
    }
    view.id = `view-${Date.now()}`;
    view.timestamp = Date.now();
    return view;
}

function storeView(view: SavedView): void {
    const views = getSavedViews();
    views.push(view);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(views));
}

export async function importViewFromFile(file: File): Promise<SavedView> {
    const content = await readFile(file);
    const view = parseView(content);
    storeView(view);
    return view;
}
