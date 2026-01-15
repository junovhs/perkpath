// PerkPath - Minimal Leaflet Bridge
// All logic lives in Rust. This file only executes Leaflet API calls.

let map = null;
let layerGroup = null;
let leaderLinesGroup = null;
const labelMarkers = new Map();
const activeLeaderLines = new Map();

window.MapBridge = {
    init: function() {
        if (map) return true;
        const container = document.getElementById('map');
        if (!container || typeof L === 'undefined') return false;

        map = L.map('map', {
            zoomControl: false,
            attributionControl: false,
            zoomAnimation: true,
            fadeAnimation: true
        }).setView([20, 0], 2);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap &copy; CARTO',
            subdomains: 'abcd',
            maxZoom: 19
        }).addTo(map);

        leaderLinesGroup = L.layerGroup().addTo(map);
        layerGroup = L.layerGroup().addTo(map);
        setTimeout(() => map.invalidateSize(), 100);

        map.on('move', () => this.updateAllLeaderLines());
        return true;
    },

    execute: function(commands) {
        if (!map && !this.init()) return;
        
        commands.forEach(cmd => {
            switch(cmd.type) {
                case 'clear':
                    layerGroup.clearLayers();
                    leaderLinesGroup.clearLayers();
                    labelMarkers.clear();
                    activeLeaderLines.clear();
                    break;
                case 'polyline':
                    L.polyline(cmd.points, cmd.options).addTo(layerGroup);
                    break;
                case 'circle':
                    L.circleMarker(cmd.latlng, cmd.options).addTo(layerGroup);
                    break;
                case 'arrow':
                    L.marker(cmd.latlng, { 
                        icon: L.divIcon({ className: 'arrow-icon', html: cmd.html, iconSize: cmd.size, iconAnchor: cmd.anchor })
                    }).addTo(layerGroup);
                    break;
                case 'label':
                    this.addLabel(cmd);
                    break;
                case 'fit':
                    map.fitBounds(cmd.bounds, { padding: cmd.padding });
                    break;
            }
        });
    },

    addLabel: function(cmd) {
        const icon = L.divIcon({
            className: 'custom-label',
            html: cmd.html,
            iconSize: [0, 0],
            iconAnchor: [0, 0]
        });
        const marker = L.marker(cmd.latlng, { icon, draggable: true, autoPan: false }).addTo(layerGroup);
        marker.nodeData = { lat: cmd.nodeLat, lng: cmd.nodeLng, size: cmd.nodeSize };
        labelMarkers.set(cmd.id, marker);
        
        marker.on('drag', () => this.updateLeaderLine(marker));
    },

    updateLeaderLine: function(marker) {
        if (!marker.nodeData) return;
        const nodePoint = map.latLngToContainerPoint([marker.nodeData.lat, marker.nodeData.lng]);
        const el = marker.getElement();
        if (!el) return;
        const inner = el.querySelector('.label-inner');
        if (!inner) return;

        const labelRect = inner.getBoundingClientRect();
        const mapRect = map.getContainer().getBoundingClientRect();
        const rect = {
            left: labelRect.left - mapRect.left, right: labelRect.right - mapRect.left,
            top: labelRect.top - mapRect.top, bottom: labelRect.bottom - mapRect.top,
            width: labelRect.width, height: labelRect.height
        };

        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = nodePoint.x - cx;
        const dy = nodePoint.y - cy;
        const anchor = (Math.abs(dx) / (rect.width/2) > Math.abs(dy) / (rect.height/2))
            ? { x: dx > 0 ? rect.right : rect.left, y: cy }
            : { x: cx, y: dy > 0 ? rect.bottom : rect.top };

        const distSq = (nodePoint.x - anchor.x) ** 2 + (nodePoint.y - anchor.y) ** 2;
        const threshold = marker.nodeData.size * 3 + 10;

        if (distSq > threshold * threshold) {
            const points = [
                map.containerPointToLatLng(nodePoint),
                map.containerPointToLatLng(anchor)
            ];
            if (activeLeaderLines.has(marker)) {
                activeLeaderLines.get(marker).setLatLngs(points);
            } else {
                const line = L.polyline(points, {
                    color: '#666', weight: 1.5, dashArray: '3, 6', opacity: 0.6, interactive: false
                }).addTo(leaderLinesGroup);
                activeLeaderLines.set(marker, line);
            }
        } else if (activeLeaderLines.has(marker)) {
            leaderLinesGroup.removeLayer(activeLeaderLines.get(marker));
            activeLeaderLines.delete(marker);
        }
    },

    updateAllLeaderLines: function() {
        labelMarkers.forEach(marker => this.updateLeaderLine(marker));
    }
};