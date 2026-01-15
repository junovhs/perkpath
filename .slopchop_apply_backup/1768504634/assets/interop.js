// PerkPath JS Interop - The Bridge to Leaflet

// Global state to hold the map instance
let map = null;
let layerGroup = null;

window.init_map = function() {
    if (map) return; // Already initialized

    console.log("Initializing Leaflet Map...");
    
    // 1. Create Map
    map = L.map('map', {
        zoomControl: false,
        attributionControl: false
    }).setView([20, 0], 2);

    // 2. Add Tiles (CartoDB Voyager - Clean & Modern)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);

    // 3. Create a layer group for easy clearing later
    layerGroup = L.layerGroup().addTo(map);
    
    // Force a resize calculation after a short delay to handle container layout settling
    setTimeout(() => { map.invalidateSize(); }, 100);
}

window.render_map_data = function(json_data) {
    if (!map || !layerGroup) return;
    
    console.log("Rendering Data...", json_data);
    const data = JSON.parse(json_data);
    
    // Clear previous items
    layerGroup.clearLayers();

    // 1. Draw Routes (Curves)
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

    // 2. Draw Arrows (New)
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

    // 3. Draw Nodes (Dots)
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

    // 4. Draw Labels
    if (data.labels) {
        data.labels.forEach(label => {
            const icon = L.divIcon({
                className: 'custom-label', 
                html: `<div style="
                    background: ${label.bg_color}; 
                    color: ${label.text_color}; 
                    padding: 4px 8px; 
                    border-radius: 4px; 
                    font-size: 12px; 
                    font-weight: bold;
                    white-space: nowrap;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                    transform: translate(-50%, -50%);
                ">${label.text}</div>`,
                iconSize: [0, 0], 
                iconAnchor: [0, 0]
            });
            
            L.marker([label.lat, label.lng], { icon: icon }).addTo(layerGroup);
        });
    }

    // 5. Fit Bounds
    if (data.nodes && data.nodes.length > 0) {
        const bounds = data.nodes.map(n => [n.lat, n.lng]);
        map.fitBounds(bounds, { padding: [50, 50] });
    }
}