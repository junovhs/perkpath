import type { RouteType } from "./types";

export function generatePromptString(itineraryText: string, routeTypes: RouteType[]): string {
    const transportTypes = routeTypes.map((rt) => `"${rt.id}"`).join(" | ");

    return `You are a travel itinerary parser. Parse the itinerary and return ONLY valid JSON.

TRANSPORT TYPES: ${transportTypes}

PARSING RULES:
• Extract all locations (cities, parks, airports, landmarks)
• Get accurate lat/lng coordinates for each
• Determine transport mode from context:
  - "fly/flight" → fly
  - "drive/motor/bus/coach" → drive
  - "rail/train" → rail
  - "cruise/sail/boat/ferry" → cruise
  - Default to "drive" if unclear
• First location: isStart: true
• Last location: isEnd: true
• OPTIONAL: If locations are geographically close together, add "labelPosition" to help avoid overlaps. Options: "right", "left", "top", "bottom", "top-right", "top-left", "bottom-right", "bottom-left"

EXAMPLE INPUT:
Part 1: Alaska
Start in Anchorage
Take rail to Denali
Drive to Fairbanks

EXAMPLE OUTPUT:
{
  "title": "Alaska Adventure",
  "locations": [
    { "name": "Anchorage", "lat": 61.2181, "lng": -149.9003, "isStart": true },
    { "name": "Denali National Park", "lat": 63.1148, "lng": -151.1926, "labelPosition": "left" },
    { "name": "Fairbanks", "lat": 64.8378, "lng": -147.7164, "isEnd": true }
  ],
  "segments": [
    { "from": "Anchorage", "to": "Denali National Park", "transport": "rail" },
    { "from": "Denali National Park", "to": "Fairbanks", "transport": "drive" }
  ]
}

NOW PARSE THIS ITINERARY (return ONLY JSON, no markdown code blocks):

${itineraryText}`;
}
