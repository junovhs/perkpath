// PerkPath JS Interop - The Bridge to Leaflet

let map = null;
let layerGroup = null;
let leaderLinesGroup = null;

// Track active leader lines: Map<LabelMarker, Polyline>
const activeLeaderLines = new Map();

window.init_map = function() {
    if (map) return;

    console.log("Initializing Leaflet Map...");
    
    map = L.map('map', {
        zoomControl: false,
        attributionControl: false
    }).setView([20, 0], 2);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);

    // Order matters for z-index
    leaderLinesGroup = L.layerGroup().addTo(map); // Bottom
    layerGroup = L.layerGroup().addTo(map);       // Top (Markers)
    
    setTimeout(() => { map.invalidateSize(); }, 100);

    // Update lines on zoom since pixel distances change
    map.on('zoom', updateAllLeaderLines);
}

window.render_map_data = function(json_data) {
    if (!map || !layerGroup) return;
    
    console.log("Rendering Data...");
    const data = JSON.parse(json_data);
    
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
                iconSize: [0, 0], // CSS handles size
                // Initially centered. Dragging will offset this relative to the lat/lng anchor.
                iconAnchor: [0, 0] 
            });
            
            const marker = L.marker([label.lat, label.lng], { 
                icon: icon,
                draggable: true,
                autoPan: true 
            }).addTo(layerGroup);

            // Store metadata for leader line calculations
            marker.nodeData = {
                lat: label.lat,
                lng: label.lng,
                size: label.node_size
            };

            marker.on('drag', () => updateLeaderLine(marker));
            marker.on('dragend', () => updateLeaderLine(marker));
        });
    }

    if (data.nodes && data.nodes.length > 0) {
        const bounds = data.nodes.map(n => [n.lat, n.lng]);
        map.fitBounds(bounds, { padding: [50, 50] });
    }
}

// --- Leader Line Logic ---

function updateAllLeaderLines() {
    activeLeaderLines.forEach((_, marker) => {
        updateLeaderLine(marker);
    });
}

function updateLeaderLine(marker) {
    if (!marker.nodeData) return;

    const nodeLat = marker.nodeData.lat;
    const nodeLng = marker.nodeData.lng;
    const nodeSize = marker.nodeData.size;

    // Get pixel positions
    const nodePoint = map.latLngToContainerPoint([nodeLat, nodeLng]);
    
    // Get label bounding box
    const element = marker.getElement();
    if (!element) return;
    
    // We need the inner div because the wrapper has 0 width/height
    const inner = element.querySelector('.label-inner');
    if (!inner) return;

    const labelRect = inner.getBoundingClientRect();
    const mapRect = map.getContainer().getBoundingClientRect();

    // Convert label rect to map-container relative coordinates
    const rect = {
        left: labelRect.left - mapRect.left,
        right: labelRect.right - mapRect.left,
        top: labelRect.top - mapRect.top,
        bottom: labelRect.bottom - mapRect.top,
        width: labelRect.width,
        height: labelRect.height
    };

    // Find closest point on rect to the node center
    const closest = findClosestPointOnRect(rect, nodePoint);

    // Calculate distance
    const dx = nodePoint.x - closest.x;
    const dy = nodePoint.y - closest.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Threshold: Only show line if label is far enough away (2.5x node size)
    // We add a bit of buffer to prevent flickering
    const threshold = nodeSize * 2.5 + 5;

    // Remove existing line
    if (activeLeaderLines.has(marker)) {
        leaderLinesGroup.removeLayer(activeLeaderLines.get(marker));
        activeLeaderLines.delete(marker);
    }

    if (dist > threshold) {
        // Draw new line
        // Convert container points back to LatLng
        const startLatLng = map.containerPointToLatLng(nodePoint);
        const endLatLng = map.containerPointToLatLng(closest);

        const line = L.polyline([startLatLng, endLatLng], {
            color: '#666',
            weight: 1,
            dashArray: '4, 4',
            opacity: 0.6
        }).addTo(leaderLinesGroup);

        activeLeaderLines.set(marker, line);
    }
}

function findClosestPointOnRect(rect, point) {
    // Clamp point.x to [rect.left, rect.right]
    const x = Math.max(rect.left, Math.min(point.x, rect.right));
    // Clamp point.y to [rect.top, rect.bottom]
    const y = Math.max(rect.top, Math.min(point.y, rect.bottom));
    return { x, y };
}