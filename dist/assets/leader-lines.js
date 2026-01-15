// PerkPath - Leader Line Logic
// Optimized for Midpoint Snapping

window.LeaderLineManager = {
    // Finds the center point of the edge that is closest/facing the target point
    findCenterOfNearestEdge: function(rect, point) {
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;

        // Angle from center of rect to the point
        // Math.atan2(y, x) returns angle in radians
        const dx = point.x - cx;
        const dy = point.y - cy;
        
        // Determine primary direction based on relative position
        // We compare absolute distances to see if we are more "horizontal" or "vertical"
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);
        
        // Aspect ratio correction (optional, but helps for very wide labels)
        // For simplicity, we just check which edge we are closest to.
        
        if (absDx / (rect.width/2) > absDy / (rect.height/2)) {
            // Left or Right
            return {
                x: dx > 0 ? rect.right : rect.left,
                y: cy
            };
        } else {
            // Top or Bottom
            return {
                x: cx,
                y: dy > 0 ? rect.bottom : rect.top
            };
        }
    },

    updateLine: function(marker, map, lineGroup, activeLinesMap) {
        if (!marker.nodeData || !map || !lineGroup) return;

        const { lat, lng, size } = marker.nodeData;

        // Node Geometry (Anchor)
        const nodePoint = map.latLngToContainerPoint([lat, lng]);
        
        // Label Geometry
        const element = marker.getElement();
        if (!element) return;
        const inner = element.querySelector('.label-inner');
        if (!inner) return;

        const labelRect = inner.getBoundingClientRect();
        const mapRect = map.getContainer().getBoundingClientRect();

        const rect = {
            left: labelRect.left - mapRect.left,
            right: labelRect.right - mapRect.left,
            top: labelRect.top - mapRect.top,
            bottom: labelRect.bottom - mapRect.top,
            width: labelRect.width,
            height: labelRect.height
        };

        // NEW LOGIC: Snap to center of nearest edge
        const anchor = this.findCenterOfNearestEdge(rect, nodePoint);

        const dx = nodePoint.x - anchor.x;
        const dy = nodePoint.y - anchor.y;
        const distSq = dx * dx + dy * dy;
        
        // Threshold: Show line if label is moved away from the node
        // We use a larger threshold now because the offset is larger by default
        const threshold = size * 3 + 10;
        const shouldShow = distSq > (threshold * threshold);

        if (shouldShow) {
            const startLatLng = map.containerPointToLatLng(nodePoint);
            const endLatLng = map.containerPointToLatLng(anchor);
            const points = [startLatLng, endLatLng];

            if (activeLinesMap.has(marker)) {
                activeLinesMap.get(marker).setLatLngs(points);
            } else {
                const line = L.polyline(points, {
                    color: '#666',
                    weight: 1.5,
                    dashArray: '3, 6', // Dotted
                    opacity: 0.6,
                    interactive: false
                }).addTo(lineGroup);
                activeLinesMap.set(marker, line);
            }
        } else {
            if (activeLinesMap.has(marker)) {
                lineGroup.removeLayer(activeLinesMap.get(marker));
                activeLinesMap.delete(marker);
            }
        }
    },

    updateAll: function(map, lineGroup, activeLinesMap, allLabels) {
        if (!map || !lineGroup) return;
        allLabels.forEach(marker => {
            this.updateLine(marker, map, lineGroup, activeLinesMap);
        });
    }
};