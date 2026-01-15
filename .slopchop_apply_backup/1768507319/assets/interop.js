// PerkPath JS Interop - The Bridge to Leaflet

let map = null;
let layerGroup = null;
let leaderLinesGroup = null;
const activeLeaderLines = new Map();

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
    
    // Auto hide
    setTimeout(() => {
        toast.className = toast.className.replace('show', '');
    }, 3000);
}

// --- Map Initialization ---
window.init_map = function() {
    if (map) return true; // Already initialized

    console.log("Initializing Leaflet Map...");
    
    const mapContainer = document.getElementById('map');
    if (!mapContainer) {
        console.error("Map container #map not found!");
        return false;
    }

    if (typeof L === 'undefined') {
        console.error("Leaflet (L) is not loaded!");
        return false;
    }
    
    map = L.map('map', {
        zoomControl: false,
        attributionControl: false
    }).setView([20, 0], 2);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);

    leaderLinesGroup = L.layerGroup().addTo(map); // Bottom
    layerGroup = L.layerGroup().addTo(map);       // Top

    setTimeout(() => { map.invalidateSize(); }, 100);

    map.on('zoom', () => {
        if (window.LeaderLineManager) {
            window.LeaderLineManager.updateAll(map, leaderLinesGroup, activeLeaderLines);
        }
    });

    return true;
}

window.render_map_data = function(json_data) {
    // Attempt init if not ready
    if (!map) {
        if (!window.init_map()) return;
    }
    
    console.log("Rendering Data...");
    let data;
    try {
        data = JSON.parse(json_data);
    } catch (e) {
        console.error("Failed to parse JSON for map render", e);
        window.show_toast("Map Render Failed: Invalid JSON", "error");
        return;
    }
    
    layerGroup.clearLayers();
    leaderLinesGroup.clearLayers();
    activeLeaderLines.clear();

    // 1. Draw Routes
    if (data.routes) {
        data.routes.forEach(route => {
            L.polyline(route.points, {
                color: route.color,
                weight: 4,
                opacity: 0.8,
                dashArray: route.style === 'dashed' ? '10, 10' : null,
                lineCap: 'round',
                lineJoin: 'round'
            }).addTo(layerGroup);
        });
    }

    // 2. Draw Arrows
    if (data.arrows) {
        data.arrows.forEach(arrow => {
            const icon = L.divIcon({
                className: 'arrow-icon',
                html: `<div style="
                    transform: rotate(${arrow.rotation}deg);
                    color: ${arrow.color};
                    font-size: 20px;
                    line-height: 20px;
                    text-align: center;
                    filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));
                    margin-top: -10px; margin-left: -10px;
                ">?</div>`,
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            });
            L.marker([arrow.lat, arrow.lng], { icon: icon }).addTo(layerGroup);
        });
    }

    // 3. Draw Nodes
    if (data.nodes) {
        data.nodes.forEach(node => {
            L.circleMarker([node.lat, node.lng], {
                radius: node.size || 6,
                fillColor: node.color,
                fillOpacity: 1,
                color: '#ffffff',
                weight: 2,
                opacity: 1
            }).addTo(layerGroup);
        });
    }

    // 4. Draw Interactive Labels
    if (data.labels) {
        data.labels.forEach(label => {
            const icon = L.divIcon({
                className: 'custom-label', 
                html: `<div class="label-inner" style="
                    background: ${label.bg_color}; 
                    color: ${label.text_color}; 
                    padding: 4px 8px; 
                    border-radius: 4px; 
                    font-size: 12px; 
                    font-weight: bold;
                    white-space: nowrap;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                    cursor: grab;
                ">${label.text}</div>`,
                iconSize: [0, 0],
                iconAnchor: [0, 0] 
            });
            
            const marker = L.marker([label.lat, label.lng], { 
                icon: icon,
                draggable: true,
                autoPan: true 
            }).addTo(layerGroup);

            marker.nodeData = {
                lat: label.lat,
                lng: label.lng,
                size: label.node_size
            };

            const updateFn = () => {
                if (window.LeaderLineManager) {
                    window.LeaderLineManager.updateLine(marker, map, leaderLinesGroup, activeLeaderLines);
                }
            };
            marker.on('drag', updateFn);
            marker.on('dragend', updateFn);
        });
    }

    if (data.nodes && data.nodes.length > 0) {
        const bounds = data.nodes.map(n => [n.lat, n.lng]);
        map.fitBounds(bounds, { padding: [50, 50] });
        window.show_toast("Map Rendered Successfully!", "success");
    }
}