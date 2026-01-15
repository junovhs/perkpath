// PerkPath - Leader Line Logic
// Optimized for 60FPS "Game Loop"

window.LeaderLineManager = {
    findClosestPointOnRect: function(rect, point) {
        const x = Math.max(rect.left, Math.min(point.x, rect.right));
        const y = Math.max(rect.top, Math.min(point.y, rect.bottom));
        return { x, y };
    },

    updateLine: function(marker, map, lineGroup, activeLinesMap) {
        if (!marker.nodeData || !map || !lineGroup) return;

        const { lat, lng, size } = marker.nodeData;

        // Fast Geometry Lookup
        const nodePoint = map.latLngToContainerPoint([lat, lng]);
        
        // Element lookup can be expensive, but necessary for dynamic labels
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
            bottom: labelRect.bottom - mapRect.top
        };

        const closest = this.findClosestPointOnRect(rect, nodePoint);
        const dx = nodePoint.x - closest.x;
        const dy = nodePoint.y - closest.y;
        const distSq = dx * dx + dy * dy; // Use squared distance to avoid Math.sqrt if possible
        
        const threshold = size * 2.5 + 5;
        const shouldShow = distSq > (threshold * threshold);

        if (shouldShow) {
            const startLatLng = map.containerPointToLatLng(nodePoint);
            const endLatLng = map.containerPointToLatLng(closest);
            const points = [startLatLng, endLatLng];

            if (activeLinesMap.has(marker)) {
                // HOT PATH: Update existing line (Zero Allocation)
                activeLinesMap.get(marker).setLatLngs(points);
            } else {
                // COLD PATH: Create new line
                const line = L.polyline(points, {
                    color: '#666',
                    weight: 1,
                    dashArray: '4, 4',
                    opacity: 0.6,
                    interactive: false // Ignore mouse events for performance
                }).addTo(lineGroup);
                activeLinesMap.set(marker, line);
            }
        } else {
            if (activeLinesMap.has(marker)) {
                // Cleanup
                lineGroup.removeLayer(activeLinesMap.get(marker));
                activeLinesMap.delete(marker);
            }
        }
    },

    updateAll: function(map, lineGroup, activeLinesMap, allLabels) {
        if (!map || !lineGroup) return;
        
        // Iterate over ALL labels to ensure lines appear/disappear correctly
        allLabels.forEach(marker => {
            this.updateLine(marker, map, lineGroup, activeLinesMap);
        });
    }
};