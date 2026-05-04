import { SVG_POLYGON, SVG_POLYLINE } from './constants-public';
import { applyTransform } from './transforms';
import {
    SVGCircleProperties,
    SVGEllipseProperties,
    SVGLineProperties,
    SVGPathProperties,
    SVGPolygonProperties,
    SVGPolylineProperties,
    SVGRectProperties,
    FlatSVGTransform,
} from './types-public';
import { MutablePoint, PathParser, PointsConversionResult } from './types-private';
import svgpath from 'svgpath';
import { isNonNegativeNumber, isNumber, isString } from '@amandaghassaei/type-checks';

// Convert SVG geometry to absolute-coordinate path strings (L, H, V, B, C only).

const temp = [0, 0] as MutablePoint;

/**
 * Convert an SVG `<line>` to a path d-string. Missing x1/y1/x2/y2 default to 0;
 * non-numeric values push a warning and return undefined.
 * @param properties Source `<line>` attributes.
 * @param parsingWarnings Mutable array — populated when input is invalid.
 * @param transform Optional matrix baked into the emitted coordinates.
 * @returns Path d-string, or undefined on invalid input.
 */
export function convertLineToPath(
    properties: SVGLineProperties,
    parsingWarnings: string[],
    transform?: FlatSVGTransform
) {
    let { x1, x2, y1, y2 } = properties;
    // x1, x2, y1, y2 default to 0.
    if (x1 === undefined) x1 = 0;
    if (x2 === undefined) x2 = 0;
    if (y1 === undefined) y1 = 0;
    if (y2 === undefined) y2 = 0;
    if (!isNumber(x1) || !isNumber(x2) || !isNumber(y1) || !isNumber(y2)) {
        parsingWarnings.push(`Invalid <line> properties: ${JSON.stringify({ x1, y1, x2, y2 })}.`);
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

/**
 * Convert an SVG `<rect>` to a path d-string with four explicit edges + Z.
 * Pushes a warning and returns undefined on invalid x/y/width/height.
 * @param properties Source `<rect>` attributes.
 * @param parsingWarnings Mutable array — populated when input is invalid.
 * @param transform Optional matrix baked into the emitted coordinates.
 * @returns Path d-string, or undefined on invalid input.
 */
export function convertRectToPath(
    properties: SVGRectProperties,
    parsingWarnings: string[],
    transform?: FlatSVGTransform
) {
    let { x, y } = properties;
    // x and y default to 0.
    if (x === undefined) x = 0;
    if (y === undefined) y = 0;
    const { width, height } = properties;
    if (
        !isNumber(x) ||
        !isNumber(y) ||
        !isNonNegativeNumber(width) ||
        !isNonNegativeNumber(height)
    ) {
        parsingWarnings.push(
            `Invalid <rect> properties: ${JSON.stringify({ x, y, width, height })}.`
        );
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
    // 4 explicit L edges + redundant Z (dropped by Z-to-self heuristic) → uniform
    // "4 edges = 4 segments" for every rect, even degenerate ones. Matches how
    // Illustrator/Inkscape serialize <rect>.
    return `M${x1},${y1} L${x2},${y2} L${x3},${y3} L${x4},${y4} L${x1},${y1} Z`;
}

/**
 * Convert an SVG `<circle>` to a svgpath PathParser. Encoded as two arcs
 * (or a degenerate there-and-back line when r=0); arcs are flattened to
 * cubic beziers unless `_preserveArcs` is true.
 * @param properties Source `<circle>` attributes.
 * @param parsingWarnings Mutable array — populated when input is invalid.
 * @param _preserveArcs Keep `A` commands; otherwise approximate with cubics.
 * @param transform Optional matrix baked into the emitted coordinates.
 * @returns svgpath PathParser, or undefined on invalid input.
 */
export function convertCircleToPath(
    properties: SVGCircleProperties,
    parsingWarnings: string[],
    _preserveArcs: boolean,
    transform?: FlatSVGTransform
) {
    let { cx, cy, r } = properties;
    // cx, cy, r default to 0.
    if (cx === undefined) cx = 0;
    if (cy === undefined) cy = 0;
    if (r === undefined) r = 0;
    if (!isNumber(cx) || !isNumber(cy) || !isNonNegativeNumber(r)) {
        parsingWarnings.push(`Invalid <circle> properties: ${JSON.stringify({ cx, cy, r })}.`);
        return;
    }
    const pathParser = _convertEllipseToPath(cx, cy, r, r, _preserveArcs, transform);
    /* c8 ignore start -- defensive: _convertEllipseToPath always returns a valid svgpath (it constructs the
       d-string from validated numeric inputs and never produces a parse error). The err check is here
       to catch a future change in _convertEllipseToPath's contract. */
    if (pathParser.err) {
        parsingWarnings.push(
            `Problem parsing <circle> ${JSON.stringify({ cx, cy, r })} with ${pathParser.err}.`
        );
        return;
    }
    /* c8 ignore stop */
    return pathParser;
}

/**
 * Convert an SVG `<ellipse>` to a svgpath PathParser. Same encoding as
 * convertCircleToPath but with separate rx / ry radii.
 * @param properties Source `<ellipse>` attributes.
 * @param parsingWarnings Mutable array — populated when input is invalid.
 * @param _preserveArcs Keep `A` commands; otherwise approximate with cubics.
 * @param transform Optional matrix baked into the emitted coordinates.
 * @returns svgpath PathParser, or undefined on invalid input.
 */
export function convertEllipseToPath(
    properties: SVGEllipseProperties,
    parsingWarnings: string[],
    _preserveArcs: boolean,
    transform?: FlatSVGTransform
) {
    let { cx, cy, rx, ry } = properties;
    // cx, cy, rx, ry default to 0.
    if (cx === undefined) cx = 0;
    if (cy === undefined) cy = 0;
    if (rx === undefined) rx = 0;
    if (ry === undefined) ry = 0;
    if (!isNumber(cx) || !isNumber(cy) || !isNonNegativeNumber(rx) || !isNonNegativeNumber(ry)) {
        parsingWarnings.push(`Invalid <ellipse> properties: ${JSON.stringify({ cx, cy, rx, ry })}.`);
        return;
    }
    const pathParser = _convertEllipseToPath(cx, cy, rx, ry, _preserveArcs, transform);
    /* c8 ignore start -- defensive: same rationale as convertCircleToPath above — _convertEllipseToPath
       always returns a valid svgpath from validated numeric inputs. */
    if (pathParser.err) {
        parsingWarnings.push(
            `Problem parsing <ellipse> ${JSON.stringify({ cx, cy, rx, ry })} with ${
                pathParser.err
            }.`
        );
        return;
    }
    /* c8 ignore stop */
    return pathParser;
}

// Reference: https://stackoverflow.com/questions/59011294/ellipse-to-path-convertion-using-javascript
function _convertEllipseToPath(
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    _preserveArcs: boolean,
    transform?: FlatSVGTransform
) {
    // Degenerate ellipses (rx=0 || ry=0): emit as a there-and-back line so
    // every degenerate case yields exactly 2 segments uniformly. Diverges
    // from browser rendering, which treats rx=0 || ry=0 as no-render.
    let d: string;
    if (rx === 0 || ry === 0) {
        d = `M${cx - rx},${cy - ry} L${cx + rx},${cy + ry} L${cx - rx},${cy - ry} Z`;
    } else {
        // Normal ellipse: encode as 2 arcs.
        d = `M${cx - rx},${cy} a${rx},${ry} 0 1,0 ${rx * 2},0 a ${rx},${ry} 0 1,0 -${rx * 2},0`;
    }
    let pathParser = svgpath(d).abs() as any as PathParser;
    if (!_preserveArcs) pathParser = pathParser.unarc();
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
}

/**
 * Convert an SVG `<polygon>` to a path d-string with explicit L-back-to-start
 * + Z. A single-point points list returns `{ strayPoint }` instead of a path.
 * @param properties Source `<polygon>` attributes.
 * @param parsingWarnings Mutable array — populated when input is invalid.
 * @param transform Optional matrix baked into the emitted coordinates.
 * @returns Path d-string, stray-point object, or undefined on invalid input.
 */
export function convertPolygonToPath(
    properties: SVGPolygonProperties,
    parsingWarnings: string[],
    transform?: FlatSVGTransform
): PointsConversionResult {
    const { points } = properties;
    if (!isString(points)) {
        parsingWarnings.push(`Invalid <polygon> properties: ${JSON.stringify({ points })}.`);
        return undefined;
    }
    return _convertPointsToPath(points, parsingWarnings, SVG_POLYGON, transform);
}

/**
 * Convert an SVG `<polyline>` to a path d-string. Same as convertPolygonToPath
 * but without the closing edge + Z.
 * @param properties Source `<polyline>` attributes.
 * @param parsingWarnings Mutable array — populated when input is invalid.
 * @param transform Optional matrix baked into the emitted coordinates.
 * @returns Path d-string, stray-point object, or undefined on invalid input.
 */
export function convertPolylineToPath(
    properties: SVGPolylineProperties,
    parsingWarnings: string[],
    transform?: FlatSVGTransform
): PointsConversionResult {
    const { points } = properties;
    if (!isString(points)) {
        parsingWarnings.push(`Invalid <polyline> properties: ${JSON.stringify({ points })}.`);
        return undefined;
    }
    return _convertPointsToPath(points, parsingWarnings, SVG_POLYLINE, transform);
}

/**
 * Tokenize a points attribute into (x, y) pairs. Per SVG spec, coordinates may
 * be separated by any combination of commas and whitespace. Returns undefined
 * if any token isn't a valid number, or if there aren't at least 2 valid tokens.
 * Trailing odd tokens are truncated (browser-compatible) — diverges from strict
 * spec but matches what real-world SVG renderers do.
 */
function _parsePointPairs(pointsString: string): [number, number][] | undefined {
    const tokens = pointsString.trim().split(/[\s,]+/).filter((s) => s !== '');
    const pairCount = Math.floor(tokens.length / 2);
    if (pairCount === 0) return undefined;
    const pairs: [number, number][] = [];
    for (let i = 0; i < pairCount; i++) {
        const x = parseFloat(tokens[2 * i]);
        const y = parseFloat(tokens[2 * i + 1]);
        if (isNaN(x) || isNaN(y)) return undefined;
        pairs.push([x, y]);
    }
    return pairs;
}

function _convertPointsToPath(
    pointsString: string,
    parsingWarnings: string[],
    elementType: typeof SVG_POLYGON | typeof SVG_POLYLINE,
    transform?: FlatSVGTransform,
): PointsConversionResult {
    const pairs = _parsePointPairs(pointsString);
    if (!pairs) {
        parsingWarnings.push(
            `Unable to parse points string: "${pointsString}" in <${elementType}>.`
        );
        return undefined;
    }
    if (pairs.length === 1) {
        // Single-point polygon/polyline produces no edges — surface as a stray
        // vertex so the caller can flag it diagnostically rather than emit a
        // zero-length path. Caller applies any transform (kept here in source
        // coords, parallel to how other stray-vertex sites work).
        return { strayPoint: pairs[0] };
    }
    let d = '';
    let firstX = 0;
    let firstY = 0;
    for (let i = 0; i < pairs.length; i++) {
        let x = pairs[i][0];
        let y = pairs[i][1];
        if (transform) {
            temp[0] = x;
            temp[1] = y;
            [x, y] = applyTransform(temp, transform);
        }
        if (i === 0) {
            firstX = x;
            firstY = y;
            d = `M${x},${y}`;
        } else {
            d += ` L${x},${y}`;
        }
    }
    if (elementType === SVG_POLYGON) {
        // Explicit L back to the first point so N points → N edges (rather
        // than N-1 + an implicit Z-closure). Trailing Z is dropped as
        // close-to-self by FlatSVG's z-to-self heuristic.
        d += ` L${firstX},${firstY} Z`;
    }
    return d;
}

/**
 * Normalize an SVG `<path>` d-string: absolute coordinates (.abs()), short
 * forms expanded to full Q/C (.unshort()), and arcs flattened to cubics
 * (.unarc()) unless `_preserveArcs` is true.
 * @param properties Source `<path>` attributes.
 * @param parsingWarnings Mutable array — populated when input is invalid.
 * @param _preserveArcs Keep `A` commands; otherwise approximate with cubics.
 * @param transform Optional matrix baked into the emitted coordinates.
 * @returns svgpath PathParser, or undefined on invalid input.
 */
export function convertPathToPath(
    properties: SVGPathProperties,
    parsingWarnings: string[],
    _preserveArcs: boolean,
    transform?: FlatSVGTransform
) {
    const { d } = properties;
    if (!isString(d)) {
        parsingWarnings.push(`Invalid <path> properties: ${JSON.stringify({ d })}.`);
        return;
    }
    // .abs() → absolute coords; .unshort() → expand T/S to Q/C.
    let pathParser = svgpath(d).abs().unshort() as any as PathParser;
    if (!_preserveArcs) pathParser = pathParser.unarc();
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
        parsingWarnings.push(
            `Problem parsing <path> ${JSON.stringify({ d })} with ${pathParser.err}.`
        );
        return;
    }
    return pathParser;
}
