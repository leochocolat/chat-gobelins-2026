// Window rects are { x, y, width, height }, layouts map each window id to { x, y, scale }
// Positions are the top left corner, windows scale from it

const OVERVIEW_MARGIN = 60;
const OVERVIEW_GAP = 40;
const DESKTOP_OFFSET = 20;

/**
 * Private
 */
const getCenter = (rect) => ({
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
});

// Rows from top to bottom, each one from left to right, so windows keep their rough placement
const getRows = (ids, rects, columns) => {
    const sortedIds = [...ids].sort((a, b) => getCenter(rects[a]).y - getCenter(rects[b]).y);
    const rows = [];

    for (let i = 0; i < sortedIds.length; i += columns) {
        const row = sortedIds.slice(i, i + columns);
        rows.push(row.sort((a, b) => getCenter(rects[a]).x - getCenter(rects[b]).x));
    }

    return rows;
};

/**
 * Public
 */
// Every window visible at once, scaled down in a grid below the navigation
export const getOverviewLayout = (rects, viewport) => {
    const ids = Object.keys(rects);
    const layout = {};

    if (!ids.length) return layout;

    const area = {
        x: OVERVIEW_MARGIN,
        y: viewport.top + OVERVIEW_MARGIN,
        width: viewport.width - OVERVIEW_MARGIN * 2,
        height: viewport.height - viewport.top - OVERVIEW_MARGIN * 2,
    };

    const columns = Math.min(ids.length, Math.max(1, Math.round(Math.sqrt((ids.length * area.width) / area.height))));
    const rows = getRows(ids, rects, columns);
    const cellWidth = (area.width - OVERVIEW_GAP * (columns - 1)) / columns;
    const cellHeight = (area.height - OVERVIEW_GAP * (rows.length - 1)) / rows.length;

    rows.forEach((row, rowIndex) => {
        // Centers an incomplete last row
        const rowOffset = ((columns - row.length) * (cellWidth + OVERVIEW_GAP)) / 2;

        row.forEach((id, columnIndex) => {
            const { width, height } = rects[id];
            const scale = Math.min(cellWidth / width, cellHeight / height, 1);
            const cellX = area.x + rowOffset + columnIndex * (cellWidth + OVERVIEW_GAP);
            const cellY = area.y + rowIndex * (cellHeight + OVERVIEW_GAP);

            layout[id] = {
                x: cellX + (cellWidth - width * scale) / 2,
                y: cellY + (cellHeight - height * scale) / 2,
                scale,
            };
        });
    });

    return layout;
};

// Every window pushed out of the screen, through the edge closest to its center
export const getDesktopLayout = (rects, viewport) => {
    const layout = {};

    for (const [id, rect] of Object.entries(rects)) {
        const center = getCenter(rect);
        const offsetX = (center.x - viewport.width / 2) / viewport.width;
        const offsetY = (center.y - viewport.height / 2) / viewport.height;
        const target = { x: rect.x, y: rect.y, scale: 1 };

        if (Math.abs(offsetX) > Math.abs(offsetY)) {
            target.x = offsetX < 0 ? -rect.width - DESKTOP_OFFSET : viewport.width + DESKTOP_OFFSET;
        } else {
            target.y = offsetY < 0 ? -rect.height - DESKTOP_OFFSET : viewport.height + DESKTOP_OFFSET;
        }

        layout[id] = target;
    }

    return layout;
};
