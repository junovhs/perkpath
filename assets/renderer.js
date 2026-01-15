// PerkPath - Map Rendering Logic

window.MapRenderer = {
    render: function(data, layerGroup, allLabels, leaderLinesGroup, activeLeaderLines, map) {
        layerGroup.clearLayers();
        leaderLinesGroup.clearLayers();
        activeLeaderLines.clear();
        allLabels.clear();

        this.drawRoutes(data.routes, layerGroup);
        this.drawArrows(data.arrows, layerGroup);
        this.drawNodes(data.nodes, layerGroup);
        this.drawLabels(data.labels, layerGroup, allLabels, map, leaderLinesGroup, activeLeaderLines);

        if (data.nodes && data.nodes.length > 0) {
            const bounds = data.nodes.map(n => [n.lat, n.lng]);
            map.fitBounds(bounds, { padding: [50, 50] });
            window.show_toast("Map Rendered!", "success");
        }
    },

    drawRoutes: function(routes, layerGroup) {
        if (!routes) return;
        routes.forEach(route => {
            L.polyline(route.points, {
                color: route.color,
                weight: 4,
                opacity: 0.8,
                dashArray: route.style === 'dashed' ? '10, 10' : null,
                lineCap: 'round',
                lineJoin: 'round',
                smoothFactor: 1.5
            }).addTo(layerGroup);
        });
    },

    drawArrows: function(arrows, layerGroup) {
        if (!arrows) return;
        
        // UPDATED: Arrow now points UP (North) by default.
        // This aligns with Leaflet/CSS rotation (0 deg = North).
        // Added drop shadow filter and white stroke.
        const arrowSvg = `
            <svg viewBox="0 0 24 24" width="100%" height="100%" style="overflow: visible;">
                <defs>
                    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-color="rgba(0,0,0,0.3)" />
                    </filter>
                </defs>
                <path d="M12,5 L20,20 L12,17 L4,20 Z" 
                      fill="currentColor" 
                      stroke="white" 
                      stroke-width="1.5" 
                      stroke-linejoin="round"
                      style="filter: url(#shadow);" />
            </svg>
        `;

        arrows.forEach(arrow => {
            const size = arrow.size || 24;
            const icon = L.divIcon({
                className: 'arrow-icon',
                html: `<div style="
                    transform: rotate(${arrow.rotation}deg);
                    color: ${arrow.color};
                    width: ${size}px; 
                    height: ${size}px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                ">${arrowSvg}</div>`,
                iconSize: [size, size],
                iconAnchor: [size / 2, size / 2]
            });
            L.marker([arrow.lat, arrow.lng], { icon: icon }).addTo(layerGroup);
        });
    },

    drawNodes: function(nodes, layerGroup) {
        if (!nodes) return;
        nodes.forEach(node => {
            L.circleMarker([node.lat, node.lng], {
                radius: node.size || 6,
                fillColor: node.color,
                fillOpacity: 1,
                color: '#ffffff',
                weight: 2,
                opacity: 1
            }).addTo(layerGroup);
        });
    },

    drawLabels: function(labels, layerGroup, allLabels, map, leaderLinesGroup, activeLeaderLines) {
        if (!labels) return;
        labels.forEach(label => {
            const fontSize = label.font_size || 12;
            
            const icon = L.divIcon({
                className: 'custom-label', 
                html: `<div class="label-inner" style="
                    background: ${label.bg_color}; 
                    color: ${label.text_color}; 
                    padding: 6px 10px; 
                    border-radius: 6px; 
                    font-size: ${fontSize}px; 
                    font-weight: 700;
                    white-space: nowrap;
                    box-shadow: 0 3px 8px rgba(0,0,0,0.2);
                    cursor: grab;
                    font-family: var(--font-sans);
                ">${label.text}</div>`,
                iconSize: [0, 0],
                iconAnchor: [0, 0] 
            });
            
            const marker = L.marker([label.lat, label.lng], { 
                icon: icon,
                draggable: true,
                autoPan: false
            }).addTo(layerGroup);

            marker.nodeData = {
                lat: label.lat,
                lng: label.lng,
                size: label.node_size
            };

            allLabels.add(marker);

            marker.on('drag', () => {
                if (window.LeaderLineManager) {
                    window.LeaderLineManager.updateLine(marker, map, leaderLinesGroup, activeLeaderLines);
                }
            });
        });
    }
};