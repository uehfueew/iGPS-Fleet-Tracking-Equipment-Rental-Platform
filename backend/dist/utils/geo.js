"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isPointInPolygon = void 0;
// Ray-casting algorithm for point in polygon
// polygon is an array of [lat, lng]
const isPointInPolygon = (point, polygon) => {
    let isInside = false;
    const [lat, lng] = point;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const [yi, xi] = polygon[i];
        const [yj, xj] = polygon[j];
        const intersect = ((yi > lat) !== (yj > lat)) && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
        if (intersect)
            isInside = !isInside;
    }
    return isInside;
};
exports.isPointInPolygon = isPointInPolygon;
