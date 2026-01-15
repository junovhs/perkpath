// PerkPath - Legend Logic
// Extracted to satisfy Law of Atomicity

window.MapLegend = {
    draw: function(legendItems) {
        const existing = document.getElementById('map-legend');
        if (existing) existing.remove();

        if (!legendItems || legendItems.length === 0) return;

        const legend = document.createElement('div');
        legend.id = 'map-legend';
        legend.className = 'map-legend';
        
        // Header
        const header = document.createElement('div');
        header.textContent = 'LEGEND';
        header.className = 'legend-header';
        legend.appendChild(header);

        // Items
        legendItems.forEach(item => {
            const row = document.createElement('div');
            row.className = 'legend-row';
            
            const line = document.createElement('div');
            line.className = 'legend-line';
            line.style.background = item.style === 'dashed' ? 
                `repeating-linear-gradient(90deg, ${item.color}, ${item.color} 5px, transparent 5px, transparent 10px)` : 
                item.color;
            if (item.style !== 'dashed') line.style.backgroundColor = item.color;

            const text = document.createElement('span');
            text.textContent = item.name;
            
            row.appendChild(line);
            row.appendChild(text);
            legend.appendChild(row);
        });

        const mapContainer = document.getElementById('map');
        mapContainer.appendChild(legend);
        
        // Stop clicks from reaching the map
        if (typeof L !== 'undefined') {
            L.DomEvent.disableClickPropagation(legend);
            L.DomEvent.disableScrollPropagation(legend);
        }
        
        this.makeDraggable(legend);
    },

    makeDraggable: function(el) {
        let isDragging = false;
        let startX, startY, initialLeft, initialTop;

        el.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return; // Only Left Click
            
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            initialLeft = el.offsetLeft;
            initialTop = el.offsetTop;
            el.style.cursor = 'grabbing';
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            el.style.left = `${initialLeft + dx}px`;
            el.style.top = `${initialTop + dy}px`;
            el.style.bottom = 'auto';
            el.style.right = 'auto';
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
            el.style.cursor = 'grab';
        });
    }
};