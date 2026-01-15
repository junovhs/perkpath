// PerkPath - Leader Line Logic
// Extracted to satisfy the Law of Atomicity

window.LeaderLineManager = {
    // Determine the closest point on a rectangle to a target point
    findClosestPointOnRect: function(rect, point) {
        const x = Math.max(rect.left, Math.min(point.x, rect.right));
        const y = Math.max(rect.top, Math.min(point.y, rect.bottom));
        return { x, y };
    },

    // Main update function
    updateLine: function(marker, map, lineGroup, activeLinesMap) {
        if (!marker.nodeData || !map || !lineGroup) return;

        const nodeLat = marker.nodeData.lat;
        const nodeLng = marker.nodeData.lng;
        const nodeSize = marker.nodeData.size;

        // 1. Get Geometry
        const nodePoint = map.latLngToContainerPoint([nodeLat, nodeLng]);
        const element = marker.getElement();
        
        if (!element) return;
        const inner = element.querySelector('.label-inner');
        if (!inner) return;

        // 2. Calculate Label Rect
        const labelRect = inner.getBoundingClientRect();
        const mapRect = map.getContainer().getBoundingClientRect();

        const rect = {
            left: labelRect.left - mapRect.left,
            right: labelRect.right - mapRect.left,
            top: labelRect.top - mapRect.top,
            bottom: labelRect.bottom - mapRect.top
        };

        // 3. Calculate Distance
        const closest = this.findClosestPointOnRect(rect, nodePoint);
        const dx = nodePoint.x - closest.x;
        const dy = nodePoint.y - closest.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // 4. Threshold Logic (2.5x node size)
        const threshold = nodeSize * 2.5 + 5;

        // 5. Update DOM
        if (activeLinesMap.has(marker)) {
            lineGroup.removeLayer(activeLinesMap.get(marker));
            activeLinesMap.delete(marker);
        }

        if (dist > threshold) {
            const startLatLng = map.containerPointToLatLng(nodePoint);
            const endLatLng = map.containerPointToLatLng(closest);

            const line = L.polyline([startLatLng, endLatLng], {
                color: '#666',
                weight: 1,
                dashArray: '4, 4',
                opacity: 0.6
            }).addTo(lineGroup);

            activeLinesMap.set(marker, line);
        }
    },

    updateAll: function(map, lineGroup, activeLinesMap) {
        if (!map || !lineGroup) return;
        activeLinesMap.forEach((_, marker) => {
            this.updateLine(marker, map, lineGroup, activeLinesMap);
        });
    }
};