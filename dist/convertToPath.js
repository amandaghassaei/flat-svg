import { POLYGON, POLYLINE } from './constants';
import { applyTransform } from './transforms';
import { removeWhitespacePadding } from './utils';
import svgpath from 'svgpath';
import { isNonNegativeNumber, isNumber, isString } from '@amandaghassaei/type-checks';
/*
Export any geometry object as path in Abs coordinates with only L, H, V, B, and C types.
*/
const temp = [0, 0];
export function convertLineToPath(properties, parsingErrors, transform) {
    let { x1, x2, y1, y2 } = properties;
    // x1, x2, y1, y2 default to 0.
    /* c8 ignore next if */
    if (x1 === undefined)
        x1 = 0;
    if (x2 === undefined)
        x2 = 0;
    if (y1 === undefined)
        y1 = 0;
    if (y2 === undefined)
        y2 = 0;
    if (!isNumber(x1) || !isNumber(x2) || !isNumber(y1) || !isNumber(y2)) {
        parsingErrors.push(`Invalid <line> properties: ${JSON.stringify({ x1, y1, x2, y2 })}.`);
        return;
    }
    if (transform) {
        temp[0] = x1;
        temp[1] = y1;
        [x1, y1] = applyTransform(temp, transform);
        temp[0] = x2;
        temp[1] = y2;
        [x2, y2] = applyTransform(temp, transform);
    }
    return `M${x1},${y1} L${x2},${y2}`;
}
export function convertRectToPath(properties, parsingErrors, transform) {
    let { x, y } = properties;
    // x and y default to 0.
    if (x === undefined)
        x = 0;
    if (y === undefined)
        y = 0;
    const { width, height } = properties;
    if (!isNumber(x) ||
        !isNumber(y) ||
        !isNonNegativeNumber(width) ||
        !isNonNegativeNumber(height)) {
        parsingErrors.push(`Invalid <rect> properties: ${JSON.stringify({ x, y, width, height })}.`);
        return;
    }
    let x1 = x;
    let y1 = y;
    let x2 = x + width;
    let y2 = y;
    let x3 = x + width;
    let y3 = y + height;
    let x4 = x;
    let y4 = y + height;
    if (transform) {
        temp[0] = x1;
        temp[1] = y1;
        [x1, y1] = applyTransform(temp, transform);
        temp[0] = x2;
        temp[1] = y2;
        [x2, y2] = applyTransform(temp, transform);
        temp[0] = x3;
        temp[1] = y3;
        [x3, y3] = applyTransform(temp, transform);
        temp[0] = x4;
        temp[1] = y4;
        [x4, y4] = applyTransform(temp, transform);
    }
    return `M${x1},${y1} L${x2},${y2} L${x3},${y3} L${x4},${y4} z`;
}
export function convertCircleToPath(properties, parsingErrors, _preserveArcs, transform) {
    let { cx, cy, r } = properties;
    // cx, cy, r default to 0.
    if (cx === undefined)
        cx = 0;
    /* c8 ignore next if */
    if (cy === undefined)
        cy = 0;
    if (r === undefined)
        r = 0;
    if (!isNumber(cx) || !isNumber(cy) || !isNonNegativeNumber(r)) {
        parsingErrors.push(`Invalid <circle> properties: ${JSON.stringify({ cx, cy, r })}.`);
        return;
    }
    const pathParser = _convertEllipseToPath(cx, cy, r, r, _preserveArcs, transform);
    /* c8 ignore next 7 */
    if (pathParser.err) {
        // Should not hit this.
        parsingErrors.push(`Problem parsing <circle> ${JSON.stringify({ cx, cy, r })} with ${pathParser.err}.`);
        return;
    }
    return pathParser;
}
export function convertEllipseToPath(properties, parsingErrors, _preserveArcs, transform) {
    let { cx, cy, rx, ry } = properties;
    // cx, cy, rx, ry default to 0.
    /* c8 ignore next if */
    if (cx === undefined)
        cx = 0;
    if (cy === undefined)
        cy = 0;
    if (rx === undefined)
        rx = 0;
    if (ry === undefined)
        ry = 0;
    if (!isNumber(cx) || !isNumber(cy) || !isNonNegativeNumber(rx) || !isNonNegativeNumber(ry)) {
        parsingErrors.push(`Invalid <ellipse> properties: ${JSON.stringify({ cx, cy, rx, ry })}.`);
        return;
    }
    const pathParser = _convertEllipseToPath(cx, cy, rx, ry, _preserveArcs, transform);
    /* c8 ignore next 9 */
    if (pathParser.err) {
        // Should not hit this.
        parsingErrors.push(`Problem parsing <ellipse> ${JSON.stringify({ cx, cy, rx, ry })} with ${pathParser.err}.`);
        return;
    }
    return pathParser;
}
// https://stackoverflow.com/questions/59011294/ellipse-to-path-convertion-using-javascript
// const ellipsePoints = new Array(24).fill(0);
function _convertEllipseToPath(cx, cy, rx, ry, _preserveArcs, transform) {
    // Convert ellipse to 2 arcs.
    const d = `M${cx - rx},${cy} a${rx},${ry} 0 1,0 ${rx * 2},0 a ${rx},${ry} 0 1,0 -${rx * 2},0`;
    let pathParser = svgpath(d).abs();
    // Convert arcs to bezier is _preserveArcs == false.
    if (!_preserveArcs)
        pathParser = pathParser.unarc();
    // Apply transform.
    if (transform)
        pathParser = pathParser.matrix([
            transform.a,
            transform.b,
            transform.c,
            transform.d,
            transform.e,
            transform.f,
        ]);
    return pathParser;
    // 	const kappa = 0.5522847498;
    // 	const ox = rx * kappa; // x offset for the control point
    // 	const oy = ry * kappa; // y offset for the control point
    // 	ellipsePoints[0] = cx - rx;
    // 	ellipsePoints[1] = cy;
    // 	ellipsePoints[2] = cx - rx;
    // 	ellipsePoints[3] = cy - oy;
    // 	ellipsePoints[4] = cx - ox;
    // 	ellipsePoints[5] = cy - ry;
    // 	ellipsePoints[6] = cx;
    // 	ellipsePoints[7] = cy - ry;
    // 	ellipsePoints[8] = cx + ox;
    // 	ellipsePoints[9] = cy - ry;
    // 	ellipsePoints[10] = cx + rx;
    // 	ellipsePoints[11] = cy - oy;
    // 	ellipsePoints[12] = cx + rx;
    // 	ellipsePoints[13] = cy;
    // 	ellipsePoints[14] = cx + rx;
    // 	ellipsePoints[15] = cy + oy;
    // 	ellipsePoints[16] = cx + ox;
    // 	ellipsePoints[17] = cy + ry;
    // 	ellipsePoints[18] = cx;
    // 	ellipsePoints[19] = cy + ry;
    // 	ellipsePoints[20] = cx - ox;
    // 	ellipsePoints[21] = cy + ry;
    // 	ellipsePoints[22] = cx - rx;
    // 	ellipsePoints[23] = cy + oy;
    // 	if (transform) {
    // 		for (let i = 0, length = ellipsePoints.length / 2; i < length; i++) {
    // 			temp[0] = ellipsePoints[2 * i];
    // 			temp[1] = ellipsePoints[2 * i + 1];
    // 			applyTransform(temp, transform);
    // 			ellipsePoints[2 * i] = temp[0];
    // 			ellipsePoints[2 * i + 1] = temp[1];
    // 		}
    // 	}
    // 	return `M${ellipsePoints[0]},${ellipsePoints[1]} \
    // C${ellipsePoints[2]},${ellipsePoints[3]} ${ellipsePoints[4]},${ellipsePoints[5]} ${ellipsePoints[6]},${ellipsePoints[7]} \
    // C${ellipsePoints[8]},${ellipsePoints[9]} ${ellipsePoints[10]},${ellipsePoints[11]} ${ellipsePoints[12]},${ellipsePoints[13]} \
    // C${ellipsePoints[14]},${ellipsePoints[15]} ${ellipsePoints[16]},${ellipsePoints[17]} ${ellipsePoints[18]},${ellipsePoints[19]} \
    // C${ellipsePoints[20]},${ellipsePoints[21]} ${ellipsePoints[22]},${ellipsePoints[23]} ${ellipsePoints[0]},${ellipsePoints[1]} \
    // z`;
}
export function convertPolygonToPath(properties, parsingErrors, transform) {
    const { points } = properties;
    if (!isString(points)) {
        parsingErrors.push(`Invalid <polygon> properties: ${JSON.stringify({ points })}.`);
        return;
    }
    const path = _convertPointsToPath(points, parsingErrors, POLYGON, transform);
    if (!path)
        return path;
    return path + ' z';
}
export function convertPolylineToPath(properties, parsingErrors, transform) {
    const { points } = properties;
    if (!isString(points)) {
        parsingErrors.push(`Invalid <polyline> properties: ${JSON.stringify({ points })}.`);
        return;
    }
    return _convertPointsToPath(points, parsingErrors, POLYLINE, transform);
}
function _convertPointsToPath(pointsString, parsingErrors, elementType, transform) {
    const points = removeWhitespacePadding(pointsString).split(' ');
    let d = '';
    while (points.length) {
        const point = points.shift().split(',');
        if (point.length === 1) {
            // Sometimes polyline is not separated by commas, only by whitespace.
            if (points.length && points.length % 2 === 1) {
                point.push(points.shift()); // Get next element in points array.
            }
        }
        if (point.length !== 2) {
            parsingErrors.push(`Unable to parse points string: "${pointsString}" in <${elementType}>.`);
            return;
        }
        let x = parseFloat(point[0]);
        let y = parseFloat(point[1]);
        if (isNaN(x) || isNaN(y)) {
            parsingErrors.push(`Unable to parse points string: "${pointsString}" in <${elementType}>.`);
            return;
        }
        if (transform) {
            temp[0] = x;
            temp[1] = y;
            [x, y] = applyTransform(temp, transform);
        }
        if (d === '') {
            d += `M${x},${y}`;
        }
        else {
            d += ` L${x},${y}`;
        }
    }
    return d;
}
export function convertPathToPath(properties, parsingErrors, _preserveArcs, transform) {
    const { d } = properties;
    if (!isString(d)) {
        parsingErrors.push(`Invalid <path> properties: ${JSON.stringify({ d })}.`);
        return;
    }
    // Convert to absolute coordinates,
    // Convert smooth curves (T/S) to regular Bezier (Q/C).
    let pathParser = svgpath(d).abs().unshort();
    if (_preserveArcs) {
        // Convert arcs to bezier.
        pathParser = pathParser.unarc();
    }
    // Apply transform.
    if (transform) {
        pathParser = pathParser.matrix([
            transform.a,
            transform.b,
            transform.c,
            transform.d,
            transform.e,
            transform.f,
        ]);
    }
    if (pathParser.err) {
        parsingErrors.push(`Problem parsing <path> ${JSON.stringify({ d })} with ${pathParser.err}.`);
        return;
    }
    return pathParser;
}
//# sourceMappingURL=convertToPath.js.map