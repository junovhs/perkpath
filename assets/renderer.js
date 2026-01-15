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
        // SVG Arrow Path (Simple Triangle)
        const arrowSvg = `
            <svg viewBox="0 0 24 24" width="24" height="24" style="overflow: visible;">
                <path d="M2,2 L22,12 L2,22" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `;

        arrows.forEach(arrow => {
            const icon = L.divIcon({
                className: 'arrow-icon',
                html: `<div style="
                    transform: rotate(${arrow.rotation}deg);
                    color: ${arrow.color};
                    width: 24px; 
                    height: 24px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));
                ">${arrowSvg}</div>`,
                iconSize: [24, 24],
                iconAnchor: [12, 12]
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