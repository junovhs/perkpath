// PerkPath JS Interop - Orchestrator

let map = null;
let layerGroup = null;
let leaderLinesGroup = null;

// Registry of all label markers to check during animation frames
const allLabels = new Set();
// Registry of active leader lines: Map<LabelMarker, Polyline>
const activeLeaderLines = new Map();

let animationFrameId = null;
let isMapMoving = false;

// --- Toast Notification ---
window.show_toast = function(message, type) {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        document.body.appendChild(toast);
    }
    
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
        toast.className = toast.className.replace('show', '');
    }, 3000);
}

// --- The Game Loop ---
function startRenderLoop() {
    if (animationFrameId) return;

    function frame() {
        if (isMapMoving && window.LeaderLineManager) {
            window.LeaderLineManager.updateAll(map, leaderLinesGroup, activeLeaderLines, allLabels);
            animationFrameId = requestAnimationFrame(frame);
        } else {
            animationFrameId = null;
        }
    }
    
    animationFrameId = requestAnimationFrame(frame);
}

// --- Map Initialization ---
window.init_map = function() {
    if (map) return true;

    console.log("Initializing Leaflet Map...");
    
    const mapContainer = document.getElementById('map');
    if (!mapContainer || typeof L === 'undefined') return false;
    
    map = L.map('map', {
        zoomControl: false,
        attributionControl: false,
        zoomAnimation: true,
        markerZoomAnimation: true,
        fadeAnimation: true
    }).setView([20, 0], 2);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);

    leaderLinesGroup = L.layerGroup().addTo(map);
    layerGroup = L.layerGroup().addTo(map);

    setTimeout(() => { map.invalidateSize(); }, 100);

    // High-Performance Event Handling
    map.on('movestart', () => {
        isMapMoving = true;
        startRenderLoop();
    });

    map.on('moveend', () => {
        isMapMoving = false;
        if (window.LeaderLineManager) {
            window.LeaderLineManager.updateAll(map, leaderLinesGroup, activeLeaderLines, allLabels);
        }
    });

    map.on('dragstart', () => { isMapMoving = true; startRenderLoop(); });
    map.on('dragend', () => { isMapMoving = false; });

    return true;
}

window.render_map_data = function(json_data) {
    if (!map && !window.init_map()) return;
    
    let data;
    try {
        data = JSON.parse(json_data);
    } catch (e) {
        console.error(e);
        window.show_toast("JSON Error", "error");
        return;
    }
    
    if (window.MapRenderer) {
        window.MapRenderer.render(data, layerGroup, allLabels, leaderLinesGroup, activeLeaderLines, map);
    } else {
        console.error("MapRenderer not found!");
    }
}